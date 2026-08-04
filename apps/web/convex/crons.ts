import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import {
  createNotification,
  getNotificationPreference,
} from "./lib/notifications";

const MINUTE_MS = 60 * 1000;
const REMINDER_WINDOW_MINUTES = 10;
// Matches the settings UI's lead-time cap (30 days / 720 hours) — the
// widest a `configured_before` reminder could ever need to look ahead.
const MAX_LEAD_TIME_MINUTES = 30 * 24 * 60;

async function markSentAndNotify(
  ctx: MutationCtx,
  task: { _id: Id<"task">; title: string; dueDate: number },
  assigneeId: string,
  reminderType: "configured_before" | "overdue",
  leadTimeMinutes: number,
) {
  const already = await ctx.db
    .query("taskReminderSent")
    .withIndex("by_task_and_type", (q) =>
      q.eq("taskId", task._id).eq("reminderType", reminderType),
    )
    .unique();
  if (already) return;

  await ctx.db.insert("taskReminderSent", { taskId: task._id, reminderType });
  await createNotification(ctx, {
    userId: assigneeId,
    type: reminderType === "overdue" ? "task_overdue" : "due_date_reminder",
    eventData: {
      taskTitle: task.title,
      reminderType,
      leadTimeMinutes,
      dueDate: task.dueDate,
    },
    resourceId: task._id,
    resourceType: "task",
  });
}

export const sendDueDateReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const candidates = await ctx.db
      .query("task")
      .withIndex("by_dueDate", (q) =>
        q
          .gte("dueDate", now - REMINDER_WINDOW_MINUTES * MINUTE_MS)
          .lte("dueDate", now + MAX_LEAD_TIME_MINUTES * MINUTE_MS),
      )
      .collect();

    for (const task of candidates) {
      if (!task.assigneeId || task.dueDate === undefined) continue;

      const column = task.columnId ? await ctx.db.get(task.columnId) : null;
      if (column?.isFinal) continue;

      const preference = await getNotificationPreference(ctx, task.assigneeId);
      if (!preference.dueDateReminderEnabled) continue;

      const targetTime =
        task.dueDate - preference.dueDateReminderLeadTimeMinutes * MINUTE_MS;
      const configuredBeforeDue =
        now - targetTime >= 0 &&
        now - targetTime <= REMINDER_WINDOW_MINUTES * MINUTE_MS;
      const overdueDue =
        now - task.dueDate >= 0 &&
        now - task.dueDate <= REMINDER_WINDOW_MINUTES * MINUTE_MS;

      if (configuredBeforeDue) {
        await markSentAndNotify(
          ctx,
          { _id: task._id, title: task.title, dueDate: task.dueDate },
          task.assigneeId,
          "configured_before",
          preference.dueDateReminderLeadTimeMinutes,
        );
      }
      if (overdueDue) {
        await markSentAndNotify(
          ctx,
          { _id: task._id, title: task.title, dueDate: task.dueDate },
          task.assigneeId,
          "overdue",
          preference.dueDateReminderLeadTimeMinutes,
        );
      }
    }
  },
});

const crons = cronJobs();

crons.interval(
  "due date reminders",
  { minutes: 5 },
  internal.crons.sendDueDateReminders,
  {},
);

export default crons;
