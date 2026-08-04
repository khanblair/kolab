import { useQuery } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import { withId } from "@/lib/convex-ids";

function useGetLabelsByTask(taskId: string) {
  const labels = useQuery(
    api.label.listByTask,
    taskId ? { taskId: taskId as Id<"task"> } : "skip",
  );

  return {
    data: labels?.map(withId),
    isLoading: Boolean(taskId) && labels === undefined,
    isError: false,
  };
}

export default useGetLabelsByTask;
