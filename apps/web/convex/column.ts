import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireProjectMember } from "./lib/auth";

// Mirrors apps/api/src/column/controllers/create-column.ts's toSlug() and
// VIRTUAL_STATUSES reservation exactly — column slugs double as task
// status values, so they can't collide with the virtual "planned"/
// "archived" statuses.
const VIRTUAL_STATUSES = ["planned", "archived"] as const;

function toSlug(name: string): string {
  const slug = name
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return /[\p{L}\p{N}]/u.test(slug) ? slug : "";
}

export const create = mutation({
  args: {
    projectId: v.id("project"),
    name: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    isFinal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);

    const slug = toSlug(args.name);
    if (!slug) {
      throw new Error(
        "Column name must contain at least one alphanumeric character",
      );
    }
    if ((VIRTUAL_STATUSES as readonly string[]).includes(slug)) {
      throw new Error(
        `Column slug "${slug}" is reserved for virtual task statuses`,
      );
    }

    const existing = await ctx.db
      .query("column")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    if (existing.some((c) => c.slug === slug)) {
      throw new Error(
        `Column with slug "${slug}" already exists in this project`,
      );
    }
    const position =
      existing.length === 0
        ? 0
        : Math.max(...existing.map((c) => c.position)) + 1;

    return await ctx.db.insert("column", {
      projectId: args.projectId,
      name: args.name,
      slug,
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
