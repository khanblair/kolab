import type { User as SupabaseUser } from "@supabase/supabase-js";

// Normalized shape the rest of the app consumes, independent of which auth
// provider is behind it. Kept close to the old Better Auth shape so
// downstream components didn't need to change.
export type User = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified: boolean;
  locale?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toAppUser(supabaseUser: SupabaseUser): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    name:
      (supabaseUser.user_metadata?.name as string | undefined) ??
      supabaseUser.email ??
      "",
    image:
      (supabaseUser.user_metadata?.avatar_url as string | undefined) ?? null,
    emailVerified: Boolean(supabaseUser.email_confirmed_at),
    locale: (supabaseUser.user_metadata?.locale as string | undefined) ?? null,
    createdAt: new Date(supabaseUser.created_at),
    updatedAt: new Date(supabaseUser.updated_at ?? supabaseUser.created_at),
  };
}
