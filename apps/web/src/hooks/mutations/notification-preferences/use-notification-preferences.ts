import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import i18n from "i18next";
import { api } from "@/lib/convex-api";
import { toast } from "@/lib/toast";

export function useUpdateNotificationPreferences() {
  const updatePreferences = useConvexMutation(
    api.notification.updatePreferences,
  );

  return useMutation({
    mutationFn: (json: {
      taskAssignmentEnabled?: boolean;
      taskCommentEnabled?: boolean;
      taskStatusChangeEnabled?: boolean;
      dueDateReminderEnabled?: boolean;
      dueDateReminderLeadTimeMinutes?: number;
    }) => updatePreferences(json),
    onSuccess: () => {
      toast.success(i18n.t("settings:notificationsPage.toastPreferencesSaved"));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : i18n.t("settings:notificationsPage.toastPreferencesSaveFailed"),
      );
    },
  });
}
