import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api, type Id } from "@/lib/convex-api";
import { withId } from "@/lib/convex-ids";
import { toast } from "@/lib/toast";

export function useMoveTask() {
  const { t } = useTranslation();
  const moveTask = useConvexMutation(api.task.move);

  return useMutation({
    mutationFn: async ({
      taskId,
      destinationProjectId,
      destinationStatus,
    }: {
      taskId: string;
      destinationProjectId: string;
      destinationStatus?: string;
    }) => {
      const task = await moveTask({
        taskId: taskId as Id<"task">,
        destinationProjectId: destinationProjectId as Id<"project">,
        destinationStatus,
      });
      if (!task) throw new Error("Failed to move task");
      return { task: withId(task) };
    },
    onSuccess: () => {
      toast.success(t("tasks:move.success"));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("tasks:move.error"),
      );
    },
  });
}
