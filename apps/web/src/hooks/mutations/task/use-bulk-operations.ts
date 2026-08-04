import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

export function useBulkOperations() {
  const deleteTask = useConvexMutation(api.task.deleteTask);
  const bulkUpdate = useConvexMutation(api.task.bulkUpdate);

  const bulkDelete = useMutation({
    mutationFn: async (taskIds: string[]) => {
      await Promise.all(
        taskIds.map((id) => deleteTask({ taskId: id as Id<"task"> })),
      );
    },
  });

  const bulkArchive = useMutation({
    mutationFn: async (taskIds: string[]) => {
      await bulkUpdate({
        taskIds: taskIds as Id<"task">[],
        operation: "updateStatus",
        value: "archived",
      });
    },
  });

  const bulkChangeStatus = useMutation({
    mutationFn: async ({
      taskIds,
      status,
    }: {
      taskIds: string[];
      status: string;
    }) => {
      await bulkUpdate({
        taskIds: taskIds as Id<"task">[],
        operation: "updateStatus",
        value: status,
      });
    },
  });

  const bulkAssign = useMutation({
    mutationFn: async ({
      taskIds,
      userId,
    }: {
      taskIds: string[];
      userId: string;
    }) => {
      await bulkUpdate({
        taskIds: taskIds as Id<"task">[],
        operation: "updateAssignee",
        value: userId,
      });
    },
  });

  const bulkMoveToBacklog = useMutation({
    mutationFn: async (taskIds: string[]) => {
      await bulkUpdate({
        taskIds: taskIds as Id<"task">[],
        operation: "updateStatus",
        value: "planned",
      });
    },
  });

  const bulkMoveToBoard = useMutation({
    mutationFn: async ({
      taskIds,
      status,
    }: {
      taskIds: string[];
      status: string;
    }) => {
      await bulkUpdate({
        taskIds: taskIds as Id<"task">[],
        operation: "updateStatus",
        value: status,
      });
    },
  });

  const bulkPriority = useMutation({
    mutationFn: async ({
      taskIds,
      priority,
    }: {
      taskIds: string[];
      priority: string;
    }) => {
      await bulkUpdate({
        taskIds: taskIds as Id<"task">[],
        operation: "updatePriority",
        value: priority,
      });
    },
  });

  const bulkAddLabel = useMutation({
    mutationFn: async ({
      taskIds,
      labelId,
    }: {
      taskIds: string[];
      labelId: string;
    }) => {
      await bulkUpdate({
        taskIds: taskIds as Id<"task">[],
        operation: "addLabel",
        value: labelId,
      });
    },
  });

  const bulkDueDate = useMutation({
    mutationFn: async ({
      taskIds,
      dueDate,
    }: {
      taskIds: string[];
      dueDate: string | null;
    }) => {
      await bulkUpdate({
        taskIds: taskIds as Id<"task">[],
        operation: "updateDueDate",
        value: dueDate,
      });
    },
  });

  return {
    bulkDelete: bulkDelete.mutateAsync,
    bulkArchive: bulkArchive.mutateAsync,
    bulkChangeStatus: bulkChangeStatus.mutateAsync,
    bulkAssign: bulkAssign.mutateAsync,
    bulkMoveToBacklog: bulkMoveToBacklog.mutateAsync,
    bulkMoveToBoard: bulkMoveToBoard.mutateAsync,
    bulkPriority: bulkPriority.mutateAsync,
    bulkAddLabel: bulkAddLabel.mutateAsync,
    bulkDueDate: bulkDueDate.mutateAsync,
  };
}
