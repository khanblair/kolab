import { useQuery } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

export function useGetBilling(workspaceId: string | undefined) {
  const billing = useQuery(
    api.billing.getWorkspaceBilling,
    workspaceId ? { workspaceId: workspaceId as Id<"workspace"> } : "skip",
  );
  return {
    data: billing,
    isLoading: Boolean(workspaceId) && billing === undefined,
  };
}
