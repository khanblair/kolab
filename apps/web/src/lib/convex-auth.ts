import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase-client";

// Bridges a Supabase session into Convex's ConvexProviderWithAuth contract:
// { isLoading, isAuthenticated, fetchAccessToken }. This is separate from
// the app-wide useAuth() (components/providers/auth-provider) — that one
// exposes the normalized `User`; this one exists only to hand Convex a JWT.
export function useSupabaseAuthForConvex() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(data.session !== null);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsAuthenticated(session !== null);
        setIsLoading(false);
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      const { data } = forceRefreshToken
        ? await supabase.auth.refreshSession()
        : await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    },
    [],
  );

  return { isLoading, isAuthenticated, fetchAccessToken };
}
