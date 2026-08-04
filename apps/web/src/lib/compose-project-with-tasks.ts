import type { Doc } from "@/lib/convex-api";
import { toTask } from "@/lib/to-task";
import type { ProjectWithTasks } from "@/types/project";

type ProjectDoc = Doc<"project"> & {
  statistics: {
    totalTasks: number;
    completionPercentage: number;
    dueDate?: number;
  };
};

// The single adapter that keeps every kanban-board component (Column,
// TaskCard, ColumnDropzone, ListView, TaskRelations, ...) working
// unchanged against Convex's normalized tables — see the Phase 3 research
// note on why this shape exists.
export function composeProjectWithTasks(
  project: ProjectDoc,
  columns: Doc<"column">[],
  tasks: Doc<"task">[],
  members: Doc<"workspaceUser">[],
): ProjectWithTasks {
  const memberByUserId = new Map(members.map((m) => [m.userId, m]));
  const allTasks = tasks.map((t) =>
    toTask(t, (t.assigneeId && memberByUserId.get(t.assigneeId)?.name) || null),
  );

  const composedColumns = [...columns]
    .sort((a, b) => a.position - b.position)
    .map((col) => ({
      ...col,
      id: col._id,
      tasks: allTasks
        .filter((t) => t.columnId === col._id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    }));

  const plannedTasks = allTasks.filter(
    (t) => !t.columnId && t.status === "planned",
  );
  const archivedTasks = allTasks.filter(
    (t) => !t.columnId && t.status === "archived",
  );

  return {
    ...project,
    id: project._id,
    columns: composedColumns,
    plannedTasks,
    archivedTasks,
  } as unknown as ProjectWithTasks;
}
