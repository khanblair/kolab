import { useQuery } from "convex/react";
import { api, type Doc, type Id } from "@/lib/convex-api";

type RelationTaskSummary = {
  id: string;
  title: string;
  number: number;
  status: string;
  priority: string;
  userId: string | null;
  assigneeName: string | null;
  projectId: string;
};

function toSummary(doc: Doc<"task"> | null): RelationTaskSummary | null {
  if (!doc) return null;
  return {
    id: doc._id,
    title: doc.title,
    number: doc.number,
    status: doc.status,
    priority: doc.priority,
    userId: doc.assigneeId ?? null,
    assigneeName: null,
    projectId: doc.projectId,
  };
}

function useGetTaskRelations(taskId: string) {
  const relations = useQuery(
    api.taskRelation.list,
    taskId ? { taskId: taskId as Id<"task"> } : "skip",
  );

  return {
    data: relations?.map((rel) => ({
      id: rel._id as string,
      sourceTaskId: rel.sourceTaskId as string,
      targetTaskId: rel.targetTaskId as string,
      relationType: rel.relationType,
      sourceTask: toSummary(rel.sourceTask),
      targetTask: toSummary(rel.targetTask),
    })),
    isLoading: Boolean(taskId) && relations === undefined,
    isError: false,
  };
}

export default useGetTaskRelations;
