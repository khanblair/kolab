import { useQuery } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import { withId } from "@/lib/convex-ids";

function useGetLabelsByWorkspace(workspaceId: string) {
  const labels = useQuery(
    api.label.listByWorkspace,
    workspaceId ? { workspaceId: workspaceId as Id<"workspace"> } : "skip",
  );

  return {
    data: labels?.map(withId),
    isLoading: Boolean(workspaceId) && labels === undefined,
    isError: false,
  };
}

export default useGetLabelsByWorkspace;
