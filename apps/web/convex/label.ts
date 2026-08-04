import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { requireTaskMember, requireWorkspaceMember } from "./lib/auth";

async function findTaskLabel(
  ctx: MutationCtx,
  taskId: Id<"task">,
  name: string,
) {
  const labels = await ctx.db
    .query("label")
    .withIndex("by_task", (q) => q.eq("taskId", taskId))
    .collect();
  return labels.find((l) => l.name === name);
}

async function findWorkspaceLabel(
  ctx: MutationCtx,
  workspaceId: Id<"workspace">,
  name: string,
) {
  const labels = await ctx.db
    .query("label")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  return labels.find((l) => l.taskId === undefined && l.name === name);
}

// Shared with task.bulkUpdate's "addLabel" operation: copies a label's
// name/color onto a task as its own task-scoped row, idempotently — mirrors
// label.create's task branch without requiring a full create() call.
export async function ensureTaskLabelCopy(
  ctx: MutationCtx,
  taskId: Id<"task">,
  workspaceId: Id<"workspace">,
  name: string,
  color: string,
) {
  const existing = await findTaskLabel(ctx, taskId, name);
  if (existing) return existing._id;
  const now = Date.now();
  return await ctx.db.insert("label", {
    name,
    color,
    taskId,
    workspaceId,
    createdAt: now,
    updatedAt: now,
  });
}

export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    taskId: v.optional(v.id("task")),
    workspaceId: v.optional(v.id("workspace")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    if (args.taskId) {
      const { task } = await requireTaskMember(ctx, args.taskId);
      const project = await ctx.db.get(task.projectId);
      if (!project) throw new Error("Project not found");
      const existing = await findTaskLabel(ctx, args.taskId, args.name);
      if (existing) return existing;
      const labelId = await ctx.db.insert("label", {
        name: args.name,
        color: args.color,
        taskId: args.taskId,
        workspaceId: project.workspaceId,
        createdAt: now,
        updatedAt: now,
      });
      return await ctx.db.get(labelId);
    }

    if (!args.workspaceId) {
      throw new Error("Either taskId or workspaceId is required");
    }
    await requireWorkspaceMember(ctx, args.workspaceId);
    const existing = await findWorkspaceLabel(ctx, args.workspaceId, args.name);
    if (existing) return existing;
    const labelId = await ctx.db.insert("label", {
      name: args.name,
      color: args.color,
      workspaceId: args.workspaceId,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(labelId);
  },
});

async function requireLabelAccess(ctx: MutationCtx, labelId: Id<"label">) {
  const label = await ctx.db.get(labelId);
  if (!label) throw new Error("Label not found");
  if (!label.workspaceId) throw new Error("Label has no workspace");
  await requireWorkspaceMember(ctx, label.workspaceId);
  return label;
}

export const update = mutation({
  args: {
    labelId: v.id("label"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const label = await requireLabelAccess(ctx, args.labelId);
    const now = Date.now();

    await ctx.db.patch(args.labelId, {
      name: args.name ?? label.name,
      color: args.color ?? label.color,
      updatedAt: now,
    });

    // Workspace-level label: cascade the new name/color to every task-level
    // copy sharing the old (workspaceId, name).
    if (label.taskId === undefined && label.workspaceId) {
      const copies = await ctx.db
        .query("label")
        .withIndex("by_workspace", (q) =>
          q.eq("workspaceId", label.workspaceId),
        )
        .collect();
      for (const copy of copies) {
        if (copy.taskId !== undefined && copy.name === label.name) {
          await ctx.db.patch(copy._id, {
            name: args.name ?? copy.name,
            color: args.color ?? copy.color,
            updatedAt: now,
          });
        }
      }
    }
  },
});

export const remove = mutation({
  args: { labelId: v.id("label") },
  handler: async (ctx, args) => {
    const label = await requireLabelAccess(ctx, args.labelId);

    if (label.taskId === undefined && label.workspaceId) {
      const copies = await ctx.db
        .query("label")
        .withIndex("by_workspace", (q) =>
          q.eq("workspaceId", label.workspaceId),
        )
        .collect();
      for (const copy of copies) {
        if (copy.taskId !== undefined && copy.name === label.name) {
          await ctx.db.delete(copy._id);
        }
      }
    }

    await ctx.db.delete(args.labelId);
  },
});

export const assignToTask = mutation({
  args: { labelId: v.id("label"), taskId: v.id("task") },
  handler: async (ctx, args) => {
    const label = await requireLabelAccess(ctx, args.labelId);
    const { task } = await requireTaskMember(ctx, args.taskId);
    const project = await ctx.db.get(task.projectId);
    if (!project || project.workspaceId !== label.workspaceId) {
      throw new Error("Label and task belong to different workspaces");
    }
    await ctx.db.patch(args.labelId, {
      taskId: args.taskId,
      updatedAt: Date.now(),
    });
  },
});

export const unassignFromTask = mutation({
  args: { labelId: v.id("label") },
  handler: async (ctx, args) => {
    const label = await requireLabelAccess(ctx, args.labelId);
    if (label.taskId === undefined) {
      throw new Error("Label is not assigned to a task");
    }
    await ctx.db.patch(args.labelId, {
      taskId: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const listByTask = query({
  args: { taskId: v.id("task") },
  handler: async (ctx, args) => {
    await requireTaskMember(ctx, args.taskId);
    return await ctx.db
      .query("label")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
  },
});

export const listByWorkspace = query({
  args: { workspaceId: v.id("workspace") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const labels = await ctx.db
      .query("label")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
    return labels.filter((l) => l.taskId === undefined);
  },
});
