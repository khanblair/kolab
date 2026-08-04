const LAST_WORKSPACE_KEY = "kolab:lastWorkspaceId";

export function getLastWorkspaceId(): string | null {
  return localStorage.getItem(LAST_WORKSPACE_KEY);
}

export function setLastWorkspaceId(workspaceId: string): void {
  localStorage.setItem(LAST_WORKSPACE_KEY, workspaceId);
}
