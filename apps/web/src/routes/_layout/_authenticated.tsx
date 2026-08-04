import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { supabase } from "@/lib/supabase-client";

function isNotAuthenticatedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /not authenticated/i.test(message);
}

// protects all child routes, must be logged in
export const Route = createFileRoute("/_layout/_authenticated")({
  beforeLoad: async ({ location }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({
        to: "/auth/sign-in",
        search: {
          redirect: location.pathname,
        },
      });
    }
    return { session };
  },
  component: AuthenticatedLayout,
  errorComponent: AuthenticatedErrorBoundary,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();

  // beforeLoad only runs on navigation into this subtree — it can't catch a
  // session that goes invalid (expiry, revoked refresh token, sign-out in
  // another tab) while already mounted here. Without this, Convex queries
  // keep firing with no valid identity and throw "Not authenticated" into
  // the render tree instead of the user ever seeing a sign-in screen.
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          navigate({
            to: "/auth/sign-in",
            search: { redirect: window.location.pathname },
          });
        }
      },
    );
    return () => subscription.subscription.unsubscribe();
  }, [navigate]);

  return <Outlet />;
}

// Belt-and-suspenders for the same case: if a Convex query still manages to
// throw "Not authenticated" before the listener above redirects, don't show
// TanStack Router's generic crash screen — send the user to sign-in instead.
// Anything else (a real bug) still surfaces normally.
function AuthenticatedErrorBoundary({ error }: { error: unknown }) {
  const navigate = useNavigate();
  const isAuthError = isNotAuthenticatedError(error);

  useEffect(() => {
    if (isAuthError) {
      navigate({
        to: "/auth/sign-in",
        search: { redirect: window.location.pathname },
      });
    }
  }, [isAuthError, navigate]);

  if (isAuthError) {
    return <LoadingSkeleton />;
  }

  throw error;
}
