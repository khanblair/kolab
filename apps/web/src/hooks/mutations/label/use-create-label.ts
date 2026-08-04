import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import { withId } from "@/lib/convex-ids";

type CreateLabelRequest = {
  name: string;
  color: string;
  taskId?: string;
  workspaceId: string;
};

function useCreateLabel() {
  const createLabel = useConvexMutation(api.label.create);

  return useMutation({
    mutationFn: async ({
      name,
      color,
      taskId,
      workspaceId,
    }: CreateLabelRequest) => {
      const label = await createLabel({
        name,
        color,
        taskId: taskId ? (taskId as Id<"task">) : undefined,
        workspaceId: workspaceId as Id<"workspace">,
      });
      if (!label) throw new Error("Failed to create label");
      return withId(label);
    },
  });
}

export default useCreateLabel;
