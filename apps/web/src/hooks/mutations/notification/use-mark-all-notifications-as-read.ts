import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api } from "@/lib/convex-api";

function useMarkAllNotificationsAsRead() {
  const markAllAsRead = useConvexMutation(api.notification.markAllAsRead);

  return useMutation({
    mutationFn: () => markAllAsRead({}),
  });
}

export default useMarkAllNotificationsAsRead;
