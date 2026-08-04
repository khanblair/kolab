import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId, requireWorkspaceMember } from "./lib/auth";

// NOTE: fine-grained permission overrides (the `workspaceRole` table, ported
// from Better Auth's dynamicAccessControl) aren't wired yet — every member
// currently has full access regardless of `workspaceUser.role`. That's a
// later phase (workspace-role hooks/pages in the frontend still depend on
// Better Auth's organization plugin and haven't been rewired either).

export const create = mutation({
  args: { name: v.string(), slug: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const workspaceId = await ctx.db.insert("workspace", {
      name: args.name,
      slug: args.slug,
    });
    await ctx.db.insert("workspaceUser", {
      workspaceId,
      userId,
      role: "owner",
      joinedAt: Date.now(),
    });
    return await ctx.db.get(workspaceId);
  },
});

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const memberships = await ctx.db
      .query("workspaceUser")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const workspaces = await Promise.all(
      memberships.map((m) => ctx.db.get(m.workspaceId)),
    );
    return workspaces.filter((w) => w !== null);
  },
});

export const get = query({
  args: { workspaceId: v.id("workspace") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    return await ctx.db.get(args.workspaceId);
  },
});
