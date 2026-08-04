import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

type UpdateLabelRequest = {
  id: string;
  name?: string;
  color?: string;
};

function useUpdateLabel() {
  const updateLabel = useConvexMutation(api.label.update);

  return useMutation({
    mutationFn: ({ id, name, color }: UpdateLabelRequest) =>
      updateLabel({ labelId: id as Id<"label">, name, color }),
  });
}

export default useUpdateLabel;
