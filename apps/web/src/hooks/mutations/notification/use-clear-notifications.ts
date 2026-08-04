import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api } from "@/lib/convex-api";

function useClearNotifications() {
  const clearAll = useConvexMutation(api.notification.clearAll);

  return useMutation({
    mutationFn: () => clearAll({}),
  });
}

export default useClearNotifications;
