import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Identity note: Supabase Auth owns users/sessions — there is no local
// "user" table here. Every user reference below is v.string() holding the
// Supabase Auth user's UUID (the JWT `sub` claim), not v.id("user").

export default defineSchema({
  workspace: defineTable({
    name: v.string(),
    slug: v.string(),
  }).index("by_slug", ["slug"]),

  workspaceUser: defineTable({
    workspaceId: v.id("workspace"),
    userId: v.string(),
    role: v.string(),
    joinedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"]),

  workspaceRole: defineTable({
    workspaceId: v.id("workspace"),
    role: v.string(),
    permission: v.string(),
  }).index("by_workspace", ["workspaceId"]),

  team: defineTable({
    workspaceId: v.id("workspace"),
    name: v.string(),
  }).index("by_workspace", ["workspaceId"]),

  teamMember: defineTable({
    teamId: v.id("team"),
    userId: v.string(),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"]),

  invitation: defineTable({
    workspaceId: v.id("workspace"),
    email: v.string(),
    role: v.optional(v.string()),
    teamId: v.optional(v.id("team")),
    status: v.string(),
    expiresAt: v.number(),
    inviterId: v.string(),
  }).index("by_workspace", ["workspaceId"]),

  project: defineTable({
    workspaceId: v.id("workspace"),
    slug: v.string(),
    icon: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    archivedAt: v.optional(v.number()),
    lastTaskNumber: v.number(),
  }).index("by_workspace", ["workspaceId"]),

  column: defineTable({
    projectId: v.id("project"),
    name: v.string(),
    slug: v.string(),
    position: v.number(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    isFinal: v.boolean(),
  }).index("by_project", ["projectId"]),
});
