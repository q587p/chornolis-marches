export type StartActionPayload = "look" | "examine";

const SAFE_START_PAYLOAD = /^[A-Za-z0-9_-]+$/;

export function parseStartActionPayload(value: unknown): StartActionPayload | null {
  const payload = typeof value === "string" ? value.trim() : "";
  if (!payload || !SAFE_START_PAYLOAD.test(payload)) return null;

  if (payload === "cmd_look") return "look";
  if (payload === "cmd_examine") return "examine";

  return null;
}
