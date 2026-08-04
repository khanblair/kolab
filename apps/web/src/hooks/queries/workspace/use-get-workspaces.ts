import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { withId } from "@/lib/convex-ids";

function useGetWorkspaces() {
  const workspaces = useQuery(api.workspace.listForUser, {});

  return {
    data: workspaces?.map(withId),
    isLoading: workspaces === undefined,
    isError: false,
  };
}

export default useGetWorkspaces;
