import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireProjectMember } from "./lib/auth";

export const create = mutation({
  args: {
    projectId: v.id("project"),
    name: v.string(),
    slug: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    isFinal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);

    const existing = await ctx.db
      .query("column")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    if (existing.some((c) => c.slug === args.slug)) {
      throw new Error("A column with that slug already exists");
    }
    const position =
      existing.length === 0
        ? 0
        : Math.max(...existing.map((c) => c.position)) + 1;

    return await ctx.db.insert("column", {
      projectId: args.projectId,
      name: args.name,
      slug: args.slug,
      position,
      icon: args.icon,
      color: args.color,
      isFinal: args.isFinal ?? false,
    });
  },
});

export const update = mutation({
  args: {
    columnId: v.id("column"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    isFinal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.columnId);
    if (!column) throw new Error("Column not found");
    await requireProjectMember(ctx, column.projectId);

    const { columnId, ...updates } = args;
    await ctx.db.patch(columnId, updates);
  },
});

export const remove = mutation({
  args: { columnId: v.id("column") },
  handler: async (ctx, args) => {
    const column = await ctx.db.get(args.columnId);
    if (!column) throw new Error("Column not found");
    await requireProjectMember(ctx, column.projectId);

    const stillInUse = await ctx.db
      .query("task")
      .withIndex("by_column", (q) => q.eq("columnId", args.columnId))
      .first();
    if (stillInUse) {
      throw new Error(
        "Move or delete every task in this column before deleting it",
      );
    }

    await ctx.db.delete(args.columnId);
  },
});

export const reorder = mutation({
  args: {
    projectId: v.id("project"),
    positions: v.array(
      v.object({ columnId: v.id("column"), position: v.number() }),
    ),
  },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);

    for (const { columnId, position } of args.positions) {
      const column = await ctx.db.get(columnId);
      if (!column || column.projectId !== args.projectId) {
        throw new Error("Column does not belong to this project");
      }
      await ctx.db.patch(columnId, { position });
    }

    return await ctx.db
      .query("column")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const list = query({
  args: { projectId: v.id("project") },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    const columns = await ctx.db
      .query("column")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    return columns.sort((a, b) => a.position - b.position);
  },
});
