import { useQuery } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import { withId } from "@/lib/convex-ids";

export function useGetWorkflowRules(projectId: string) {
  const rules = useQuery(
    api.workflowRule.list,
    projectId ? { projectId: projectId as Id<"project"> } : "skip",
  );

  return {
    data: rules?.map(withId),
    isLoading: Boolean(projectId) && rules === undefined,
    isError: false,
  };
}
