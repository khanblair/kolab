import { api, type Id } from "@/lib/convex-api";
import { getAssetUrl } from "@/lib/convex-asset-url";
import { convex } from "@/lib/convex-client";

const allowedImageMimeTypes = new Set([
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

type UploadSurface = "description" | "comment";

export function isSupportedImageFile(file: File) {
  return allowedImageMimeTypes.has(file.type.toLowerCase());
}

export function isSupportedTaskAsset(file: File) {
  return file.size > 0;
}

export function getImageAltText(filename: string) {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

export async function uploadTaskImage({
  taskId,
  surface,
  file,
}: {
  taskId: string;
  surface: UploadSurface;
  file: File;
}) {
  if (!isSupportedImageFile(file) && !isSupportedTaskAsset(file)) {
    throw new Error("Only non-empty file uploads are supported.");
  }

  const uploadUrl = await convex.mutation(api.asset.generateUploadUrl, {
    taskId: taskId as Id<"task">,
  });

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload file to storage.");
  }

  const { storageId } = await uploadResponse.json();

  const { id } = await convex.mutation(api.asset.finalizeUpload, {
    taskId: taskId as Id<"task">,
    storageId,
    filename: file.name || "image",
    surface,
  });

  return {
    url: getAssetUrl(id),
    alt: getImageAltText(file.name || "image"),
    filename: file.name || "file",
    kind: isSupportedImageFile(file) ? "image" : "attachment",
    mimeType: file.type,
    size: file.size,
  };
}
