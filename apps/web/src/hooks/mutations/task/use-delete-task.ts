import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

export function useDeleteTask() {
  const deleteTask = useConvexMutation(api.task.deleteTask);

  return useMutation({
    mutationFn: (taskId: string) =>
      deleteTask({ taskId: taskId as Id<"task"> }),
  });
}
