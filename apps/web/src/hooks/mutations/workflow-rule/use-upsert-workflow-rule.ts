import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

export function useUpsertWorkflowRule() {
  const upsertWorkflowRule = useConvexMutation(api.workflowRule.upsert);

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: { integrationType: string; eventType: string; columnId: string };
    }) =>
      upsertWorkflowRule({
        projectId: projectId as Id<"project">,
        integrationType: data.integrationType,
        eventType: data.eventType,
        columnId: data.columnId as Id<"column">,
      }),
  });
}
