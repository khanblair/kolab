import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Minimal — enough for the project slice to reference a real workspaceId.
export const create = mutation({
  args: { name: v.string(), slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("workspace", args);
  },
});
