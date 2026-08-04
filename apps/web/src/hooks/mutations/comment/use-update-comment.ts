import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

function useUpdateComment() {
  const updateComment = useConvexMutation(api.comment.update);

  return useMutation({
    mutationFn: ({
      activityId,
      comment,
    }: {
      activityId: string;
      comment: string;
    }) =>
      updateComment({
        commentId: activityId as Id<"comment">,
        content: comment,
      }),
  });
}

export default useUpdateComment;
