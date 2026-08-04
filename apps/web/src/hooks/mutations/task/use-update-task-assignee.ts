import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import type Task from "@/types/task";

export function useUpdateTaskAssignee() {
  const updateAssignee = useConvexMutation(api.task.updateAssignee);

  return useMutation({
    // Every call site (task-assignee-popover, subtask-assignee-popover,
    // the kanban card context menu) spreads the existing task and sets
    // `userId` to the new selection — none of them set `assigneeId`. Reading
    // that field here made every assignee change a no-op: it always sent
    // the task's unchanged assigneeId back to Convex.
    mutationFn: (task: Task) =>
      updateAssignee({
        taskId: task.id as Id<"task">,
        assigneeId: task.userId || null,
      }),
  });
}
