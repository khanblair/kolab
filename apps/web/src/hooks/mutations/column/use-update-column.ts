import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

export function useUpdateColumn() {
  const queryClient = useQueryClient();
  const updateColumn = useConvexMutation(api.column.update);

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      projectId: string;
      data: {
        name?: string;
        icon?: string | null;
        color?: string | null;
        isFinal?: boolean;
      };
    }) =>
      updateColumn({
        columnId: id as Id<"column">,
        // Convex's args validators don't distinguish "key omitted" from
        // "key present with value undefined" the way a plain fetch body
        // does — only include keys the caller actually provided, so an
        // update to one field never clobbers the others.
        ...(data.name !== undefined && { name: data.name }),
        ...(data.icon !== undefined &&
          data.icon !== null && { icon: data.icon }),
        ...(data.color !== undefined &&
          data.color !== null && { color: data.color }),
        ...(data.isFinal !== undefined && { isFinal: data.isFinal }),
      }),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["columns", variables.projectId],
          refetchType: "all",
        }),
        queryClient.invalidateQueries({
          queryKey: ["tasks", variables.projectId],
          refetchType: "all",
        }),
      ]);
    },
  });
}
