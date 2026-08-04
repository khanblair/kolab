import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";

function useSignUp() {
  return useMutation({
    mutationFn: async ({
      email,
      password,
      name,
    }: {
      email: string;
      password: string;
      name: string;
    }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
  });
}

export default useSignUp;
