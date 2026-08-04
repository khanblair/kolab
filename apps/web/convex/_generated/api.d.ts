/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as apiKey from "../apiKey.js";
import type * as asset from "../asset.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as column from "../column.js";
import type * as comment from "../comment.js";
import type * as crons from "../crons.js";
import type * as externalLink from "../externalLink.js";
import type * as http from "../http.js";
import type * as label from "../label.js";
import type * as lib_activity from "../lib/activity.js";
import type * as lib_assets from "../lib/assets.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_mentions from "../lib/mentions.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as notification from "../notification.js";
import type * as project from "../project.js";
import type * as task from "../task.js";
import type * as taskRelation from "../taskRelation.js";
import type * as timeEntry from "../timeEntry.js";
import type * as workspace from "../workspace.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  apiKey: typeof apiKey;
  asset: typeof asset;
  auth: typeof auth;
  billing: typeof billing;
  column: typeof column;
  comment: typeof comment;
  crons: typeof crons;
  externalLink: typeof externalLink;
  http: typeof http;
  label: typeof label;
  "lib/activity": typeof lib_activity;
  "lib/assets": typeof lib_assets;
  "lib/auth": typeof lib_auth;
  "lib/mentions": typeof lib_mentions;
  "lib/notifications": typeof lib_notifications;
  notification: typeof notification;
  project: typeof project;
  task: typeof task;
  taskRelation: typeof taskRelation;
  timeEntry: typeof timeEntry;
  workspace: typeof workspace;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
