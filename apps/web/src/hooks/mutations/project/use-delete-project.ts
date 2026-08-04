import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

function useDeleteProject() {
  const deleteProject = useConvexMutation(api.project.remove);

  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      deleteProject({ projectId: id as Id<"project"> }),
  });
}

export default useDeleteProject;
