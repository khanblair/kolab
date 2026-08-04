import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { requireProjectMember, requireWorkspaceMember } from "./lib/auth";

// Mirrors apps/api/src/project/controllers/create-project.ts's
// DEFAULT_PROJECT_COLUMNS. Convex mutations are transactional by default,
// so this needs no explicit db.transaction() wrapper.
const DEFAULT_PROJECT_COLUMNS = [
  { name: "To Do", slug: "to-do", position: 0, isFinal: false },
  { name: "In Progress", slug: "in-progress", position: 1, isFinal: false },
  { name: "In Review", slug: "in-review", position: 2, isFinal: false },
  { name: "Done", slug: "done", position: 3, isFinal: true },
] as const;

export const create = mutation({
  args: {
    workspaceId: v.id("workspace"),
    name: v.string(),
    icon: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const projectId = await ctx.db.insert("project", {
      workspaceId: args.workspaceId,
      name: args.name,
      icon: args.icon,
      slug: args.slug,
      lastTaskNumber: 0,
    });

    for (const col of DEFAULT_PROJECT_COLUMNS) {
      await ctx.db.insert("column", {
        projectId,
        name: col.name,
        slug: col.slug,
        position: col.position,
        isFinal: col.isFinal,
      });
    }

    return await ctx.db.get(projectId);
  },
});

async function computeStatistics(ctx: QueryCtx, projectId: Id<"project">) {
  const [columns, tasks] = await Promise.all([
    ctx.db
      .query("column")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect(),
    ctx.db
      .query("task")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect(),
  ]);
  const finalColumnIds = new Set(
    columns.filter((c) => c.isFinal).map((c) => c._id),
  );
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (t) => t.columnId && finalColumnIds.has(t.columnId),
  ).length;
  return {
    totalTasks,
    completionPercentage:
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
  };
}

export const get = query({
  args: { projectId: v.id("project") },
  handler: async (ctx, args) => {
    const { project } = await requireProjectMember(ctx, args.projectId);
    return {
      ...project,
      statistics: await computeStatistics(ctx, project._id),
    };
  },
});

export const list = query({
  args: {
    workspaceId: v.id("workspace"),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const projects = await ctx.db
      .query("project")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const visible = args.includeArchived
      ? projects
      : projects.filter((p) => p.archivedAt === undefined);

    return await Promise.all(
      visible.map(async (project) => ({
        ...project,
        statistics: await computeStatistics(ctx, project._id),
      })),
    );
  },
});
