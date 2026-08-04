import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import type Task from "@/types/task";

export function useUpdateTaskAssignee() {
  const updateAssignee = useConvexMutation(api.task.updateAssignee);

  return useMutation({
    mutationFn: (task: Task) =>
      updateAssignee({
        taskId: task.id as Id<"task">,
        assigneeId: task.assigneeId || null,
      }),
  });
}
