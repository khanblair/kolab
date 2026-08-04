import { useQuery } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import { withId } from "@/lib/convex-ids";

function useExternalLinks(taskId: string) {
  const links = useQuery(
    api.externalLink.list,
    taskId ? { taskId: taskId as Id<"task"> } : "skip",
  );

  return {
    data: links?.map(withId),
    isLoading: Boolean(taskId) && links === undefined,
    isError: false,
  };
}

export default useExternalLinks;
