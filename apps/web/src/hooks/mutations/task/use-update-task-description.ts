import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import type Task from "@/types/task";

export function useUpdateTaskDescription() {
  const updateDescription = useConvexMutation(api.task.updateDescription);

  return useMutation({
    mutationFn: (task: Task) =>
      updateDescription({
        taskId: task.id as Id<"task">,
        description: task.description ?? undefined,
      }),
  });
}
