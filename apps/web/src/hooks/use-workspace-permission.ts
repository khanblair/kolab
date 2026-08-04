import { useMemo } from "react";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import { useGetActiveWorkspaceUser } from "@/hooks/queries/workspace-users/use-active-workspace-user";

export type PermissionLevel = "owner" | "admin" | "member";

// NOTE: fine-grained permission overrides (the `workspaceRole` table, ported
// from Better Auth's dynamicAccessControl) aren't wired up on the Convex
// side yet either — see the NOTE in convex/workspace.ts. Every workspace
// member currently has full access regardless of role; this stub matches
// that honestly instead of pretending to check permissions the backend
// doesn't enforce.
export function useWorkspacePermission() {
  const { data: activeWorkspace, isLoading: isWorkspaceLoading } =
    useActiveWorkspace();
  const { data: activeMember, isLoading: isMemberLoading } =
    useGetActiveWorkspaceUser();
  const role = activeMember?.role as string | undefined;
  const isMember = Boolean(activeMember);

  const helpers = useMemo(() => {
    const check = () => isMember;
    return {
      canManageProjects: check,
      canCreateProjects: check,
      canDeleteProjects: check,
      canManageTasks: check,
      canCreateTasks: check,
      canAssignTasks: check,
      canManageLabels: check,
      canManageWorkspace: check,
      canDeleteWorkspace: check,
      canInviteUsers: check,
      canManageTeam: check,
      canRemoveMembers: check,
      // Escape hatch kept for call-site compatibility; no server-side
      // permission model exists yet, so this just mirrors membership.
      hasPermission: async (_permissions?: Record<string, string[]>) =>
        isMember,
    };
  }, [isMember]);

  return {
    ...helpers,
    workspace: activeWorkspace,
    member: activeMember,
    role,
    isOwner: role === "owner",
    isAdmin: role === "owner" || role === "admin",
    isCheckingPermissions: isWorkspaceLoading || isMemberLoading,
    isRefetchingPermissions: false,
  };
}
