export function isCloud(): boolean {
  return process.env.KOLAB_CLOUD === "true";
}
