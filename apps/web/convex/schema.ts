import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  workspace: defineTable({
    name: v.string(),
    slug: v.string(),
  }).index("by_slug", ["slug"]),

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
