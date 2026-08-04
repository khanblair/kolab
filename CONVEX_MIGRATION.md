# Migration scope: apps/api + data layer → Convex

Supersedes `EDGE_FUNCTIONS_MIGRATION.md` (deleted). Final split: **Convex**
for app data, file storage, real-time, and scheduling. **Supabase Auth**
for authentication — replacing Better Auth entirely, not just its storage
backend. Rejected `@convex-dev/better-auth` because its officially supported
plugin list doesn't include the `apiKey` plugin or device-authorization flow
(unconfirmed/manual-integration territory), and those back Kaneo's Bearer
token API access and MCP OAuth.

**Consequence:** Supabase Auth doesn't have a generic API-key or
device-authorization feature either — nothing does out of the box. That work
(hashed key storage/validation, device-code flow for MCP) has to be
hand-built regardless of which auth product we pick. Picking Supabase Auth
over Better Auth doesn't remove this work, it just means building it as
Convex tables/functions instead of trying to bolt it onto an unsupported
plugin.

**Also drops the earlier Supabase Postgres setup.** Supabase Auth manages
its own internal user/session tables — we don't run our own Postgres schema
against it. The `DATABASE_URL` session-pooler connection wired up earlier is
no longer needed; what's needed instead is the Supabase project URL + anon
key (client) + service role key (server, to verify sessions).

**Honest size check:** this is bigger than the Edge Functions plan. That one
touched the runtime and a few dependencies. This one rewrites the data model,
every controller, the real-time layer, and how the frontend fetches data.
Free and no separate always-on server, but it's close to rebuilding the
backend, not porting it.

## Confirmed feasible (verified against current Convex docs)
- Free tier: 1M function calls/month, forever free, includes real-time sync
  and auth at no extra cost.
- Real-time has no WebSocket time cap — Convex manages the sync protocol
  itself, unlike Edge Functions' 150s-alive limit.
- Native cron (`crons.interval()`, seconds-level granularity) replaces the
  scheduler cleanly.
- `bcrypt` is usable via a Node action (`"use node"` directive), marked
  external in `convex.json` — not blocked like it was on Deno/Edge Functions.

## Touch points

**Data model**
- `apps/api/src/database/schema.ts` (32 tables, 1072 lines) → Convex
  `schema.ts` (`defineSchema`/`defineTable`), document model not relational.
- `apps/api/src/database/relations.ts` (394 lines) → no direct equivalent;
  joins become explicit lookups/indexes inside individual functions instead
  of one central file.
- Every controller under `apps/api/src/{feature}/controllers/` → rewritten
  as Convex `query`/`mutation`/`action` functions.
- `drizzle-kit migrate` workflow → gone; Convex deploys schema changes
  directly (`npx convex deploy`), different mental model for evolving data.

**Auth (replaces Better Auth entirely, not just its storage)**
- `apps/api/src/auth.ts` (`betterAuth(...)`, `drizzleAdapter`, all plugins) →
  removed. Replaced by Supabase Auth's client/server SDKs.
- `c.get("userId")` / `c.get("user")` / `c.get("session")` — used across
  every route handler — → Supabase JWT verification per request instead.
- `apps/web/src/lib/auth-client` (Better Auth client) → Supabase's
  `@supabase/supabase-js` auth client.
- SSO (GitHub/Google/Discord) → reconfigured as Supabase Auth providers,
  not Better Auth `socialProviders`.
- API keys (Bearer token access) and MCP device-auth flow → hand-built as
  Convex tables + functions (hashed key storage/lookup, device-code
  request/poll/exchange). Net-new implementation, not a port.
- `bcrypt` → no longer needed; Supabase Auth owns password hashing.

**Storage**
- `apps/api/src/storage/s3.ts` (AWS SDK S3 client) → Convex's native file
  storage (`ctx.storage.store()`/`getUrl()`/`generateUploadUrl()`) — a
  different upload flow than presigned S3 URLs.
- `S3_*` env vars, Supabase Storage, and the S3-compatible-provider story
  (MinIO/AWS S3/R2) → all removed.

**Real-time**
- `apps/api/src/ws/*` (native WebSocket server + Redis broadcast adapter) →
  removed entirely.
- `use-project-websocket.ts` / `use-user-websocket.ts` → removed; frontend
  gets live updates automatically via Convex's `useQuery` reactivity.
- `REDIS_URL` and the Redis pub/sub layer → gone, not needed.

**Scheduler**
- `initializeScheduler()` (`setInterval`) → Convex `crons.ts`.

**Frontend data layer (the part easy to underweight)**
- `apps/web/src/fetchers/*` (REST calls via `fetch`) + TanStack Query hooks
  → Convex's own client hooks (`useQuery`/`useMutation` from `convex/
  react`). Different paradigm, not a drop-in — this is the single largest
  touch point outside the backend rewrite itself.
- Valibot request/response schemas → Convex's own validator system
  (`convex/values`), a different API surface, ported per-function.
- `hono-openapi` / `describeRoute` API docs generation → no direct
  equivalent, goes away.

**Integrations**
- GitHub/Slack/Discord/Telegram/Gitea webhook handlers, generic webhooks,
  MCP routes (`packages/mcp`) → rebuilt as Convex `httpAction`s (Convex's
  raw-HTTP-endpoint escape hatch), one by one.

## Not affected
- UI components, styling, TanStack Router itself (route structure, not
  route data-loading).
- Anything that doesn't touch data-fetching or real-time.
