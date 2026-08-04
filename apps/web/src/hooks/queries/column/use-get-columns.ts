import { useQuery } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import { withId } from "@/lib/convex-ids";

export function useGetColumns(projectId: string) {
  const columns = useQuery(
    api.column.list,
    projectId ? { projectId: projectId as Id<"project"> } : "skip",
  );

  return {
    data: columns?.map(withId),
    isLoading: Boolean(projectId) && columns === undefined,
    isError: false,
  };
}
