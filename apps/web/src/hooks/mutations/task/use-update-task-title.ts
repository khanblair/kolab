import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import type Task from "@/types/task";

export function useUpdateTaskTitle() {
  const updateTitle = useConvexMutation(api.task.updateTitle);

  return useMutation({
    mutationFn: (task: Task) =>
      updateTitle({ taskId: task.id as Id<"task">, title: task.title }),
  });
}
