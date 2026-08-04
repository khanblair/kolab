export type Notification = {
  id: string;
  type: string;
  title?: string | null;
  content?: string | null;
  eventData?: unknown;
  resourceId?: string | null;
  resourceType?: string | null;
  isRead: boolean;
  createdAt: number;
};

export type NotificationEventData = Record<string, unknown> | null | undefined;
