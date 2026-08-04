import React from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUpdateNotificationPreferences } from "@/hooks/mutations/notification-preferences/use-notification-preferences";
import useGetNotificationPreferences from "@/hooks/queries/notification-preferences/use-get-notification-preferences";
import { Button } from "../ui/button";

type NotificationEventPrefsState = {
  taskAssignmentEnabled: boolean;
  taskCommentEnabled: boolean;
  taskStatusChangeEnabled: boolean;
  dueDateReminderEnabled: boolean;
  dueDateReminderLeadAmount: number;
  dueDateReminderLeadUnit: "hours" | "days";
};

function ChannelToggle({
  checked,
  disabled,
  hint,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  disabled?: boolean;
  hint?: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = React.useId();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 space-y-0.5">
        <Label className="text-sm font-medium" htmlFor={id}>
          {label}
        </Label>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        id={id}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

// Delivery channels (email/ntfy/gotify/webhook) and per-workspace rules from
// the original app are not ported — they require external credentials this
// deployment doesn't have. These four toggles still gate whether an in-app
// notification is created at all, independent of delivery.
export function NotificationPreferencesSettings() {
  const { t } = useTranslation();
  const { data: preferences, isLoading } = useGetNotificationPreferences();
  const { mutateAsync: updatePreferences, isPending: isSavingPreferences } =
    useUpdateNotificationPreferences();

  const [eventPrefs, setEventPrefs] =
    React.useState<NotificationEventPrefsState>({
      taskAssignmentEnabled: true,
      taskCommentEnabled: true,
      taskStatusChangeEnabled: true,
      dueDateReminderEnabled: true,
      dueDateReminderLeadAmount: 1,
      dueDateReminderLeadUnit: "days",
    });

  React.useEffect(() => {
    if (!preferences) return;
    const leadMinutes = preferences.dueDateReminderLeadTimeMinutes;
    setEventPrefs({
      taskAssignmentEnabled: preferences.taskAssignmentEnabled,
      taskCommentEnabled: preferences.taskCommentEnabled,
      taskStatusChangeEnabled: preferences.taskStatusChangeEnabled,
      dueDateReminderEnabled: preferences.dueDateReminderEnabled,
      ...(leadMinutes > 0 && leadMinutes % 1440 === 0
        ? {
            dueDateReminderLeadAmount: leadMinutes / 1440,
            dueDateReminderLeadUnit: "days" as const,
          }
        : {
            dueDateReminderLeadAmount: Math.max(
              1,
              Math.round(leadMinutes / 60),
            ),
            dueDateReminderLeadUnit: "hours" as const,
          }),
    });
  }, [preferences]);

  const leadTimeMax = eventPrefs.dueDateReminderLeadUnit === "days" ? 30 : 720;
  const leadTimeValid =
    Number.isInteger(eventPrefs.dueDateReminderLeadAmount) &&
    eventPrefs.dueDateReminderLeadAmount >= 1 &&
    eventPrefs.dueDateReminderLeadAmount <= leadTimeMax;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 rounded-md border bg-sidebar p-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-medium">
            {t("settings:notificationsPage.eventPreferencesTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("settings:notificationsPage.eventPreferencesDescription")}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <ChannelToggle
            checked={eventPrefs.taskAssignmentEnabled}
            label={t("settings:notificationsPage.eventTaskAssignments")}
            onCheckedChange={(checked) =>
              setEventPrefs((current) => ({
                ...current,
                taskAssignmentEnabled: checked,
              }))
            }
          />
          <ChannelToggle
            checked={eventPrefs.taskCommentEnabled}
            hint={t("settings:notificationsPage.eventCommentsHint")}
            label={t("settings:notificationsPage.eventComments")}
            onCheckedChange={(checked) =>
              setEventPrefs((current) => ({
                ...current,
                taskCommentEnabled: checked,
              }))
            }
          />
          <ChannelToggle
            checked={eventPrefs.taskStatusChangeEnabled}
            label={t("settings:notificationsPage.eventStatusChanges")}
            onCheckedChange={(checked) =>
              setEventPrefs((current) => ({
                ...current,
                taskStatusChangeEnabled: checked,
              }))
            }
          />
          <ChannelToggle
            checked={eventPrefs.dueDateReminderEnabled}
            label={t("settings:notificationsPage.eventDueDateReminders")}
            onCheckedChange={(checked) =>
              setEventPrefs((current) => ({
                ...current,
                dueDateReminderEnabled: checked,
              }))
            }
          />
        </div>

        <div className="flex max-w-sm flex-col gap-1">
          <Label htmlFor="due-date-reminder-lead-time">
            {t("settings:notificationsPage.reminderLeadTimeLabel")}
          </Label>
          <div className="flex gap-2">
            <NumberField
              className="w-36"
              disabled={!eventPrefs.dueDateReminderEnabled}
              id="due-date-reminder-lead-time"
              max={leadTimeMax}
              min={1}
              onValueChange={(value) =>
                setEventPrefs((current) => ({
                  ...current,
                  dueDateReminderLeadAmount: value ?? 0,
                }))
              }
              step={1}
              value={eventPrefs.dueDateReminderLeadAmount}
            >
              <NumberFieldGroup>
                <NumberFieldDecrement />
                <NumberFieldInput />
                <NumberFieldIncrement />
              </NumberFieldGroup>
            </NumberField>
            <Select
              disabled={!eventPrefs.dueDateReminderEnabled}
              onValueChange={(unit) =>
                setEventPrefs((current) => ({
                  ...current,
                  dueDateReminderLeadUnit: unit as "hours" | "days",
                }))
              }
              value={eventPrefs.dueDateReminderLeadUnit}
            >
              <SelectTrigger className="w-32">
                <SelectValue>
                  {eventPrefs.dueDateReminderLeadUnit === "days"
                    ? t("settings:notificationsPage.reminderLeadTimeUnitDays")
                    : t("settings:notificationsPage.reminderLeadTimeUnitHours")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">
                  {t("settings:notificationsPage.reminderLeadTimeUnitHours")}
                </SelectItem>
                <SelectItem value="days">
                  {t("settings:notificationsPage.reminderLeadTimeUnitDays")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {eventPrefs.dueDateReminderEnabled && !leadTimeValid ? (
            <p className="text-xs text-destructive">
              {t("settings:notificationsPage.reminderLeadTimeInvalid", {
                max: leadTimeMax,
              })}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("settings:notificationsPage.reminderLeadTimeHint")}
            </p>
          )}
        </div>

        <div>
          <Button
            disabled={
              isSavingPreferences ||
              (eventPrefs.dueDateReminderEnabled && !leadTimeValid)
            }
            onClick={async () => {
              await updatePreferences({
                taskAssignmentEnabled: eventPrefs.taskAssignmentEnabled,
                taskCommentEnabled: eventPrefs.taskCommentEnabled,
                taskStatusChangeEnabled: eventPrefs.taskStatusChangeEnabled,
                dueDateReminderEnabled: eventPrefs.dueDateReminderEnabled,
                ...(eventPrefs.dueDateReminderEnabled
                  ? {
                      dueDateReminderLeadTimeMinutes:
                        eventPrefs.dueDateReminderLeadAmount *
                        (eventPrefs.dueDateReminderLeadUnit === "days"
                          ? 1440
                          : 60),
                    }
                  : {}),
              });
            }}
            type="button"
          >
            {t("settings:notificationsPage.saveEventPreferences")}
          </Button>
        </div>
      </div>
    </div>
  );
}
