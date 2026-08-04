import { useQuery } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import { withId } from "@/lib/convex-ids";

function useGetProject({ id }: { id: string; workspaceId: string }) {
  const project = useQuery(
    api.project.get,
    id ? { projectId: id as Id<"project"> } : "skip",
  );

  return {
    data: project ? withId(project) : undefined,
    isLoading: Boolean(id) && project === undefined,
    isError: false,
  };
}

export default useGetProject;
