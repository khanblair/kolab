import { query } from "./_generated/server";

// Verifies the Supabase Auth -> Convex JWT chain end to end: returns the
// identity Convex resolved from the request's bearer token, or null if
// unauthenticated / the token didn't verify.
export const whoAmI = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.auth.getUserIdentity();
  },
});
