import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

export type TaskToImport = {
  title: string;
  description?: string;
  status: string;
  priority?: string;
  startDate?: string;
  dueDate?: string;
  userId?: string | null;
};

const useImportTasks = () => {
  const importTasks = useConvexMutation(api.task.importTasks);

  return useMutation({
    mutationFn: ({
      projectId,
      tasks,
    }: {
      projectId: string;
      tasks: TaskToImport[];
    }) =>
      importTasks({
        projectId: projectId as Id<"project">,
        tasks,
      }),
  });
};

export default useImportTasks;
