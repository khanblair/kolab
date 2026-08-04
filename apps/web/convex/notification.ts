import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { getNotificationPreference } from "./lib/notifications";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const notifications = await ctx.db
      .query("notification")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
    return notifications;
  },
});

export const markAsRead = mutation({
  args: { notificationId: v.id("notification") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== userId) {
      throw new Error("Notification not found");
    }
    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const notifications = await ctx.db
      .query("notification")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const notification of notifications) {
      if (!notification.isRead) {
        await ctx.db.patch(notification._id, { isRead: true });
      }
    }
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const notifications = await ctx.db
      .query("notification")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }
  },
});

export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await getNotificationPreference(ctx, userId);
  },
});

export const updatePreferences = mutation({
  args: {
    taskAssignmentEnabled: v.optional(v.boolean()),
    taskCommentEnabled: v.optional(v.boolean()),
    taskStatusChangeEnabled: v.optional(v.boolean()),
    dueDateReminderEnabled: v.optional(v.boolean()),
    dueDateReminderLeadTimeMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("userNotificationPreference")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const updates: Record<string, unknown> = {};
    if (args.taskAssignmentEnabled !== undefined)
      updates.taskAssignmentEnabled = args.taskAssignmentEnabled;
    if (args.taskCommentEnabled !== undefined)
      updates.taskCommentEnabled = args.taskCommentEnabled;
    if (args.taskStatusChangeEnabled !== undefined)
      updates.taskStatusChangeEnabled = args.taskStatusChangeEnabled;
    if (args.dueDateReminderEnabled !== undefined)
      updates.dueDateReminderEnabled = args.dueDateReminderEnabled;
    if (args.dueDateReminderLeadTimeMinutes !== undefined)
      updates.dueDateReminderLeadTimeMinutes =
        args.dueDateReminderLeadTimeMinutes;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("userNotificationPreference", {
        userId,
        ...updates,
      });
    }

    return await getNotificationPreference(ctx, userId);
  },
});
