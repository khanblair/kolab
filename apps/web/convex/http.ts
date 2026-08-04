import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { ALLOWED_IMAGE_MIME_TYPES } from "./lib/assets";

function buildContentDisposition(filename: string, inline: boolean) {
  const normalized = filename
    .normalize("NFC")
    .replace(/[\r\n"]/g, "")
    .trim();
  const safeFilename = normalized || "file";
  const combiningDiacritics = /[\u0300-\u036f]/g;
  const asciiFallback =
    safeFilename
      .normalize("NFKD")
      .replace(combiningDiacritics, "")
      .replace(/[\\/]/g, "-")
      .replace(/[^\x20-\x7E]+/g, "_")
      .replace(/\s+/g, " ")
      .trim() || "file";
  const encodedFilename = encodeURIComponent(safeFilename).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  const disposition = inline ? "inline" : "attachment";
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`;
}

const http = httpRouter();

// Deliberately unauthenticated — see the schema comment on the `asset`
// table. Content-Disposition/nosniff still guard against stored XSS via a
// non-image upload (e.g. a renamed .svg or .html) rendering inline.
http.route({
  pathPrefix: "/api/asset/",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const id = new URL(req.url).pathname.split("/").pop() ?? "";
    const asset = await ctx.runQuery(internal.asset.getForServing, {
      assetId: id,
    });
    if (!asset) {
      return new Response("Not found", { status: 404 });
    }

    const blob = await ctx.storage.get(asset.storageId);
    if (!blob) {
      return new Response("Not found", { status: 404 });
    }

    const storedContentType =
      (blob.type || asset.mimeType).toLowerCase().split(";")[0]?.trim() ?? "";
    const inline = ALLOWED_IMAGE_MIME_TYPES.has(storedContentType);

    return new Response(blob, {
      headers: {
        "Content-Type": inline ? storedContentType : "application/octet-stream",
        "Content-Disposition": buildContentDisposition(asset.filename, inline),
        "Cache-Control": "private, max-age=120",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }),
});

export default http;
