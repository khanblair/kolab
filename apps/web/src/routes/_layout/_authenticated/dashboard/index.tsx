import { createFileRoute, redirect } from "@tanstack/react-router";
import { api } from "@/lib/convex-api";
import { convex } from "@/lib/convex-client";
import { getLastWorkspaceId } from "@/lib/last-workspace";

export const Route = createFileRoute("/_layout/_authenticated/dashboard/")({
  beforeLoad: async () => {
    const workspaces = await convex.query(api.workspace.listForUser, {});

    if (workspaces.length === 0) {
      throw redirect({ to: "/onboarding" });
    }

    const lastWorkspaceId = getLastWorkspaceId();
    const target =
      workspaces.find((w) => w._id === lastWorkspaceId) ?? workspaces[0];

    throw redirect({
      to: "/dashboard/workspace/$workspaceId",
      params: { workspaceId: target._id },
    });
  },
});
