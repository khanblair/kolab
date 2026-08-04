import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { withId } from "@/lib/convex-ids";

function useGetApiKeys() {
  const keys = useQuery(api.apiKey.list, {});
  return { data: keys?.map(withId), isLoading: keys === undefined };
}

export default useGetApiKeys;
