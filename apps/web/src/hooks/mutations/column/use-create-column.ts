import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

export function useCreateColumn() {
  const queryClient = useQueryClient();
  const createColumn = useConvexMutation(api.column.create);

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: { name: string; icon?: string; color?: string; isFinal?: boolean };
    }) =>
      createColumn({
        projectId: projectId as Id<"project">,
        ...data,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ refetchType: "all" });
    },
  });
}
