import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireTaskMember } from "./lib/auth";

export const create = mutation({
  args: {
    sourceTaskId: v.id("task"),
    targetTaskId: v.id("task"),
    relationType: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.sourceTaskId === args.targetTaskId) {
      throw new Error("A task cannot relate to itself");
    }
    await requireTaskMember(ctx, args.sourceTaskId);
    await requireTaskMember(ctx, args.targetTaskId);

    const fromSource = await ctx.db
      .query("taskRelation")
      .withIndex("by_source", (q) => q.eq("sourceTaskId", args.sourceTaskId))
      .collect();
    const fromTarget = await ctx.db
      .query("taskRelation")
      .withIndex("by_source", (q) => q.eq("sourceTaskId", args.targetTaskId))
      .collect();

    const duplicate =
      fromSource.some(
        (r) =>
          r.targetTaskId === args.targetTaskId &&
          r.relationType === args.relationType,
      ) ||
      fromTarget.some(
        (r) =>
          r.targetTaskId === args.sourceTaskId &&
          r.relationType === args.relationType,
      );
    if (duplicate) {
      throw new Error("This relation already exists");
    }

    return await ctx.db.insert("taskRelation", {
      sourceTaskId: args.sourceTaskId,
      targetTaskId: args.targetTaskId,
      relationType: args.relationType,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { relationId: v.id("taskRelation") },
  handler: async (ctx, args) => {
    const relation = await ctx.db.get(args.relationId);
    if (!relation) throw new Error("Relation not found");
    await requireTaskMember(ctx, relation.sourceTaskId);
    await ctx.db.delete(args.relationId);
  },
});

export const list = query({
  args: { taskId: v.id("task") },
  handler: async (ctx, args) => {
    await requireTaskMember(ctx, args.taskId);

    const [asSource, asTarget] = await Promise.all([
      ctx.db
        .query("taskRelation")
        .withIndex("by_source", (q) => q.eq("sourceTaskId", args.taskId))
        .collect(),
      ctx.db
        .query("taskRelation")
        .withIndex("by_target", (q) => q.eq("targetTaskId", args.taskId))
        .collect(),
    ]);

    const relations = [...asSource, ...asTarget];
    return await Promise.all(
      relations.map(async (relation) => {
        const [sourceTask, targetTask] = await Promise.all([
          ctx.db.get(relation.sourceTaskId),
          ctx.db.get(relation.targetTaskId),
        ]);
        return { ...relation, sourceTask, targetTask };
      }),
    );
  },
});
