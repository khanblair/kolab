import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import { withId } from "@/lib/convex-ids";

type UpdateProjectRequest = {
  id: string;
  name?: string;
  icon?: string;
  slug?: string;
  description?: string;
  isPublic?: boolean;
};

function useUpdateProject() {
  const updateProject = useConvexMutation(api.project.update);

  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateProjectRequest) => {
      const project = await updateProject({
        projectId: id as Id<"project">,
        ...patch,
      });
      return project ? withId(project) : project;
    },
  });
}

export default useUpdateProject;
