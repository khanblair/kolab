import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

function useDeleteApiKey() {
  const removeApiKey = useConvexMutation(api.apiKey.remove);

  return useMutation({
    mutationFn: (keyId: string) =>
      removeApiKey({ apiKeyId: keyId as Id<"apiKey"> }),
  });
}

export default useDeleteApiKey;
