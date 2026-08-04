import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { withId } from "@/lib/convex-ids";

function useGetNotifications() {
  const notifications = useQuery(api.notification.list, {});
  return {
    data: notifications?.map(withId),
    isLoading: notifications === undefined,
  };
}

export default useGetNotifications;
