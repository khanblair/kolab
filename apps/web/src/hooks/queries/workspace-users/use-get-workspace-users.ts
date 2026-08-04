import { useQuery } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

type GetWorkspaceUsersRequest = {
  workspaceId?: string;
};

function useGetWorkspaceUsers({ workspaceId }: GetWorkspaceUsersRequest) {
  const members = useQuery(
    api.workspace.listMembers,
    workspaceId ? { workspaceId: workspaceId as Id<"workspace"> } : "skip",
  );

  return {
    data: members?.map((m) => ({
      userId: m.userId,
      role: m.role,
      user: { id: m.userId, name: m.name, email: m.email ?? null, image: null },
    })),
    isLoading: Boolean(workspaceId) && members === undefined,
    isError: false,
  };
}

export default useGetWorkspaceUsers;
