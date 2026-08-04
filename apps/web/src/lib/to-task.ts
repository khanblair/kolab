import type { Doc } from "@/lib/convex-api";
import type Task from "@/types/task";

export function toTask(
  doc: Doc<"task">,
  assigneeName: string | null = null,
): Task {
  return {
    id: doc._id,
    title: doc.title,
    number: doc.number,
    description: doc.description ?? null,
    status: doc.status,
    priority: doc.priority,
    startDate: doc.startDate ? new Date(doc.startDate).toISOString() : null,
    dueDate: doc.dueDate ? new Date(doc.dueDate).toISOString() : null,
    position: doc.position,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
    userId: doc.assigneeId ?? null,
    assigneeId: doc.assigneeId ?? null,
    assigneeName,
    assigneeImage: null,
    projectId: doc.projectId,
    columnId: doc.columnId ?? null,
  };
}
