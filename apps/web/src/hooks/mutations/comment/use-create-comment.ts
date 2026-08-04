import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

function useCreateComment() {
  const createComment = useConvexMutation(api.comment.create);

  return useMutation({
    mutationFn: ({ taskId, comment }: { taskId: string; comment: string }) =>
      createComment({ taskId: taskId as Id<"task">, content: comment }),
  });
}

export default useCreateComment;
