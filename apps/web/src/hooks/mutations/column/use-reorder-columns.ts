import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

export function useReorderColumns() {
  const queryClient = useQueryClient();
  const reorderColumns = useConvexMutation(api.column.reorder);

  return useMutation({
    mutationFn: ({
      projectId,
      columns,
    }: {
      projectId: string;
      columns: Array<{ id: string; position: number }>;
    }) =>
      reorderColumns({
        projectId: projectId as Id<"project">,
        positions: columns.map((c) => ({
          columnId: c.id as Id<"column">,
          position: c.position,
        })),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ refetchType: "all" });
    },
  });
}
