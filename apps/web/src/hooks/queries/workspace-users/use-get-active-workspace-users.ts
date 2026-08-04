import { useQuery } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

export function useGetActiveWorkspaceUsers(workspaceId: string) {
  const members = useQuery(
    api.workspace.listMembers,
    workspaceId ? { workspaceId: workspaceId as Id<"workspace"> } : "skip",
  );

  return {
    data: members
      ? {
          members: members.map((m) => ({
            userId: m.userId,
            role: m.role,
            user: {
              name: m.name,
              image: null as string | null,
              email: m.email ?? "",
            },
          })),
        }
      : undefined,
    isLoading: Boolean(workspaceId) && members === undefined,
    isError: false,
  };
}
