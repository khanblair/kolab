import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

// Convex guideline: prefer identity.tokenIdentifier (stable, globally unique
// across providers) over identity.subject for any stored user reference.
export async function requireUserId(ctx: QueryCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.tokenIdentifier;
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
