export type StartActionPayload =
  | "start"
  | "look"
  | "examine"
  | "news"
  | "auto"
  | "spirit"
  | "spiritOn"
  | "autoStop"
  | "me"
  | "who"
  | "help"
  | "rest"
  | "sleep"
  | "lie"
  | "track"
  | "trackFox"
  | "signals"
  | "follow"
  | "unfollow"
  | "travelGroup"
  | "travelGroupCreate"
  | "travelGroupInvite"
  | "travelGroupAccept"
  | "travelGroupLeave"
  | "travelGroupFollowLeader"
  | "time"
  | "calendar"
  | "weather"
  | "inventory"
  | "pickupAll"
  | "put"
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
  | "gatherBeeswax"
  | "attackAll"
  | "killAll"
  | "attackAllMouse"
  | "killAllMouse"
  | "attackAllRabbit"
  | "killAllRabbit"
  | "attackAllFrog"
  | "killAllFrog"
  | "attackAllSnake"
  | "killAllSnake"
  | "attackAllFox"
  | "killAllFox"
  | "attackAllWolf"
  | "killAllWolf"
  | "attackAllOwl"
  | "killAllOwl"
  | "attackAllHawk"
  | "killAllHawk";

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
  if (payload === "cmd_spirit") return "spirit";
  if (payload === "cmd_spirit_on") return "spiritOn";
  if (payload === "cmd_spirit_off") return "autoStop";
  if (payload === "cmd_spirit_stop") return "autoStop";
  if (payload === "cmd_dukh") return "spirit";
  if (payload === "cmd_dukh_on") return "spiritOn";
  if (payload === "cmd_dukh_off") return "autoStop";
  if (payload === "cmd_dukh_stop") return "autoStop";
  if (payload === "cmd_poklyk") return "spirit";
  if (payload === "cmd_poklyk_on") return "spiritOn";
  if (payload === "cmd_me") return "me";
  if (payload === "cmd_who") return "who";
  if (payload === "cmd_help") return "help";
  if (payload === "cmd_rest") return "rest";
  if (payload === "cmd_sleep") return "sleep";
  if (payload === "cmd_lie") return "lie";
  if (payload === "cmd_track") return "track";
  if (payload === "cmd_track_fox") return "trackFox";
  if (payload === "cmd_signals" || payload === "cmd_socials") return "signals";
  if (payload === "cmd_follow") return "follow";
  if (payload === "cmd_unfollow") return "unfollow";
  if (payload === "cmd_group") return "travelGroup";
  if (payload === "cmd_group_create") return "travelGroupCreate";
  if (payload === "cmd_group_invite") return "travelGroupInvite";
  if (payload === "cmd_group_accept") return "travelGroupAccept";
  if (payload === "cmd_group_leave") return "travelGroupLeave";
  if (payload === "cmd_group_follow_leader") return "travelGroupFollowLeader";
  if (payload === "cmd_time") return "time";
  if (payload === "cmd_calendar") return "calendar";
  if (payload === "cmd_weather") return "weather";
  if (payload === "cmd_inventory") return "inventory";
  if (payload === "cmd_get_all" || payload === "cmd_pick_all") return "pickupAll";
  if (payload === "cmd_put") return "put";
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
  if (payload === "cmd_attack_all") return "attackAll";
  if (payload === "cmd_kill_all") return "killAll";
  if (payload === "cmd_attack_all_mouse") return "attackAllMouse";
  if (payload === "cmd_kill_all_mouse") return "killAllMouse";
  if (payload === "cmd_attack_all_rabbit") return "attackAllRabbit";
  if (payload === "cmd_kill_all_rabbit") return "killAllRabbit";
  if (payload === "cmd_attack_all_frog") return "attackAllFrog";
  if (payload === "cmd_kill_all_frog") return "killAllFrog";
  if (payload === "cmd_attack_all_snake") return "attackAllSnake";
  if (payload === "cmd_kill_all_snake") return "killAllSnake";
  if (payload === "cmd_attack_all_fox") return "attackAllFox";
  if (payload === "cmd_kill_all_fox") return "killAllFox";
  if (payload === "cmd_attack_all_wolf") return "attackAllWolf";
  if (payload === "cmd_kill_all_wolf") return "killAllWolf";
  if (payload === "cmd_attack_all_owl") return "attackAllOwl";
  if (payload === "cmd_kill_all_owl") return "killAllOwl";
  if (payload === "cmd_attack_all_hawk") return "attackAllHawk";
  if (payload === "cmd_kill_all_hawk") return "killAllHawk";

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
