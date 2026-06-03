export type StartActionPayload =
  | "start"
  | "look"
  | "examine"
  | "news"
  | "auto"
  | "autoStop"
  | "me"
  | "help"
  | "rest"
  | "sleep"
  | "track"
  | "follow"
  | "unfollow"
  | "time"
  | "calendar"
  | "weather"
  | "inventory"
  | "say"
  | "yell"
  | "callScribes"
  | "north"
  | "south"
  | "west"
  | "east"
  | "up"
  | "down"
  | "inside"
  | "outside"
  | "buildCampfire"
  | "lightCampfire"
  | "douseCampfire"
  | "dismantleCampfire"
  | "dismantleTotem"
  | "gatherHoney"
  | "gatherBeeswax";

const SAFE_START_PAYLOAD = /^[A-Za-z0-9_-]+$/;
const START_COMMAND_WITH_PAYLOAD = /^\/?start(?:@[A-Za-z0-9_]+)?(?:\s+([^\s]+))?\s*$/i;

export function parseStartActionPayload(value: unknown): StartActionPayload | null {
  const payload = typeof value === "string" ? value.trim() : "";
  if (!payload || !SAFE_START_PAYLOAD.test(payload)) return null;

  if (payload === "cmd_start") return "start";
  if (payload === "cmd_look") return "look";
  if (payload === "cmd_examine") return "examine";
  if (payload === "cmd_news") return "news";
  if (payload === "cmd_auto") return "auto";
  if (payload === "cmd_auto_stop") return "autoStop";
  if (payload === "cmd_spirit") return "auto";
  if (payload === "cmd_spirit_stop") return "autoStop";
  if (payload === "cmd_dukh") return "auto";
  if (payload === "cmd_dukh_stop") return "autoStop";
  if (payload === "cmd_poklyk") return "auto";
  if (payload === "cmd_me") return "me";
  if (payload === "cmd_help") return "help";
  if (payload === "cmd_rest") return "rest";
  if (payload === "cmd_sleep") return "sleep";
  if (payload === "cmd_track") return "track";
  if (payload === "cmd_follow") return "follow";
  if (payload === "cmd_unfollow") return "unfollow";
  if (payload === "cmd_time") return "time";
  if (payload === "cmd_calendar") return "calendar";
  if (payload === "cmd_weather") return "weather";
  if (payload === "cmd_inventory") return "inventory";
  if (payload === "cmd_say") return "say";
  if (payload === "cmd_yell") return "yell";
  if (payload === "cmd_call_scribes") return "callScribes";
  if (payload === "cmd_north" || payload === "cmd_n") return "north";
  if (payload === "cmd_south" || payload === "cmd_s") return "south";
  if (payload === "cmd_west" || payload === "cmd_w") return "west";
  if (payload === "cmd_east" || payload === "cmd_e") return "east";
  if (payload === "cmd_up" || payload === "cmd_u") return "up";
  if (payload === "cmd_down" || payload === "cmd_d") return "down";
  if (payload === "cmd_inside" || payload === "cmd_in") return "inside";
  if (payload === "cmd_outside" || payload === "cmd_out") return "outside";
  if (payload === "cmd_build_campfire") return "buildCampfire";
  if (payload === "cmd_light_campfire") return "lightCampfire";
  if (payload === "cmd_douse_campfire") return "douseCampfire";
  if (payload === "cmd_dismantle_campfire") return "dismantleCampfire";
  if (payload === "cmd_dismantle_totem") return "dismantleTotem";
  if (payload === "cmd_search_honey") return "gatherHoney";
  if (payload === "cmd_search_beeswax") return "gatherBeeswax";
  if (payload === "cmd_gather_honey") return "gatherHoney";
  if (payload === "cmd_gather_beeswax") return "gatherBeeswax";

  return null;
}

export function parseStartActionPayloadFromText(value: unknown): StartActionPayload | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  const match = text.match(START_COMMAND_WITH_PAYLOAD);
  if (!match?.[1]) return null;
  return parseStartActionPayload(match[1]);
}

export function resolveStartActionPayload(input: { match?: unknown; text?: unknown }): StartActionPayload | null {
  return parseStartActionPayload(input.match) ?? parseStartActionPayloadFromText(input.text);
}
