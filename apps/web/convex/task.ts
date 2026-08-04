import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { logActivity } from "./lib/activity";
import { requireProjectMember, requireTaskMember } from "./lib/auth";

const priorityValidator = v.union(
  v.literal("no-priority"),
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("urgent"),
);

// Resolves a status string to the matching column in the project (by slug),
// or undefined for a virtual status ("planned"/"archived"/anything with no
// matching column).
async function resolveColumn(
  ctx: MutationCtx,
  projectId: Id<"project">,
  status: string,
) {
  const columns = await ctx.db
    .query("column")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  return columns.find((c) => c.slug === status);
}

async function nextPositionInColumn(
  ctx: MutationCtx,
  columnId: Id<"column"> | undefined,
) {
  if (!columnId) return 0;
  const last = await ctx.db
    .query("task")
    .withIndex("by_column_and_position", (q) => q.eq("columnId", columnId))
    .order("desc")
    .first();
  return last ? last.position + 1 : 0;
}

async function claimTaskNumber(ctx: MutationCtx, projectId: Id<"project">) {
  const project = await ctx.db.get(projectId);
  if (!project) throw new Error("Project not found");
  const number = project.lastTaskNumber + 1;
  await ctx.db.patch(projectId, { lastTaskNumber: number });
  return number;
}

export const create = mutation({
  args: {
    projectId: v.id("project"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    priority: v.optional(priorityValidator),
    assigneeId: v.optional(v.string()),
    startDate: v.optional(v.number()),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProjectMember(ctx, args.projectId);
    const status = args.status ?? "to-do";
    const column = await resolveColumn(ctx, args.projectId, status);
    const position = await nextPositionInColumn(ctx, column?._id);
    const number = await claimTaskNumber(ctx, args.projectId);
    const now = Date.now();

    const taskId = await ctx.db.insert("task", {
      projectId: args.projectId,
      columnId: column?._id,
      position,
      number,
      assigneeId: args.assigneeId,
      title: args.title,
      description: args.description,
      status,
      priority: args.priority ?? "no-priority",
      startDate: args.startDate,
      dueDate: args.dueDate,
      createdAt: now,
      updatedAt: now,
    });

    await logActivity(ctx, {
      taskId,
      type: "created",
      userId,
      eventData: {},
    });

    return await ctx.db.get(taskId);
  },
});

export const updateStatus = mutation({
  args: { taskId: v.id("task"), status: v.string() },
  handler: async (ctx, args) => {
    const { userId, task } = await requireTaskMember(ctx, args.taskId);
    const oldStatus = task.status;
    const column = await resolveColumn(ctx, task.projectId, args.status);
    await ctx.db.patch(args.taskId, {
      status: args.status,
      columnId: column?._id,
      updatedAt: Date.now(),
    });
    await logActivity(ctx, {
      taskId: args.taskId,
      type: "status_changed",
      userId,
      eventData: { oldStatus, newStatus: args.status },
    });
  },
});

export const updateAssignee = mutation({
  args: { taskId: v.id("task"), assigneeId: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const { userId, task } = await requireTaskMember(ctx, args.taskId);
    if ((task.assigneeId ?? null) === args.assigneeId) return;
    await ctx.db.patch(args.taskId, {
      assigneeId: args.assigneeId ?? undefined,
      updatedAt: Date.now(),
    });
    await logActivity(ctx, {
      taskId: args.taskId,
      type: args.assigneeId ? "assignee_changed" : "unassigned",
      userId,
      eventData: args.assigneeId ? { newAssigneeId: args.assigneeId } : {},
    });
  },
});

export const updatePriority = mutation({
  args: { taskId: v.id("task"), priority: priorityValidator },
  handler: async (ctx, args) => {
    const { userId, task } = await requireTaskMember(ctx, args.taskId);
    const oldPriority = task.priority;
    await ctx.db.patch(args.taskId, {
      priority: args.priority,
      updatedAt: Date.now(),
    });
    await logActivity(ctx, {
      taskId: args.taskId,
      type: "priority_changed",
      userId,
      eventData: { oldPriority, newPriority: args.priority },
    });
  },
});

export const updateDueDate = mutation({
  args: { taskId: v.id("task"), dueDate: v.union(v.number(), v.null()) },
  handler: async (ctx, args) => {
    const { userId, task } = await requireTaskMember(ctx, args.taskId);
    const oldDueDate = task.dueDate ?? null;
    await ctx.db.patch(args.taskId, {
      dueDate: args.dueDate ?? undefined,
      updatedAt: Date.now(),
    });
    await logActivity(ctx, {
      taskId: args.taskId,
      type: "due_date_changed",
      userId,
      eventData: { oldDueDate, newDueDate: args.dueDate },
    });
  },
});

export const updateTitle = mutation({
  args: { taskId: v.id("task"), title: v.string() },
  handler: async (ctx, args) => {
    const { userId, task } = await requireTaskMember(ctx, args.taskId);
    const oldTitle = task.title;
    await ctx.db.patch(args.taskId, {
      title: args.title,
      updatedAt: Date.now(),
    });
    await logActivity(ctx, {
      taskId: args.taskId,
      type: "title_changed",
      userId,
      eventData: { oldTitle, newTitle: args.title },
    });
  },
});

// No activity row — matches the original app's behavior.
export const updateDescription = mutation({
  args: { taskId: v.id("task"), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireTaskMember(ctx, args.taskId);
    await ctx.db.patch(args.taskId, {
      description: args.description,
      updatedAt: Date.now(),
    });
  },
});

export const move = mutation({
  args: { taskId: v.id("task"), destinationProjectId: v.id("project") },
  handler: async (ctx, args) => {
    const { userId, task } = await requireTaskMember(ctx, args.taskId);
    if (task.projectId === args.destinationProjectId) {
      throw new Error("Task is already in that project");
    }
    await requireProjectMember(ctx, args.destinationProjectId);

    const oldStatus = task.status;
    const fromProjectId = task.projectId;
    const column = await resolveColumn(
      ctx,
      args.destinationProjectId,
      task.status,
    );
    const fallbackColumn =
      column ??
      (
        await ctx.db
          .query("column")
          .withIndex("by_project", (q) =>
            q.eq("projectId", args.destinationProjectId),
          )
          .collect()
      ).sort((a, b) => a.position - b.position)[0];

    const position = await nextPositionInColumn(ctx, fallbackColumn?._id);
    const number = await claimTaskNumber(ctx, args.destinationProjectId);
    const newStatus = fallbackColumn?.slug ?? task.status;

    await ctx.db.patch(args.taskId, {
      projectId: args.destinationProjectId,
      columnId: fallbackColumn?._id,
      status: newStatus,
      number,
      position,
      updatedAt: Date.now(),
    });

    await logActivity(ctx, {
      taskId: args.taskId,
      type: "moved",
      userId,
      eventData: {
        fromProjectId,
        toProjectId: args.destinationProjectId,
        oldStatus,
        newStatus,
      },
    });

    return await ctx.db.get(args.taskId);
  },
});

export const deleteTask = mutation({
  args: { taskId: v.id("task") },
  handler: async (ctx, args) => {
    await requireTaskMember(ctx, args.taskId);

    const [
      relationsAsSource,
      relationsAsTarget,
      comments,
      timeEntries,
      activities,
      externalLinks,
    ] = await Promise.all([
      ctx.db
        .query("taskRelation")
        .withIndex("by_source", (q) => q.eq("sourceTaskId", args.taskId))
        .collect(),
      ctx.db
        .query("taskRelation")
        .withIndex("by_target", (q) => q.eq("targetTaskId", args.taskId))
        .collect(),
      ctx.db
        .query("comment")
        .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
        .collect(),
      ctx.db
        .query("timeEntry")
        .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
        .collect(),
      ctx.db
        .query("activity")
        .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
        .collect(),
      ctx.db
        .query("externalLink")
        .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
        .collect(),
    ]);

    for (const row of [
      ...relationsAsSource,
      ...relationsAsTarget,
      ...comments,
      ...timeEntries,
      ...activities,
      ...externalLinks,
    ]) {
      await ctx.db.delete(row._id);
    }

    await ctx.db.delete(args.taskId);
  },
});

export const get = query({
  args: { taskId: v.id("task") },
  handler: async (ctx, args) => {
    const { task } = await requireTaskMember(ctx, args.taskId);
    return task;
  },
});

export const list = query({
  args: {
    projectId: v.id("project"),
    status: v.optional(v.string()),
    priority: v.optional(priorityValidator),
    assigneeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    let tasks = await ctx.db
      .query("task")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    if (args.status) tasks = tasks.filter((t) => t.status === args.status);
    if (args.priority)
      tasks = tasks.filter((t) => t.priority === args.priority);
    if (args.assigneeId)
      tasks = tasks.filter((t) => t.assigneeId === args.assigneeId);

    return tasks;
  },
});
