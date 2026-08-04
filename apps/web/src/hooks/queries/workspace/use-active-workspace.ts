import { useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import { withId } from "@/lib/convex-ids";

// The route's $workspaceId param is the source of truth — there's no
// server-side "active workspace" concept anymore (that was Better Auth
// session state, which doesn't exist under Supabase Auth).
function useActiveWorkspace() {
  const { workspaceId } = useParams({
    strict: false,
    select: (params) => ({
      workspaceId:
        "workspaceId" in params && typeof params.workspaceId === "string"
          ? params.workspaceId
          : undefined,
    }),
  });

  const workspace = useQuery(
    api.workspace.get,
    workspaceId ? { workspaceId: workspaceId as Id<"workspace"> } : "skip",
  );

  return {
    data: workspace ? withId(workspace) : undefined,
    isLoading: Boolean(workspaceId) && workspace === undefined,
    isError: false,
  };
}

export default useActiveWorkspace;
