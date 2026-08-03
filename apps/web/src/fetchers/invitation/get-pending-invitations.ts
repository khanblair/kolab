import { client } from "@kolab/libs";
import type { WorkspaceUserInvitation } from "@/types/workspace-user";

export async function getPendingInvitations(): Promise<
  WorkspaceUserInvitation[]
> {
  const response = await client.invitation.pending.$get();

  if (!response.ok) {
    throw new Error("Failed to get pending invitations");
  }

  return response.json();
}
