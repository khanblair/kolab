import { v } from "convex/values";
import { internalQuery, mutation } from "./_generated/server";
import { isImageContentType, MAX_ASSET_UPLOAD_BYTES } from "./lib/assets";
import { requireTaskMember } from "./lib/auth";

export const generateUploadUrl = mutation({
  args: { taskId: v.id("task") },
  handler: async (ctx, args) => {
    await requireTaskMember(ctx, args.taskId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const finalizeUpload = mutation({
  args: {
    taskId: v.id("task"),
    storageId: v.id("_storage"),
    filename: v.string(),
    surface: v.union(v.literal("description"), v.literal("comment")),
  },
  handler: async (ctx, args) => {
    const { userId, task } = await requireTaskMember(ctx, args.taskId);

    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) {
      throw new Error("Uploaded file not found.");
    }
    if (metadata.size > MAX_ASSET_UPLOAD_BYTES) {
      await ctx.storage.delete(args.storageId);
      throw new Error(
        `Upload exceeds the maximum upload size of ${Math.floor(MAX_ASSET_UPLOAD_BYTES / (1024 * 1024))}MB.`,
      );
    }

    const contentType = metadata.contentType || "application/octet-stream";
    const project = await ctx.db.get(task.projectId);
    if (!project) throw new Error("Project not found");

    const assetId = await ctx.db.insert("asset", {
      workspaceId: project.workspaceId,
      projectId: task.projectId,
      taskId: args.taskId,
      storageId: args.storageId,
      filename: args.filename,
      mimeType: contentType,
      size: metadata.size,
      kind: isImageContentType(contentType) ? "image" : "attachment",
      surface: args.surface,
      createdBy: userId,
      createdAt: Date.now(),
    });

    return { id: assetId };
  },
});

// Read-only lookup for the /api/asset/:id httpAction (convex/http.ts) —
// internal since it skips authorization by design (see the schema comment
// on the `asset` table for why).
export const getForServing = internalQuery({
  args: { assetId: v.string() },
  handler: async (ctx, args) => {
    const assetId = ctx.db.normalizeId("asset", args.assetId);
    if (!assetId) return null;
    return await ctx.db.get(assetId);
  },
});
