import { useQuery } from "convex/react";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import { api } from "@/lib/convex-api";

export const useGetActiveWorkspaceUser = () => {
  const { user } = useAuth();
  const { data: workspace } = useActiveWorkspace();

  const members = useQuery(
    api.workspace.listMembers,
    workspace?.id ? { workspaceId: workspace.id } : "skip",
  );

  const data = members?.find((m) => m.userId === user?.id) ?? null;

  return {
    data,
    isLoading: Boolean(workspace?.id) && members === undefined,
  };
};
