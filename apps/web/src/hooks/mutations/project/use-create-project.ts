import { useMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import { withId } from "@/lib/convex-ids";

function useCreateProject({
  name,
  slug,
  workspaceId,
  icon,
}: {
  name: string;
  slug: string;
  workspaceId: string;
  icon: string;
}) {
  const createProject = useMutation(api.project.create);

  return {
    mutateAsync: async () => {
      const project = await createProject({
        name,
        slug,
        icon,
        workspaceId: workspaceId as Id<"workspace">,
      });
      if (!project) throw new Error("Failed to create project");
      return withId(project);
    },
  };
}

export default useCreateProject;
