import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

function useSignIn() {
  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
  });
}

export default useSignIn;
