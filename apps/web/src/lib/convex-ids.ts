// Every consumer in the app expects `.id`, not Convex's `._id` — this keeps
// that expectation alive without touching every downstream component.
export function withId<T extends { _id: string }>(
  doc: T,
): T & { id: T["_id"] } {
  return { ...doc, id: doc._id };
}
