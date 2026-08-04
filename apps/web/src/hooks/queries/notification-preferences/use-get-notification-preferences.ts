import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";

function useGetNotificationPreferences() {
  const preferences = useQuery(api.notification.getPreferences, {});
  return { data: preferences, isLoading: preferences === undefined };
}

export default useGetNotificationPreferences;
