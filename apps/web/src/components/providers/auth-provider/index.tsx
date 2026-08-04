import {
  createContext,
  type PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase-client";
import { toAppUser, type User } from "@/types/user";
import { LoadingSkeleton } from "../../ui/loading-skeleton";

export const AuthContext = createContext<{
  user: User | null | undefined;
  isLoading: boolean;
}>({
  user: undefined,
  isLoading: true,
});

function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  // Same reasoning as the previous Better Auth provider: only show the
  // loading skeleton on the *first* session fetch, not on every background
  // refresh, or an alt-tab would unmount the whole route tree.
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ? toAppUser(data.session.user) : null);
      setIsLoading(false);
      hasLoadedOnce.current = true;
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ? toAppUser(session.user) : null);
        if (!hasLoadedOnce.current) {
          setIsLoading(false);
          hasLoadedOnce.current = true;
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  if (isLoading && !hasLoadedOnce.current) {
    return <LoadingSkeleton />;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
