import { useQuery } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import { toTask } from "@/lib/to-task";

function useGetTask(taskId: string) {
  const task = useQuery(
    api.task.get,
    taskId ? { taskId: taskId as Id<"task"> } : "skip",
  );

  return {
    data: task ? toTask(task) : undefined,
    isLoading: Boolean(taskId) && task === undefined,
    isError: false,
  };
}

export default useGetTask;
