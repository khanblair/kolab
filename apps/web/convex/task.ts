import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { logActivity } from "./lib/activity";
import { deleteAllTaskAssets, deleteOrphanedAssets } from "./lib/assets";
import { requireProjectMember, requireTaskMember } from "./lib/auth";
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

export const updateStatus = mutation({
  args: { taskId: v.id("task"), status: v.string() },
  handler: async (ctx, args) => {
    const { userId, task, project } = await requireTaskMember(ctx, args.taskId);
    const oldStatus = task.status;
    const column = await resolveColumn(ctx, task.projectId, args.status);
    await ctx.db.patch(args.taskId, {
      status: args.status,
      columnId: column?._id,
      updatedAt: Date.now(),
    });
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

export const updateAssignee = mutation({
  args: { taskId: v.id("task"), assigneeId: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const { userId, task, project } = await requireTaskMember(ctx, args.taskId);
    if ((task.assigneeId ?? null) === args.assigneeId) return;
    await ctx.db.patch(args.taskId, {
      assigneeId: args.assigneeId ?? undefined,
      updatedAt: Date.now(),
    });
    await logActivity(ctx, {
      taskId: args.taskId,
      type: args.assigneeId ? "assignee_changed" : "unassigned",
      userId,
      eventData: args.assigneeId ? { newAssigneeId: args.assigneeId } : {},
    });
    if (args.assigneeId && args.assigneeId !== userId) {
      await createNotification(ctx, {
        userId: args.assigneeId,
        type: "task_assignee_changed",
        eventData: {
          taskTitle: task.title,
          projectId: task.projectId,
          workspaceId: project.workspaceId,
        },
        resourceId: args.taskId,
        resourceType: "task",
      });
    }
  },
});

export const updatePriority = mutation({
  args: { taskId: v.id("task"), priority: priorityValidator },
  handler: async (ctx, args) => {
    const { userId, task } = await requireTaskMember(ctx, args.taskId);
    const oldPriority = task.priority;
    await ctx.db.patch(args.taskId, {
      priority: args.priority,
      updatedAt: Date.now(),
    });
    await logActivity(ctx, {
      taskId: args.taskId,
      type: "priority_changed",
      userId,
      eventData: { oldPriority, newPriority: args.priority },
    });
  },
});

export const updateDueDate = mutation({
  args: { taskId: v.id("task"), dueDate: v.union(v.number(), v.null()) },
  handler: async (ctx, args) => {
    const { userId, task } = await requireTaskMember(ctx, args.taskId);
    const oldDueDate = task.dueDate ?? null;
    await ctx.db.patch(args.taskId, {
      dueDate: args.dueDate ?? undefined,
      updatedAt: Date.now(),
    });
    await logActivity(ctx, {
      taskId: args.taskId,
      type: "due_date_changed",
      userId,
      eventData: { oldDueDate, newDueDate: args.dueDate },
    });
    await clearReminderState(ctx, args.taskId);
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

export const deleteTask = mutation({
  args: { taskId: v.id("task") },
  handler: async (ctx, args) => {
    await requireTaskMember(ctx, args.taskId);

    const [
      relationsAsSource,
      relationsAsTarget,
      comments,
      timeEntries,
      activities,
      externalLinks,
    ] = await Promise.all([
      ctx.db
        .query("taskRelation")
        .withIndex("by_source", (q) => q.eq("sourceTaskId", args.taskId))
        .collect(),
      ctx.db
        .query("taskRelation")
        .withIndex("by_target", (q) => q.eq("targetTaskId", args.taskId))
        .collect(),
      ctx.db
        .query("comment")
        .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
        .collect(),
      ctx.db
        .query("timeEntry")
        .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
        .collect(),
      ctx.db
        .query("activity")
        .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
        .collect(),
      ctx.db
        .query("externalLink")
        .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
        .collect(),
    ]);

    for (const row of [
      ...relationsAsSource,
      ...relationsAsTarget,
      ...comments,
      ...timeEntries,
      ...activities,
      ...externalLinks,
    ]) {
      await ctx.db.delete(row._id);
    }

    await deleteAllTaskAssets(ctx, args.taskId);
    await clearReminderState(ctx, args.taskId);
    await ctx.db.delete(args.taskId);
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
