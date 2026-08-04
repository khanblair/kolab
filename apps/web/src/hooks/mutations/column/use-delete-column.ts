import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

export function useDeleteColumn() {
  const queryClient = useQueryClient();
  const deleteColumn = useConvexMutation(api.column.remove);

  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) =>
      deleteColumn({ columnId: id as Id<"column"> }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ refetchType: "all" });
    },
  });
}
