import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/apng",
  "image/avif",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export function isImageContentType(contentType: string) {
  return ALLOWED_IMAGE_MIME_TYPES.has(contentType.toLowerCase());
}

export const MAX_ASSET_UPLOAD_BYTES = 10 * 1024 * 1024;

const ASSET_URL_PATTERN = /\/api\/asset\/([a-z0-9]+)/gi;

function extractAssetIds(content: string | null | undefined): Set<string> {
  const ids = new Set<string>();
  if (!content) return ids;
  ASSET_URL_PATTERN.lastIndex = 0;
  for (
    let match = ASSET_URL_PATTERN.exec(content);
    match !== null;
    match = ASSET_URL_PATTERN.exec(content)
  ) {
    if (match[1]) ids.add(match[1]);
  }
  return ids;
}

function contentReferencesAsset(
  content: string | null | undefined,
  assetId: string,
): boolean {
  return extractAssetIds(content).has(assetId.toLowerCase());
}

// Deletes assets whose URL disappeared from `oldContent` -> `newContent`,
// unless the same asset is still referenced elsewhere on the task
// (description, comments, or activity comments) — mirrors the original's
// cross-content orphan check.
export async function deleteOrphanedAssets(
  ctx: MutationCtx,
  oldContent: string | null | undefined,
  newContent: string | null | undefined,
  taskId: Id<"task">,
): Promise<void> {
  const oldIds = extractAssetIds(oldContent);
  const newIds = extractAssetIds(newContent);
  const removedIds = [...oldIds].filter((id) => !newIds.has(id));
  if (removedIds.length === 0) return;

  const [task, comments, activities] = await Promise.all([
    ctx.db.get(taskId),
    ctx.db
      .query("comment")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect(),
    ctx.db
      .query("activity")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect(),
  ]);

  const isReferencedElsewhere = (assetId: string) =>
    contentReferencesAsset(task?.description, assetId) ||
    comments.some((c) => contentReferencesAsset(c.content, assetId)) ||
    activities.some((a) => contentReferencesAsset(a.content, assetId));

  for (const rawId of removedIds) {
    if (isReferencedElsewhere(rawId)) continue;
    const assetId = ctx.db.normalizeId("asset", rawId);
    if (!assetId) continue;
    const asset = await ctx.db.get(assetId);
    if (!asset || asset.taskId !== taskId) continue;
    await ctx.storage.delete(asset.storageId);
    await ctx.db.delete(assetId);
  }
}

// Unconditional cleanup for full task deletion — no orphan check needed
// since every piece of content that could reference these assets is being
// deleted in the same mutation.
export async function deleteAllTaskAssets(
  ctx: MutationCtx,
  taskId: Id<"task">,
) {
  const assets = await ctx.db
    .query("asset")
    .withIndex("by_task", (q) => q.eq("taskId", taskId))
    .collect();
  for (const asset of assets) {
    await ctx.storage.delete(asset.storageId);
    await ctx.db.delete(asset._id);
  }
}
