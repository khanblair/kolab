import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import type Task from "@/types/task";

export function useUpdateTaskStatus() {
  const updateStatus = useConvexMutation(api.task.updateStatus);

  return useMutation({
    mutationFn: (task: Task) =>
      updateStatus({ taskId: task.id as Id<"task">, status: task.status }),
  });
}
