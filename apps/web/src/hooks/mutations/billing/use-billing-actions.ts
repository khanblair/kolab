import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { toast } from "sonner";
import { api, type Id } from "@/lib/convex-api";

export type BillingPlan = "personal" | "team";
export type BillingInterval = "monthly" | "annual";

export function useCreateCheckout(workspaceId: string | undefined) {
  const createCheckout = useConvexMutation(api.billing.createCheckout);

  return useMutation({
    mutationFn: (input: { plan: BillingPlan; interval: BillingInterval }) =>
      createCheckout({ workspaceId: workspaceId as Id<"workspace">, ...input }),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not start checkout",
      );
    },
  });
}

export function useOpenBillingPortal(workspaceId: string | undefined) {
  const createPortalSession = useConvexMutation(
    api.billing.createPortalSession,
  );

  return useMutation({
    mutationFn: () =>
      createPortalSession({ workspaceId: workspaceId as Id<"workspace"> }),
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not open billing portal",
      );
    },
  });
}
