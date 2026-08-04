import { useQuery } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import { withId } from "@/lib/convex-ids";

function useGetProjects({ workspaceId }: { workspaceId: string }) {
  const projects = useQuery(
    api.project.list,
    workspaceId ? { workspaceId: workspaceId as Id<"workspace"> } : "skip",
  );

  return {
    data: projects?.map(withId),
    isLoading: Boolean(workspaceId) && projects === undefined,
    isError: false,
  };
}

export default useGetProjects;
