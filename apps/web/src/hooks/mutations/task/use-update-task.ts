import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import type Task from "@/types/task";

// Generic full-task update — mirrors the original PUT-the-whole-resource
// endpoint, used by several views (backlog, gantt, list view, the kanban
// board's drag-drop) instead of the single-field mutations.
export function useUpdateTask() {
  const patchTask = useConvexMutation(api.task.patch);

  return useMutation({
    mutationFn: async (task: Task) => {
      await patchTask({
        taskId: task.id as Id<"task">,
        title: task.title,
        description: task.description ?? undefined,
        status: task.status,
        priority:
          (task.priority as
            | "no-priority"
            | "low"
            | "medium"
            | "high"
            | "urgent"
            | null) ?? "no-priority",
        assigneeId: task.assigneeId,
        startDate: task.startDate ? new Date(task.startDate).getTime() : null,
        dueDate: task.dueDate ? new Date(task.dueDate).getTime() : null,
        position: task.position ?? undefined,
      });
      return task;
    },
  });
}
