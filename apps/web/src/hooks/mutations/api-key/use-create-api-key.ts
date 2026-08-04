import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api } from "@/lib/convex-api";
import type { CreateApiKeyClientRequest } from "@/types/api-key";

function useCreateApiKey() {
  const createApiKey = useConvexMutation(api.apiKey.create);

  return useMutation({
    mutationFn: (data: CreateApiKeyClientRequest) =>
      createApiKey({ name: data.name, expiresIn: data.expiresIn }),
  });
}

export default useCreateApiKey;
