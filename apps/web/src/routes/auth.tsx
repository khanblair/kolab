import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase-client";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      throw redirect({
        to: "/dashboard",
      });
    }
    return { session };
  },
});
