import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";
import { toTask } from "@/lib/to-task";

type CreateTaskRequest = {
  title: string;
  description?: string;
  userId?: string;
  projectId: string;
  status?: string;
  startDate?: Date;
  dueDate?: Date;
  priority?: string;
};

function useCreateTask() {
  const createTask = useConvexMutation(api.task.create);

  return useMutation({
    mutationFn: async ({
      title,
      description,
      userId,
      projectId,
      status,
      startDate,
      dueDate,
      priority,
    }: CreateTaskRequest) => {
      const task = await createTask({
        projectId: projectId as Id<"project">,
        title,
        description: description || undefined,
        status,
        priority: priority as
          | "no-priority"
          | "low"
          | "medium"
          | "high"
          | "urgent"
          | undefined,
        assigneeId: userId || undefined,
        startDate: startDate?.getTime(),
        dueDate: dueDate?.getTime(),
      });
      if (!task) throw new Error("Failed to create task");
      return toTask(task);
    },
  });
}

export default useCreateTask;
