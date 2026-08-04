import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Mirrors apps/api/src/project/controllers/create-project.ts's
// DEFAULT_PROJECT_COLUMNS. Convex mutations are transactional by default,
// so this needs no explicit db.transaction() wrapper.
const DEFAULT_PROJECT_COLUMNS = [
  { name: "To Do", slug: "to-do", position: 0, isFinal: false },
  { name: "In Progress", slug: "in-progress", position: 1, isFinal: false },
  { name: "In Review", slug: "in-review", position: 2, isFinal: false },
  { name: "Done", slug: "done", position: 3, isFinal: true },
] as const;

// NOTE: no auth check yet — this slice is proving the CRUD/schema pattern
// before Supabase Auth is wired in. workspaceId is a trusted argument for
// now, not derived from a verified session.
export const create = mutation({
  args: {
    workspaceId: v.id("workspace"),
    name: v.string(),
    icon: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
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

// NOTE: statistics (completion %, due date) from
// apps/api/src/project/controllers/get-projects.ts are dropped for this
// slice — they read from the task table, which isn't modeled yet.
export const list = query({
  args: {
    workspaceId: v.id("workspace"),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("project")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();

    return args.includeArchived
      ? projects
      : projects.filter((p) => p.archivedAt === undefined);
  },
});
