import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { deleteOrphanedAssets } from "./lib/assets";
import { requireTaskMember, requireUserId } from "./lib/auth";
import { parseMentionIds } from "./lib/mentions";
import { createNotification } from "./lib/notifications";

export const create = mutation({
  args: { taskId: v.id("task"), content: v.string() },
  handler: async (ctx, args) => {
    const { userId, task, project } = await requireTaskMember(ctx, args.taskId);
    const now = Date.now();
    const commentId = await ctx.db.insert("comment", {
      taskId: args.taskId,
      userId,
      content: args.content,
      createdAt: now,
      updatedAt: now,
    });

    // Notify any workspace members @mentioned in the comment (not the author).
    const mentionedIds = parseMentionIds(args.content).filter(
      (id) => id !== userId,
    );
    for (const mentionedId of mentionedIds) {
      await createNotification(ctx, {
        userId: mentionedId,
        type: "task_mention",
        eventData: {
          taskTitle: task.title,
          projectId: task.projectId,
          workspaceId: project.workspaceId,
        },
        resourceId: args.taskId,
        resourceType: "task",
      });
    }

    if (
      task.assigneeId &&
      task.assigneeId !== userId &&
      !mentionedIds.includes(task.assigneeId)
    ) {
      await createNotification(ctx, {
        userId: task.assigneeId,
        type: "task_comment",
        eventData: {
          taskTitle: task.title,
          commentPreview: args.content.slice(0, 160),
          projectId: task.projectId,
          workspaceId: project.workspaceId,
        },
        resourceId: args.taskId,
        resourceType: "task",
      });
    }

    return commentId;
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
    await deleteOrphanedAssets(
      ctx,
      comment.content,
      args.content,
      comment.taskId,
    );
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
    await deleteOrphanedAssets(ctx, comment.content, null, comment.taskId);
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
