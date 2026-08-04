import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function logActivity(
  ctx: MutationCtx,
  args: {
    taskId: Id<"task">;
    type: string;
    userId: string;
    content?: string;
    eventData?: unknown;
  },
) {
  const now = Date.now();
  await ctx.db.insert("activity", {
    taskId: args.taskId,
    type: args.type,
    userId: args.userId,
    content: args.content,
    eventData: args.eventData,
    createdAt: now,
    updatedAt: now,
  });
}
