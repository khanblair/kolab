import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

function useMarkNotificationAsRead() {
  const markAsRead = useConvexMutation(api.notification.markAsRead);

  return useMutation({
    mutationFn: (id: string) =>
      markAsRead({ notificationId: id as Id<"notification"> }),
  });
}

export default useMarkNotificationAsRead;
