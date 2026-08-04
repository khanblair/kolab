import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireTaskMember } from "./lib/auth";

// Read-only for now — writes come from GitHub/Gitea webhook handlers in a
// later "integrations" phase.
export const list = query({
  args: { taskId: v.id("task") },
  handler: async (ctx, args) => {
    await requireTaskMember(ctx, args.taskId);
    return await ctx.db
      .query("externalLink")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
  },
});
