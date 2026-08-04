import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { ensureTaskLabelCopy } from "./label";
import { logActivity } from "./lib/activity";
import { deleteAllTaskAssets, deleteOrphanedAssets } from "./lib/assets";
import {
  requireProjectMember,
  requireTaskMember,
  requireUserId,
  requireWorkspaceMember,
} from "./lib/auth";
import { parseMentionIds } from "./lib/mentions";
import { createNotification } from "./lib/notifications";

async function clearReminderState(ctx: MutationCtx, taskId: Id<"task">) {
  const sent = await ctx.db
    .query("taskReminderSent")
    .withIndex("by_task_and_type", (q) => q.eq("taskId", taskId))
    .collect();
  for (const row of sent) {
    await ctx.db.delete(row._id);
  }
}

// Notifies members newly @mentioned by a description edit — skips anyone
// already mentioned in the previous description, and the editor themselves.
async function notifyNewlyMentioned(
  ctx: MutationCtx,
  args: {
    oldContent: string | undefined;
    newContent: string | undefined;
    editorId: string;
    taskId: Id<"task">;
    taskTitle: string;
    projectId: Id<"project">;
    workspaceId: Id<"workspace">;
  },
) {
  const alreadyMentioned = new Set(parseMentionIds(args.oldContent));
  const newlyMentioned = parseMentionIds(args.newContent).filter(
    (id) => id !== args.editorId && !alreadyMentioned.has(id),
  );
  for (const mentionedId of newlyMentioned) {
    await createNotification(ctx, {
      userId: mentionedId,
      type: "task_mention",
      eventData: {
        taskTitle: args.taskTitle,
        projectId: args.projectId,
        workspaceId: args.workspaceId,
      },
      resourceId: args.taskId,
      resourceType: "task",
    });
  }
}

const priorityValidator = v.union(
  v.literal("no-priority"),
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("urgent"),
);

// Resolves a status string to the matching column in the project (by slug),
// or undefined for a virtual status ("planned"/"archived"/anything with no
// matching column).
async function resolveColumn(
  ctx: MutationCtx,
  projectId: Id<"project">,
  status: string,
) {
  const columns = await ctx.db
    .query("column")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  return columns.find((c) => c.slug === status);
}

async function nextPositionInColumn(
  ctx: MutationCtx,
  columnId: Id<"column"> | undefined,
) {
  if (!columnId) return 0;
  const last = await ctx.db
    .query("task")
    .withIndex("by_column_and_position", (q) => q.eq("columnId", columnId))
    .order("desc")
    .first();
  return last ? last.position + 1 : 0;
}

async function claimTaskNumber(ctx: MutationCtx, projectId: Id<"project">) {
  const project = await ctx.db.get(projectId);
  if (!project) throw new Error("Project not found");
  const number = project.lastTaskNumber + 1;
  await ctx.db.patch(projectId, { lastTaskNumber: number });
  return number;
}

export const create = mutation({
  args: {
    projectId: v.id("project"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    priority: v.optional(priorityValidator),
    assigneeId: v.optional(v.string()),
    startDate: v.optional(v.number()),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, project } = await requireProjectMember(ctx, args.projectId);
    const status = args.status ?? "to-do";
    const column = await resolveColumn(ctx, args.projectId, status);
    const position = await nextPositionInColumn(ctx, column?._id);
    const number = await claimTaskNumber(ctx, args.projectId);
    const now = Date.now();

    const taskId = await ctx.db.insert("task", {
      projectId: args.projectId,
      columnId: column?._id,
      position,
      number,
      assigneeId: args.assigneeId,
      title: args.title,
      description: args.description,
      status,
      priority: args.priority ?? "no-priority",
      startDate: args.startDate,
      dueDate: args.dueDate,
      createdAt: now,
      updatedAt: now,
    });

    await logActivity(ctx, {
      taskId,
      type: "created",
      userId,
      eventData: {},
    });

    if (args.assigneeId && args.assigneeId !== userId) {
      await createNotification(ctx, {
        userId: args.assigneeId,
        type: "task_created",
        eventData: {
          taskTitle: args.title,
          projectId: args.projectId,
          workspaceId: project.workspaceId,
        },
        resourceId: taskId,
        resourceType: "task",
      });
    }

    return await ctx.db.get(taskId);
  },
});

// Shared with task.bulkUpdate — takes already-fetched task/project docs so
// a bulk operation over many tasks doesn't refetch on every iteration.
async function applyStatusChange(
  ctx: MutationCtx,
  userId: string,
  task: Doc<"task">,
  project: Doc<"project">,
  status: string,
) {
  const oldStatus = task.status;
  const column = await resolveColumn(ctx, task.projectId, status);
  await ctx.db.patch(task._id, {
    status,
    columnId: column?._id,
    updatedAt: Date.now(),
  });
  await logActivity(ctx, {
    taskId: task._id,
    type: "status_changed",
    userId,
    eventData: { oldStatus, newStatus: status },
  });
  if (task.assigneeId && task.assigneeId !== userId) {
    await createNotification(ctx, {
      userId: task.assigneeId,
      type: "task_status_changed",
      eventData: {
        taskTitle: task.title,
        oldStatus,
        newStatus: status,
        projectId: task.projectId,
        workspaceId: project.workspaceId,
      },
      resourceId: task._id,
      resourceType: "task",
    });
  }
}

export const updateStatus = mutation({
  args: { taskId: v.id("task"), status: v.string() },
  handler: async (ctx, args) => {
    const { userId, task, project } = await requireTaskMember(ctx, args.taskId);
    await applyStatusChange(ctx, userId, task, project, args.status);
  },
});

// Drag-and-drop: reorder within a column (same columnId, new position) or
// move across columns (new columnId). Takes a real columnId rather than a
// status string, since the frontend always has the column doc already
// rendered — this sidesteps the slug-vs-id ambiguity `updateStatus` has.
export const updatePosition = mutation({
  args: {
    taskId: v.id("task"),
    columnId: v.id("column"),
    position: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, task, project } = await requireTaskMember(ctx, args.taskId);
    const column = await ctx.db.get(args.columnId);
    if (!column || column.projectId !== task.projectId) {
      throw new Error("Column does not belong to this task's project");
    }
    const oldStatus = task.status;
    await ctx.db.patch(args.taskId, {
      columnId: args.columnId,
      status: column.slug,
      position: args.position,
      updatedAt: Date.now(),
    });
    if (column.slug !== oldStatus) {
      await logActivity(ctx, {
        taskId: args.taskId,
        type: "status_changed",
        userId,
        eventData: { oldStatus, newStatus: column.slug },
      });
      if (task.assigneeId && task.assigneeId !== userId) {
        await createNotification(ctx, {
          userId: task.assigneeId,
          type: "task_status_changed",
          eventData: {
            taskTitle: task.title,
            oldStatus,
            newStatus: column.slug,
            projectId: task.projectId,
            workspaceId: project.workspaceId,
          },
          resourceId: args.taskId,
          resourceType: "task",
        });
      }
    }
  },
});

async function applyAssigneeChange(
  ctx: MutationCtx,
  userId: string,
  task: Doc<"task">,
  project: Doc<"project">,
  assigneeId: string | null,
) {
  if ((task.assigneeId ?? null) === assigneeId) return;
  await ctx.db.patch(task._id, {
    assigneeId: assigneeId ?? undefined,
    updatedAt: Date.now(),
  });
  await logActivity(ctx, {
    taskId: task._id,
    type: assigneeId ? "assignee_changed" : "unassigned",
    userId,
    eventData: assigneeId ? { newAssigneeId: assigneeId } : {},
  });
  if (assigneeId && assigneeId !== userId) {
    await createNotification(ctx, {
      userId: assigneeId,
      type: "task_assignee_changed",
      eventData: {
        taskTitle: task.title,
        projectId: task.projectId,
        workspaceId: project.workspaceId,
      },
      resourceId: task._id,
      resourceType: "task",
    });
  }
}

export const updateAssignee = mutation({
  args: { taskId: v.id("task"), assigneeId: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const { userId, task, project } = await requireTaskMember(ctx, args.taskId);
    await applyAssigneeChange(ctx, userId, task, project, args.assigneeId);
  },
});

async function applyPriorityChange(
  ctx: MutationCtx,
  userId: string,
  task: Doc<"task">,
  priority: Doc<"task">["priority"],
) {
  const oldPriority = task.priority;
  await ctx.db.patch(task._id, {
    priority,
    updatedAt: Date.now(),
  });
  await logActivity(ctx, {
    taskId: task._id,
    type: "priority_changed",
    userId,
    eventData: { oldPriority, newPriority: priority },
  });
}

export const updatePriority = mutation({
  args: { taskId: v.id("task"), priority: priorityValidator },
  handler: async (ctx, args) => {
    const { userId, task } = await requireTaskMember(ctx, args.taskId);
    await applyPriorityChange(ctx, userId, task, args.priority);
  },
});

async function applyDueDateChange(
  ctx: MutationCtx,
  userId: string,
  task: Doc<"task">,
  dueDate: number | null,
) {
  const oldDueDate = task.dueDate ?? null;
  await ctx.db.patch(task._id, {
    dueDate: dueDate ?? undefined,
    updatedAt: Date.now(),
  });
  await logActivity(ctx, {
    taskId: task._id,
    type: "due_date_changed",
    userId,
    eventData: { oldDueDate, newDueDate: dueDate },
  });
  await clearReminderState(ctx, task._id);
}

export const updateDueDate = mutation({
  args: { taskId: v.id("task"), dueDate: v.union(v.number(), v.null()) },
  handler: async (ctx, args) => {
    const { userId, task } = await requireTaskMember(ctx, args.taskId);
    await applyDueDateChange(ctx, userId, task, args.dueDate);
  },
});

export const updateTitle = mutation({
  args: { taskId: v.id("task"), title: v.string() },
  handler: async (ctx, args) => {
    const { userId, task } = await requireTaskMember(ctx, args.taskId);
    const oldTitle = task.title;
    await ctx.db.patch(args.taskId, {
      title: args.title,
      updatedAt: Date.now(),
    });
    await logActivity(ctx, {
      taskId: args.taskId,
      type: "title_changed",
      userId,
      eventData: { oldTitle, newTitle: args.title },
    });
  },
});

// No activity row — matches the original app's behavior.
export const updateDescription = mutation({
  args: { taskId: v.id("task"), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId, task, project } = await requireTaskMember(ctx, args.taskId);
    const oldDescription = task.description;
    await ctx.db.patch(args.taskId, {
      description: args.description,
      updatedAt: Date.now(),
    });
    await deleteOrphanedAssets(
      ctx,
      oldDescription,
      args.description,
      args.taskId,
    );
    await notifyNewlyMentioned(ctx, {
      oldContent: oldDescription,
      newContent: args.description,
      editorId: userId,
      taskId: args.taskId,
      taskTitle: task.title,
      projectId: task.projectId,
      workspaceId: project.workspaceId,
    });
  },
});

// Generic multi-field update, mirroring the original app's "PUT the whole
// task" endpoint — several views (backlog, gantt, list view, the kanban
// board's drag-drop) update several fields together rather than through
// one of the single-field mutations above. Matches the original's activity
// behavior exactly: only a status change gets logged.
export const patch = mutation({
  args: {
    taskId: v.id("task"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    priority: v.optional(priorityValidator),
    assigneeId: v.optional(v.union(v.string(), v.null())),
    startDate: v.optional(v.union(v.number(), v.null())),
    dueDate: v.optional(v.union(v.number(), v.null())),
    position: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, task, project } = await requireTaskMember(ctx, args.taskId);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.assigneeId !== undefined)
      updates.assigneeId = args.assigneeId ?? undefined;
    if (args.startDate !== undefined)
      updates.startDate = args.startDate ?? undefined;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate ?? undefined;
    if (args.position !== undefined) updates.position = args.position;

    const oldStatus = task.status;
    if (args.status !== undefined) {
      const column = await resolveColumn(ctx, task.projectId, args.status);
      updates.status = args.status;
      updates.columnId = column?._id;
    }

    await ctx.db.patch(args.taskId, updates);

    if (args.status !== undefined && args.status !== oldStatus) {
      await logActivity(ctx, {
        taskId: args.taskId,
        type: "status_changed",
        userId,
        eventData: { oldStatus, newStatus: args.status },
      });
      if (task.assigneeId && task.assigneeId !== userId) {
        await createNotification(ctx, {
          userId: task.assigneeId,
          type: "task_status_changed",
          eventData: {
            taskTitle: task.title,
            oldStatus,
            newStatus: args.status,
            projectId: task.projectId,
            workspaceId: project.workspaceId,
          },
          resourceId: args.taskId,
          resourceType: "task",
        });
      }
    }

    if (args.description !== undefined) {
      await deleteOrphanedAssets(
        ctx,
        task.description,
        args.description,
        args.taskId,
      );
      await notifyNewlyMentioned(ctx, {
        oldContent: task.description,
        newContent: args.description,
        editorId: userId,
        taskId: args.taskId,
        taskTitle: task.title,
        projectId: task.projectId,
        workspaceId: project.workspaceId,
      });
    }

    if (args.dueDate !== undefined && args.dueDate !== (task.dueDate ?? null)) {
      await clearReminderState(ctx, args.taskId);
    }
  },
});

export const move = mutation({
  args: {
    taskId: v.id("task"),
    destinationProjectId: v.id("project"),
    destinationStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, task } = await requireTaskMember(ctx, args.taskId);
    if (task.projectId === args.destinationProjectId) {
      throw new Error("Task is already in that project");
    }
    await requireProjectMember(ctx, args.destinationProjectId);

    const oldStatus = task.status;
    const fromProjectId = task.projectId;
    const column = await resolveColumn(
      ctx,
      args.destinationProjectId,
      args.destinationStatus ?? task.status,
    );
    const fallbackColumn =
      column ??
      (
        await ctx.db
          .query("column")
          .withIndex("by_project", (q) =>
            q.eq("projectId", args.destinationProjectId),
          )
          .collect()
      ).sort((a, b) => a.position - b.position)[0];

    const position = await nextPositionInColumn(ctx, fallbackColumn?._id);
    const number = await claimTaskNumber(ctx, args.destinationProjectId);
    const newStatus = fallbackColumn?.slug ?? task.status;

    await ctx.db.patch(args.taskId, {
      projectId: args.destinationProjectId,
      columnId: fallbackColumn?._id,
      status: newStatus,
      number,
      position,
      updatedAt: Date.now(),
    });

    await logActivity(ctx, {
      taskId: args.taskId,
      type: "moved",
      userId,
      eventData: {
        fromProjectId,
        toProjectId: args.destinationProjectId,
        oldStatus,
        newStatus,
      },
    });

    return await ctx.db.get(args.taskId);
  },
});

// Shared with project.ts's cascade delete — project removal deletes every
// task in the project and must clean up the same per-task rows without
// re-checking membership (already verified once at the project level).
export async function deleteTaskAndRelations(
  ctx: MutationCtx,
  taskId: Id<"task">,
) {
  const [
    relationsAsSource,
    relationsAsTarget,
    comments,
    timeEntries,
    activities,
    externalLinks,
    labels,
  ] = await Promise.all([
    ctx.db
      .query("taskRelation")
      .withIndex("by_source", (q) => q.eq("sourceTaskId", taskId))
      .collect(),
    ctx.db
      .query("taskRelation")
      .withIndex("by_target", (q) => q.eq("targetTaskId", taskId))
      .collect(),
    ctx.db
      .query("comment")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect(),
    ctx.db
      .query("timeEntry")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect(),
    ctx.db
      .query("activity")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect(),
    ctx.db
      .query("externalLink")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect(),
    ctx.db
      .query("label")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect(),
  ]);

  for (const row of [
    ...relationsAsSource,
    ...relationsAsTarget,
    ...comments,
    ...timeEntries,
    ...activities,
    ...externalLinks,
    ...labels,
  ]) {
    await ctx.db.delete(row._id);
  }

  await deleteAllTaskAssets(ctx, taskId);
  await clearReminderState(ctx, taskId);
  await ctx.db.delete(taskId);
}

export const deleteTask = mutation({
  args: { taskId: v.id("task") },
  handler: async (ctx, args) => {
    await requireTaskMember(ctx, args.taskId);
    await deleteTaskAndRelations(ctx, args.taskId);
  },
});

// Mirrors apps/api/src/task/controllers/bulk-update-tasks.ts — one
// workspace-membership check up front (every task must share a workspace),
// then the same per-task logic the single-task mutations use. "delete" isn't
// an operation here: the frontend's bulk-delete already loops
// api.task.deleteTask per id instead of going through a bulk endpoint.
const VALID_BULK_PRIORITIES = [
  "no-priority",
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export const bulkUpdate = mutation({
  args: {
    taskIds: v.array(v.id("task")),
    operation: v.union(
      v.literal("updateStatus"),
      v.literal("updatePriority"),
      v.literal("updateAssignee"),
      v.literal("updateDueDate"),
      v.literal("addLabel"),
    ),
    value: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    if (args.taskIds.length === 0) {
      throw new Error("No tasks specified");
    }
    const userId = await requireUserId(ctx);

    const tasks = (
      await Promise.all(args.taskIds.map((id) => ctx.db.get(id)))
    ).filter((t): t is Doc<"task"> => t !== null);
    if (tasks.length === 0) {
      throw new Error("No tasks found");
    }

    const projects = (
      await Promise.all(
        [...new Set(tasks.map((t) => t.projectId))].map((id) => ctx.db.get(id)),
      )
    ).filter((p): p is Doc<"project"> => p !== null);
    const workspaceIds = [...new Set(projects.map((p) => p.workspaceId))];
    if (workspaceIds.length > 1) {
      throw new Error("All tasks must belong to the same workspace");
    }
    const workspaceId = workspaceIds[0];
    if (!workspaceId) {
      throw new Error("Could not determine workspace");
    }
    await requireWorkspaceMember(ctx, workspaceId);

    const projectById = new Map(projects.map((p) => [p._id, p]));

    switch (args.operation) {
      case "updateStatus": {
        if (!args.value) throw new Error("Status value is required");
        for (const task of tasks) {
          const project = projectById.get(task.projectId);
          if (!project) continue;
          await applyStatusChange(ctx, userId, task, project, args.value);
        }
        break;
      }
      case "updatePriority": {
        if (!args.value) throw new Error("Priority value is required");
        if (
          !(VALID_BULK_PRIORITIES as readonly string[]).includes(args.value)
        ) {
          throw new Error(`Invalid priority "${args.value}"`);
        }
        for (const task of tasks) {
          await applyPriorityChange(
            ctx,
            userId,
            task,
            args.value as Doc<"task">["priority"],
          );
        }
        break;
      }
      case "updateAssignee": {
        for (const task of tasks) {
          const project = projectById.get(task.projectId);
          if (!project) continue;
          await applyAssigneeChange(
            ctx,
            userId,
            task,
            project,
            args.value ?? null,
          );
        }
        break;
      }
      case "updateDueDate": {
        let dueDate: number | null = null;
        if (args.value) {
          const parsed = new Date(args.value);
          if (Number.isNaN(parsed.getTime())) {
            throw new Error(`Invalid date value "${args.value}"`);
          }
          dueDate = parsed.getTime();
        }
        for (const task of tasks) {
          await applyDueDateChange(ctx, userId, task, dueDate);
        }
        break;
      }
      case "addLabel": {
        if (!args.value) throw new Error("Label ID is required");
        const labelId = ctx.db.normalizeId("label", args.value);
        const sourceLabel = labelId ? await ctx.db.get(labelId) : null;
        if (!sourceLabel) throw new Error("Label not found");
        for (const task of tasks) {
          const project = projectById.get(task.projectId);
          if (!project) continue;
          await ensureTaskLabelCopy(
            ctx,
            task._id,
            project.workspaceId,
            sourceLabel.name,
            sourceLabel.color,
          );
        }
        break;
      }
    }

    return { success: true, updatedCount: tasks.length };
  },
});

const IMPORT_TASK_STATUSES = ["planned", "archived"] as const;

function coerceImportStatus(status: string, validStatuses: string[]) {
  if (validStatuses.includes(status)) return { status };
  return {
    status: "planned",
    warning: `Unknown status "${status}" mapped to "planned"`,
  };
}

function coerceImportPriority(priority: string | undefined) {
  const value = priority || "low";
  if ((VALID_BULK_PRIORITIES as readonly string[]).includes(value)) {
    return { priority: value as Doc<"task">["priority"] };
  }
  return {
    priority: "no-priority" as const,
    warning: `Unknown priority "${value}" mapped to "no-priority"`,
  };
}

function parseImportDate(value: string | null | undefined, label: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${label} "${value}"`);
  }
  return parsed.getTime();
}

// Mirrors apps/api/src/task/controllers/import-tasks.ts, including its
// per-row try/catch: one bad row reports a failure entry instead of
// aborting the whole import.
export const importTasks = mutation({
  args: {
    projectId: v.id("project"),
    tasks: v.array(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        status: v.string(),
        priority: v.optional(v.string()),
        startDate: v.optional(v.union(v.string(), v.null())),
        dueDate: v.optional(v.union(v.string(), v.null())),
        userId: v.optional(v.union(v.string(), v.null())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { userId, project } = await requireProjectMember(ctx, args.projectId);

    const columns = await ctx.db
      .query("column")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    const validStatuses = [
      ...columns.map((c) => c.slug),
      ...IMPORT_TASK_STATUSES,
    ];

    const results: Array<
      | { success: true; task: Doc<"task">; warnings?: string[] }
      | { success: false; error: string; task: (typeof args.tasks)[number] }
    > = [];

    for (const taskData of args.tasks) {
      try {
        const { status, warning: statusWarning } = coerceImportStatus(
          taskData.status,
          validStatuses,
        );
        const { priority, warning: priorityWarning } = coerceImportPriority(
          taskData.priority,
        );
        const warnings = [statusWarning, priorityWarning].filter(
          (w): w is string => Boolean(w),
        );

        const startDate = parseImportDate(taskData.startDate, "start date");
        const dueDate = parseImportDate(taskData.dueDate, "due date");
        const column = columns.find((c) => c.slug === status);
        const position = await nextPositionInColumn(ctx, column?._id);
        const number = await claimTaskNumber(ctx, args.projectId);
        const now = Date.now();

        const taskId = await ctx.db.insert("task", {
          projectId: args.projectId,
          columnId: column?._id,
          position,
          number,
          assigneeId: taskData.userId ?? undefined,
          title: taskData.title,
          description: taskData.description || "",
          status,
          priority,
          startDate,
          dueDate,
          createdAt: now,
          updatedAt: now,
        });

        await logActivity(ctx, {
          taskId,
          type: "created",
          userId,
          content: "imported the task",
          eventData: {},
        });

        // biome-ignore lint/style/noNonNullAssertion: just inserted, must exist
        const created = (await ctx.db.get(taskId))!;
        results.push({
          success: true,
          task: created,
          ...(warnings.length > 0 && { warnings }),
        });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          task: taskData,
        });
      }
    }

    return {
      importedAt: Date.now(),
      project: { id: project._id, name: project.name, slug: project.slug },
      results: {
        total: args.tasks.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        tasks: results,
      },
    };
  },
});

// Mirrors apps/api/src/task/controllers/export-tasks.ts's response shape —
// the frontend round-trips this straight back through importTasks's args.
export const exportTasks = query({
  args: { projectId: v.id("project") },
  handler: async (ctx, args) => {
    const { project } = await requireProjectMember(ctx, args.projectId);
    const tasks = await ctx.db
      .query("task")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    const sorted = [...tasks].sort((a, b) => a.position - b.position);

    return {
      project: {
        name: project.name,
        slug: project.slug,
        description: project.description ?? "",
        exportedAt: Date.now(),
      },
      tasks: sorted.map((task) => ({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority || "low",
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
        startDate: task.startDate
          ? new Date(task.startDate).toISOString()
          : null,
        userId: task.assigneeId || null,
      })),
    };
  },
});

export const get = query({
  args: { taskId: v.id("task") },
  handler: async (ctx, args) => {
    const { task } = await requireTaskMember(ctx, args.taskId);
    return task;
  },
});

export const list = query({
  args: {
    projectId: v.id("project"),
    status: v.optional(v.string()),
    priority: v.optional(priorityValidator),
    assigneeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireProjectMember(ctx, args.projectId);
    let tasks = await ctx.db
      .query("task")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    if (args.status) tasks = tasks.filter((t) => t.status === args.status);
    if (args.priority)
      tasks = tasks.filter((t) => t.priority === args.priority);
    if (args.assigneeId)
      tasks = tasks.filter((t) => t.assigneeId === args.assigneeId);

    return tasks;
  },
});
