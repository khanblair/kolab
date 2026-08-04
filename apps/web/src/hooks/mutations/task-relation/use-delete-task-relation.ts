import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

function useDeleteTaskRelation(_taskId: string) {
  const removeRelation = useConvexMutation(api.taskRelation.remove);

  return useMutation({
    mutationFn: (relationId: string) =>
      removeRelation({ relationId: relationId as Id<"taskRelation"> }),
  });
}

export default useDeleteTaskRelation;
