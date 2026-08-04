import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentUserProfile, requireWorkspaceMember } from "./lib/auth";

// NOTE: fine-grained permission overrides (the `workspaceRole` table, ported
// from Better Auth's dynamicAccessControl) aren't wired yet — every member
// currently has full access regardless of `workspaceUser.role`. That's a
// later phase (workspace-role hooks/pages in the frontend still depend on
// Better Auth's organization plugin and haven't been rewired either).

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, name, email } = await currentUserProfile(ctx);

    const slugTaken = await ctx.db
      .query("workspace")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (slugTaken) {
      throw new Error("A workspace with that slug already exists");
    }

    const workspaceId = await ctx.db.insert("workspace", {
      name: args.name,
      slug: args.slug,
      description: args.description,
    });
    await ctx.db.insert("workspaceUser", {
      workspaceId,
      userId,
      name,
      email,
      role: "owner",
      joinedAt: Date.now(),
    });
    return await ctx.db.get(workspaceId);
  },
});

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await currentUserProfile(ctx);
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

export const listMembers = query({
  args: { workspaceId: v.id("workspace") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    return await ctx.db
      .query("workspaceUser")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .collect();
  },
});
