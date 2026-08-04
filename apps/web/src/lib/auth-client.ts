import { apiKeyClient } from "@better-auth/api-key/client";
import {
  adminClient,
  anonymousClient,
  deviceAuthorizationClient,
  emailOTPClient,
  genericOAuthClient,
  inferAdditionalFields,
  lastLoginMethodClient,
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, admin, member, owner, viewer } from "./permissions";

// VITE_API_URL is baked in at build time. Self-hosted Docker builds
// intentionally ship a literal "KOLAB_API_URL" placeholder (see
// apps/web/.env.production) that env.sh text-substitutes for the real
// value at container startup. On deployments with no such entrypoint
// (e.g. Vercel), that substitution never happens and the placeholder
// reaches the browser as-is — new URL() on it throws, and since
// createAuthClient() validates its baseURL eagerly, an unguarded fallback
// here would crash the whole app at module load. Falling back to the
// current origin keeps construction safe in every case; Better Auth
// requests only ever fail at request time, same as they already do today.
const getBaseURL = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:1337";
  try {
    const url = new URL(apiUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return window.location.origin;
  }
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  basePath: "/api/auth",
  plugins: [
    anonymousClient(),
    lastLoginMethodClient(),
    magicLinkClient(),
    emailOTPClient(),
    organizationClient({
      ac,
      roles: {
        viewer,
        member,
        admin,
        owner,
      },
      dynamicAccessControl: {
        enabled: true,
      },
    }),
    genericOAuthClient(),
    deviceAuthorizationClient(),
    apiKeyClient(),
    adminClient(),
    inferAdditionalFields({
      user: {
        locale: {
          type: "string",
          required: false,
          input: true,
        },
      },
    }),
  ],
});
