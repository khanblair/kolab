import { useQuery } from "convex/react";
import { api, type Doc, type Id } from "@/lib/convex-api";

type ActivityFeedItem = {
  id: string;
  type: string;
  content: string | null;
  eventData?: unknown;
  createdAt: string;
  userId: string | null;
  taskId: string;
  externalUserName?: string | null;
  externalUserAvatar?: string | null;
  externalSource?: string | null;
  externalUrl?: string | null;
};

function commentToActivityItem(comment: Doc<"comment">): ActivityFeedItem {
  return {
    id: comment._id,
    type: "comment",
    content: comment.content,
    createdAt: new Date(comment.createdAt).toISOString(),
    userId: comment.userId,
    taskId: comment.taskId,
  };
}

function activityToActivityItem(activity: Doc<"activity">): ActivityFeedItem {
  return {
    id: activity._id,
    type: activity.type,
    content: activity.content ?? null,
    eventData: activity.eventData,
    createdAt: new Date(activity.createdAt).toISOString(),
    userId: activity.userId ?? null,
    taskId: activity.taskId,
    externalUserName: activity.externalUserName,
    externalUserAvatar: activity.externalUserAvatar,
    externalSource: activity.externalSource,
    externalUrl: activity.externalUrl,
  };
}

// Convex splits comments (own table) and activity-log rows (status/priority/
// etc. changes) into two queries; the original app modeled comments as
// activity rows with type="comment", so the UI still expects one merged,
// newest-first feed.
function useGetActivitiesByTaskId(taskId: string) {
  const args = taskId ? { taskId: taskId as Id<"task"> } : "skip";
  const comments = useQuery(api.comment.list, args);
  const activities = useQuery(api.activity.list, args);

  const ready = comments !== undefined && activities !== undefined;
  const data = ready
    ? [
        ...comments.map(commentToActivityItem),
        ...activities.map(activityToActivityItem),
      ].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    : undefined;

  return {
    data,
    isLoading: Boolean(taskId) && !ready,
    isError: false,
  };
}

export default useGetActivitiesByTaskId;
