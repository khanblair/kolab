import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

function useDeleteLabel() {
  const removeLabel = useConvexMutation(api.label.remove);

  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      removeLabel({ labelId: id as Id<"label"> }),
  });
}

export default useDeleteLabel;
