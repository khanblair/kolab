import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireTaskMember, requireUserId } from "./lib/auth";

export const create = mutation({
  args: {
    taskId: v.id("task"),
    description: v.optional(v.string()),
    startTime: v.number(),
  },
  handler: async (ctx, args) => {
    await requireTaskMember(ctx, args.taskId);
    const userId = await requireUserId(ctx);
    const now = Date.now();
    return await ctx.db.insert("timeEntry", {
      taskId: args.taskId,
      userId,
      description: args.description,
      startTime: args.startTime,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    timeEntryId: v.id("timeEntry"),
    description: v.optional(v.string()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.timeEntryId);
    if (!entry) throw new Error("Time entry not found");
    await requireTaskMember(ctx, entry.taskId);

    const duration =
      args.endTime !== undefined
        ? Math.floor((args.endTime - entry.startTime) / 1000)
        : undefined;

    await ctx.db.patch(args.timeEntryId, {
      description: args.description ?? entry.description,
      endTime: args.endTime ?? entry.endTime,
      duration: duration ?? entry.duration,
      updatedAt: Date.now(),
    });
  },
});

export const get = query({
  args: { timeEntryId: v.id("timeEntry") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.timeEntryId);
    if (!entry) return null;
    await requireTaskMember(ctx, entry.taskId);
    return entry;
  },
});

export const list = query({
  args: { taskId: v.id("task") },
  handler: async (ctx, args) => {
    await requireTaskMember(ctx, args.taskId);
    const entries = await ctx.db
      .query("timeEntry")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    return entries.sort((a, b) => a.startTime - b.startTime);
  },
});
