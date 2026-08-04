import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireTaskMember, requireUserId } from "./lib/auth";

export const create = mutation({
  args: { taskId: v.id("task"), content: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireTaskMember(ctx, args.taskId);
    const now = Date.now();
    return await ctx.db.insert("comment", {
      taskId: args.taskId,
      userId,
      content: args.content,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { commentId: v.id("comment"), content: v.string() },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    await requireTaskMember(ctx, comment.taskId);
    const userId = await requireUserId(ctx);
    if (comment.userId !== userId) {
      throw new Error("Only the comment's author can edit it");
    }
    await ctx.db.patch(args.commentId, {
      content: args.content,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { commentId: v.id("comment") },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");
    await requireTaskMember(ctx, comment.taskId);
    const userId = await requireUserId(ctx);
    if (comment.userId !== userId) {
      throw new Error("Only the comment's author can delete it");
    }
    await ctx.db.delete(args.commentId);
  },
});

export const list = query({
  args: { taskId: v.id("task") },
  handler: async (ctx, args) => {
    await requireTaskMember(ctx, args.taskId);
    const comments = await ctx.db
      .query("comment")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    return comments.sort((a, b) => a.createdAt - b.createdAt);
  },
});
