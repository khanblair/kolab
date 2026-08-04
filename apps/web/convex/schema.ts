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
    .index("by_assignee", ["assigneeId"])
    .index("by_dueDate", ["dueDate"]),

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

  // integrationType/eventType are free-text ("github"/"pr_merged" etc, not
  // real integration or webhook FKs yet — integrations are still on the
  // Hono API). One rule per (projectId, integrationType, eventType);
  // enforced in workflowRule.ts's upsert, not here.
  workflowRule: defineTable({
    projectId: v.id("project"),
    integrationType: v.string(),
    eventType: v.string(),
    columnId: v.id("column"),
  }).index("by_project", ["projectId"]),

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

  // Served through the `/api/asset/:id` httpAction (convex/http.ts) rather
  // than `ctx.storage.getUrl()` directly, so the URL shape embedded in task
  // descriptions/comments stays stable for `deleteOrphanedAssets`' regex.
  // These URLs are unguessable-but-unauthenticated capability links (see
  // convex/http.ts) — that's a deliberate, flagged departure from the
  // original app's workspace-membership-gated asset route, made because
  // Supabase Auth is bearer-token-only and plain <img> tags can't attach one.
  asset: defineTable({
    workspaceId: v.id("workspace"),
    projectId: v.id("project"),
    taskId: v.optional(v.id("task")),
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    kind: v.union(v.literal("image"), v.literal("attachment")),
    surface: v.union(v.literal("description"), v.literal("comment")),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_workspace", ["workspaceId"]),

  // In-app only for now — no email/ntfy/gotify/webhook delivery. That
  // requires external credentials the deployment doesn't have; see
  // NotificationPreferencesSettings for the corresponding UI scope-down.
  notification: defineTable({
    userId: v.string(),
    type: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    eventData: v.optional(v.any()),
    resourceId: v.optional(v.string()),
    resourceType: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // One row per user, created lazily on first preference read/write. A
  // missing row (or a missing field on an older row) means "enabled" —
  // matches the original's default-notify-when-no-preference-row behavior.
  userNotificationPreference: defineTable({
    userId: v.string(),
    taskAssignmentEnabled: v.optional(v.boolean()),
    taskCommentEnabled: v.optional(v.boolean()),
    taskStatusChangeEnabled: v.optional(v.boolean()),
    dueDateReminderEnabled: v.optional(v.boolean()),
    dueDateReminderLeadTimeMinutes: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Idempotency guard for the due-date-reminder cron (convex/crons.ts): one
  // row per (task, reminder type) once that reminder has fired. task.ts's
  // updateDueDate/patch delete a task's rows here whenever its dueDate
  // changes, so moving the date allows a fresh reminder.
  taskReminderSent: defineTable({
    taskId: v.id("task"),
    reminderType: v.union(v.literal("configured_before"), v.literal("overdue")),
  }).index("by_task_and_type", ["taskId", "reminderType"]),

  // Hashed like the original (SHA-256, portable) — the raw key is shown to
  // the user once at creation and never stored. There is deliberately no
  // verification path here yet: an API key would authenticate against a
  // REST surface that no longer exists now that apps/api is decommissioned.
  apiKey: defineTable({
    userId: v.string(),
    name: v.optional(v.string()),
    keyHash: v.string(),
    start: v.string(),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // Creem is not wired up for Kolab (no CREEM_* credentials) — isBillingEnabled()
  // in convex/billing.ts is hardcoded false, so every workspace is always
  // fully entitled. This table/shape is kept so a future Creem integration
  // is a drop-in rather than a redesign.
  workspaceBilling: defineTable({
    workspaceId: v.id("workspace"),
    foundingFree: v.boolean(),
    trialEndsAt: v.optional(v.number()),
    plan: v.optional(v.string()),
    billingInterval: v.optional(v.string()),
    status: v.optional(v.string()),
    seats: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    creemCustomerId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),
});
