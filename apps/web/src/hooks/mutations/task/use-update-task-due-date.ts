import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import type Task from "@/types/task";

export function useUpdateTaskDueDate() {
  const updateDueDate = useConvexMutation(api.task.updateDueDate);

  return useMutation({
    mutationFn: (task: Task) =>
      updateDueDate({
        taskId: task.id as Id<"task">,
        dueDate: task.dueDate ? new Date(task.dueDate).getTime() : null,
      }),
  });
}
