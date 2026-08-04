import { useQuery } from "convex/react";
import { useMemo } from "react";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import { composeProjectWithTasks } from "@/lib/compose-project-with-tasks";
import { api, type Id } from "@/lib/convex-api";

export function useGetTasks(projectId: string) {
  const { data: workspace } = useActiveWorkspace();

  const projectArgs = projectId
    ? { projectId: projectId as Id<"project"> }
    : "skip";
  const project = useQuery(api.project.get, projectArgs);
  const columns = useQuery(api.column.list, projectArgs);
  const tasks = useQuery(api.task.list, projectArgs);
  const members = useQuery(
    api.workspace.listMembers,
    workspace?.id ? { workspaceId: workspace.id } : "skip",
  );

  const ready =
    Boolean(projectId) &&
    project !== undefined &&
    columns !== undefined &&
    tasks !== undefined &&
    (!workspace?.id || members !== undefined);

  // Convex's useQuery only returns a new reference when the underlying data
  // actually changes, so memoizing on these keeps `data`'s identity stable
  // across unrelated re-renders — without this, board.tsx's
  // `useEffect(() => setProject(data), [data])` fires on every render and
  // stomps the drag handler's own optimistic Zustand update mid-drag.
  const data = useMemo(
    () =>
      ready
        ? composeProjectWithTasks(
            // biome-ignore lint/style/noNonNullAssertion: narrowed by `ready`
            project!,
            // biome-ignore lint/style/noNonNullAssertion: narrowed by `ready`
            columns!,
            // biome-ignore lint/style/noNonNullAssertion: narrowed by `ready`
            tasks!,
            members ?? [],
          )
        : undefined,
    [ready, project, columns, tasks, members],
  );

  return {
    data,
    isLoading: Boolean(projectId) && !ready,
    isError: false,
  };
}
