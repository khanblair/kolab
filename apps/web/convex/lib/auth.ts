import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

// Deliberate deviation from the general Convex guideline (prefer
// tokenIdentifier over subject): this app has exactly one identity
// provider, permanently, by architectural decision (Supabase Auth). The
// frontend's useAuth()/toAppUser() already hands components the bare
// Supabase UUID (session.user.id) everywhere, and Supabase's own member/
// user APIs return that same UUID — using `subject` here keeps every
// userId/assigneeId comparison consistent across the whole app instead of
// requiring a `${issuer}|${uuid}` reconstruction on the client.
export async function requireUserId(ctx: QueryCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

// Best-effort display name from the Supabase JWT. Supabase nests it under
// the custom claim `user_metadata.name`, which Convex exposes as a flat
// string key (not a nested object) since it isn't a known UserIdentity
// field.
export async function currentUserProfile(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  const name =
    (identity["user_metadata.name"] as string | undefined) ??
    identity.email ??
    identity.subject;
  return { userId: identity.subject, name, email: identity.email };
}

export async function requireWorkspaceMember(
  ctx: QueryCtx,
  workspaceId: Id<"workspace">,
) {
  const userId = await requireUserId(ctx);
  const membership = await ctx.db
    .query("workspaceUser")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .filter((q) => q.eq(q.field("userId"), userId))
    .unique();
  if (!membership) {
    throw new Error("Not a member of this workspace");
  }
  return { userId, membership };
}

export async function requireProjectMember(
  ctx: QueryCtx,
  projectId: Id<"project">,
) {
  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new Error("Project not found");
  }
  const { userId } = await requireWorkspaceMember(ctx, project.workspaceId);
  return { userId, project };
}

export async function requireTaskMember(ctx: QueryCtx, taskId: Id<"task">) {
  const task = await ctx.db.get(taskId);
  if (!task) {
    throw new Error("Task not found");
  }
  const { userId, project } = await requireProjectMember(ctx, task.projectId);
  return { userId, project, task };
}
