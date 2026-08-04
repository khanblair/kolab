import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Identity note: Supabase Auth owns users/sessions — there is no local
// "user" table here. Every user reference below is v.string() holding the
// Supabase Auth user's UUID (the JWT `sub` claim), not v.id("user").

export default defineSchema({
  workspace: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  // name/email are denormalized from the Supabase JWT at membership-creation
  // time — Convex has no user table and can't read Supabase's user
  // directory, so this is the only place assignee/member names come from.
  workspaceUser: defineTable({
    workspaceId: v.id("workspace"),
    userId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
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

  task: defineTable({
    projectId: v.id("project"),
    columnId: v.optional(v.id("column")),
    position: v.number(),
    number: v.number(),
    assigneeId: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    priority: v.union(
      v.literal("no-priority"),
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent"),
    ),
    startDate: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_number", ["projectId", "number"])
    .index("by_column", ["columnId"])
    .index("by_column_and_position", ["columnId", "position"])
    .index("by_assignee", ["assigneeId"]),

  label: defineTable({
    name: v.string(),
    color: v.string(),
    taskId: v.optional(v.id("task")),
    workspaceId: v.optional(v.id("workspace")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_workspace", ["workspaceId"]),

  comment: defineTable({
    taskId: v.id("task"),
    userId: v.string(),
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_task", ["taskId"]),

  taskRelation: defineTable({
    sourceTaskId: v.id("task"),
    targetTaskId: v.id("task"),
    relationType: v.string(),
    createdAt: v.number(),
  })
    .index("by_source", ["sourceTaskId"])
    .index("by_target", ["targetTaskId"]),

  timeEntry: defineTable({
    taskId: v.id("task"),
    userId: v.optional(v.string()),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    duration: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_user", ["userId"]),

  // integrationId is a plain string placeholder, not a real FK — the
  // `integration` table doesn't exist yet (a later "integrations" phase).
  // Writes here only ever come from GitHub/Gitea webhook handlers in that
  // same later phase; for now this table is read-only.
  externalLink: defineTable({
    taskId: v.id("task"),
    integrationId: v.string(),
    resourceType: v.string(),
    externalId: v.string(),
    url: v.string(),
    title: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_integration", ["integrationId"]),

  activity: defineTable({
    taskId: v.id("task"),
    type: v.string(),
    userId: v.optional(v.string()),
    content: v.optional(v.string()),
    eventData: v.optional(v.any()),
    // Reserved for a later GitHub/Gitea activity-sync phase — unused today.
    externalUserName: v.optional(v.string()),
    externalUserAvatar: v.optional(v.string()),
    externalSource: v.optional(v.string()),
    externalUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_task", ["taskId"]),
});
