export type StartActionPayload =
  | "look"
  | "examine"
  | "news"
  | "auto"
  | "autoStop"
  | "me"
  | "help"
  | "track"
  | "time"
  | "weather"
  | "inventory"
  | "say"
  | "yell"
  | "buildCampfire"
  | "lightCampfire"
  | "douseCampfire"
  | "dismantleCampfire"
  | "dismantleTotem";

const SAFE_START_PAYLOAD = /^[A-Za-z0-9_-]+$/;

export function parseStartActionPayload(value: unknown): StartActionPayload | null {
  const payload = typeof value === "string" ? value.trim() : "";
  if (!payload || !SAFE_START_PAYLOAD.test(payload)) return null;

  if (payload === "cmd_look") return "look";
  if (payload === "cmd_examine") return "examine";
  if (payload === "cmd_news") return "news";
  if (payload === "cmd_auto") return "auto";
  if (payload === "cmd_auto_stop") return "autoStop";
  if (payload === "cmd_me") return "me";
  if (payload === "cmd_help") return "help";
  if (payload === "cmd_track") return "track";
  if (payload === "cmd_time") return "time";
  if (payload === "cmd_weather") return "weather";
  if (payload === "cmd_inventory") return "inventory";
  if (payload === "cmd_say") return "say";
  if (payload === "cmd_yell") return "yell";
  if (payload === "cmd_build_campfire") return "buildCampfire";
  if (payload === "cmd_light_campfire") return "lightCampfire";
  if (payload === "cmd_douse_campfire") return "douseCampfire";
  if (payload === "cmd_dismantle_campfire") return "dismantleCampfire";
  if (payload === "cmd_dismantle_totem") return "dismantleTotem";

  return null;
}
