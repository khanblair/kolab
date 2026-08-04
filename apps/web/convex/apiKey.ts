import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashKey(key: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(key),
  );
  return toHex(digest);
}

function generateRawKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `kolab_${toHex(bytes.buffer)}`;
}

// Returns the plaintext key exactly once — only `keyHash` is persisted, so
// there is no way to recover it later. There is deliberately no
// verification path (no HTTP action checks this hash): an API key here
// would authenticate against a REST surface that no longer exists now that
// apps/api is decommissioned.
export const create = mutation({
  args: {
    name: v.optional(v.string()),
    expiresIn: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const key = generateRawKey();
    const keyHash = await hashKey(key);
    const start = key.slice(0, 14);
    const expiresAt = args.expiresIn
      ? Date.now() + args.expiresIn * 1000
      : undefined;
    const createdAt = Date.now();

    const id = await ctx.db.insert("apiKey", {
      userId,
      name: args.name,
      keyHash,
      start,
      expiresAt,
      createdAt,
    });

    return {
      id,
      key,
      name: args.name ?? null,
      start,
      createdAt,
      expiresAt: expiresAt ?? null,
    };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const keys = await ctx.db
      .query("apiKey")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return keys
      .map((key) => ({
        id: key._id,
        name: key.name ?? null,
        start: key.start,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt ?? null,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const remove = mutation({
  args: { apiKeyId: v.id("apiKey") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const key = await ctx.db.get(args.apiKeyId);
    if (!key || key.userId !== userId) {
      throw new Error("API key not found");
    }
    await ctx.db.delete(args.apiKeyId);
  },
});
