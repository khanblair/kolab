import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

function useCreateTaskRelation() {
  const createRelation = useConvexMutation(api.taskRelation.create);

  return useMutation({
    mutationFn: (variables: {
      sourceTaskId: string;
      targetTaskId: string;
      relationType: string;
    }) =>
      createRelation({
        sourceTaskId: variables.sourceTaskId as Id<"task">,
        targetTaskId: variables.targetTaskId as Id<"task">,
        relationType: variables.relationType,
      }),
  });
}

export default useCreateTaskRelation;
