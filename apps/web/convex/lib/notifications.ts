import type { MutationCtx, QueryCtx } from "../_generated/server";

type PreferenceGate =
  | "taskAssignmentEnabled"
  | "taskCommentEnabled"
  | "taskStatusChangeEnabled"
  | "dueDateReminderEnabled";

const GATE_BY_TYPE: Record<string, PreferenceGate> = {
  task_created: "taskAssignmentEnabled",
  task_assignee_changed: "taskAssignmentEnabled",
  task_comment: "taskCommentEnabled",
  task_mention: "taskCommentEnabled",
  task_status_changed: "taskStatusChangeEnabled",
  due_date_reminder: "dueDateReminderEnabled",
};

export const DEFAULT_DUE_DATE_REMINDER_LEAD_MINUTES = 1440;

// A missing preference row, or a missing field on an older row, means
// "enabled" — matches the original's default-notify-when-no-preference-row
// behavior (it only ever suppresses a notification on an explicit `false`).
export async function getNotificationPreference(ctx: QueryCtx, userId: string) {
  const row = await ctx.db
    .query("userNotificationPreference")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  return {
    taskAssignmentEnabled: row?.taskAssignmentEnabled ?? true,
    taskCommentEnabled: row?.taskCommentEnabled ?? true,
    taskStatusChangeEnabled: row?.taskStatusChangeEnabled ?? true,
    dueDateReminderEnabled: row?.dueDateReminderEnabled ?? true,
    dueDateReminderLeadTimeMinutes:
      row?.dueDateReminderLeadTimeMinutes ??
      DEFAULT_DUE_DATE_REMINDER_LEAD_MINUTES,
  };
}

export async function createNotification(
  ctx: MutationCtx,
  args: {
    userId: string;
    type: string;
    eventData?: unknown;
    resourceId?: string;
    resourceType?: string;
  },
) {
  const gate = GATE_BY_TYPE[args.type];
  if (gate) {
    const preference = await getNotificationPreference(ctx, args.userId);
    if (preference[gate] === false) return;
  }

  await ctx.db.insert("notification", {
    userId: args.userId,
    type: args.type,
    eventData: args.eventData,
    resourceId: args.resourceId,
    resourceType: args.resourceType,
    isRead: false,
    createdAt: Date.now(),
  });
}
