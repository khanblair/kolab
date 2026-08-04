import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireWorkspaceMember } from "./lib/auth";

// Creem is not wired up for Kolab — no CREEM_API_KEY/CREEM_WEBHOOK_SECRET
// credentials. Flip this (and implement the checkout/portal mutations
// below against Creem's API) if that changes; until then every workspace
// is fully entitled, matching the original app's self-hosted default.
function isBillingEnabled() {
  return false;
}

const ACTIVE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "scheduled_cancel",
]);

function computeEntitlement(billing: Doc<"workspaceBilling"> | null) {
  if (!isBillingEnabled()) {
    return { active: true, reason: "billing_disabled" as const };
  }
  if (billing?.foundingFree) {
    return { active: true, reason: "founding_free" as const };
  }
  if (billing?.status && ACTIVE_STATUSES.has(billing.status)) {
    return { active: true, reason: "subscription" as const };
  }
  if (billing?.trialEndsAt && billing.trialEndsAt > Date.now()) {
    return { active: true, reason: "trial" as const };
  }
  return { active: false, reason: "expired" as const };
}

export const getWorkspaceBilling = query({
  args: { workspaceId: v.id("workspace") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    const billing = await ctx.db
      .query("workspaceBilling")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .unique();

    return {
      billingEnabled: isBillingEnabled(),
      entitlement: computeEntitlement(billing),
      foundingFree: billing?.foundingFree ?? false,
      trialEndsAt: billing?.trialEndsAt ?? null,
      plan: billing?.plan ?? null,
      billingInterval: billing?.billingInterval ?? null,
      status: billing?.status ?? null,
      seats: billing?.seats ?? null,
      currentPeriodEnd: billing?.currentPeriodEnd ?? null,
      canceledAt: billing?.canceledAt ?? null,
      hasCustomer: Boolean(billing?.creemCustomerId),
    };
  },
});

export const createCheckout = mutation({
  args: {
    workspaceId: v.id("workspace"),
    plan: v.union(v.literal("personal"), v.literal("team")),
    interval: v.union(v.literal("monthly"), v.literal("annual")),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    throw new Error("Billing is not configured for this deployment.");
  },
});

export const createPortalSession = mutation({
  args: { workspaceId: v.id("workspace") },
  handler: async (ctx, args) => {
    await requireWorkspaceMember(ctx, args.workspaceId);
    throw new Error("Billing is not configured for this deployment.");
  },
});
