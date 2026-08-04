import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api } from "@/lib/convex-api";
import { withId } from "@/lib/convex-ids";
import {
  createUniqueWorkspaceSlug,
  isWorkspaceSlugCollisionError,
} from "@/lib/utils/create-workspace-slug";

type CreateWorkspaceRequest = {
  name: string;
  description?: string;
  slug?: string;
};

function useCreateWorkspace() {
  const createWorkspace = useConvexMutation(api.workspace.create);

  return useMutation({
    mutationFn: async ({ name, description, slug }: CreateWorkspaceRequest) => {
      let workspaceSlug = slug ?? createUniqueWorkspaceSlug(name, []);

      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const workspace = await createWorkspace({
            name,
            slug: workspaceSlug,
            description,
          });
          if (!workspace) throw new Error("Failed to create workspace");
          return withId(workspace);
        } catch (error) {
          if (slug || !isWorkspaceSlugCollisionError(error)) {
            throw error;
          }
          workspaceSlug = createUniqueWorkspaceSlug(name, [workspaceSlug]);
        }
      }

      throw new Error("Failed to create workspace");
    },
  });
}

export default useCreateWorkspace;
