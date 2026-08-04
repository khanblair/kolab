import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import type Task from "@/types/task";

export function useUpdateTaskPriority() {
  const updatePriority = useConvexMutation(api.task.updatePriority);

  return useMutation({
    mutationFn: (task: Task) =>
      updatePriority({
        taskId: task.id as Id<"task">,
        priority:
          (task.priority as
            | "no-priority"
            | "low"
            | "medium"
            | "high"
            | "urgent"
            | null) ?? "no-priority",
      }),
  });
}
