import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireProjectMember } from "./lib/auth";

export const list = query({
  args: { projectId: v.id("project") },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    return await ctx.db
      .query("workflowRule")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    projectId: v.id("project"),
    integrationType: v.string(),
    eventType: v.string(),
    columnId: v.id("column"),
  },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);

    const column = await ctx.db.get(args.columnId);
    if (!column || column.projectId !== args.projectId) {
      throw new Error("Column does not belong to the provided project");
    }

    const existing = await ctx.db
      .query("workflowRule")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) =>
        q.and(
          q.eq(q.field("integrationType"), args.integrationType),
          q.eq(q.field("eventType"), args.eventType),
        ),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { columnId: args.columnId });
      return await ctx.db.get(existing._id);
    }

    const ruleId = await ctx.db.insert("workflowRule", {
      projectId: args.projectId,
      integrationType: args.integrationType,
      eventType: args.eventType,
      columnId: args.columnId,
    });
    return await ctx.db.get(ruleId);
  },
});
