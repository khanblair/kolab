import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

function useDeleteComment(_taskId: string) {
  const removeComment = useConvexMutation(api.comment.remove);

  return useMutation({
    mutationFn: ({ activityId }: { activityId: string }) =>
      removeComment({ commentId: activityId as Id<"comment"> }),
  });
}

export default useDeleteComment;
