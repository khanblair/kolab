import { useMutation } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import { api, type Id } from "@/lib/convex-api";

const useExportTasks = () => {
  const convex = useConvex();

  return useMutation({
    mutationFn: (projectId: string) =>
      convex.query(api.task.exportTasks, {
        projectId: projectId as Id<"project">,
      }),
  });
};

export default useExportTasks;
