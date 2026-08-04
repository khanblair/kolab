import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireTaskMember } from "./lib/auth";

// Rows are written inline by task.ts's mutations (see lib/activity.ts) —
// this file only reads the feed back.
export const list = query({
  args: { taskId: v.id("task") },
  handler: async (ctx, args) => {
    await requireTaskMember(ctx, args.taskId);
    const activities = await ctx.db
      .query("activity")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    return activities.sort((a, b) => b.createdAt - a.createdAt);
  },
});
