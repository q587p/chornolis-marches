import { config } from "../config";

export const SAFE_GAME_COMMAND_PAYLOADS = {
  "/start": "cmd_start",
  "/look": "cmd_look",
  "/examine": "cmd_examine",
  "/news": "cmd_news",
  "/spirit": "cmd_spirit",
  "/spirit_on": "cmd_spirit_on",
  "/spirit_off": "cmd_spirit_off",
  "/spirit_stop": "cmd_spirit_stop",
  "/dukh": "cmd_dukh",
  "/dukh_on": "cmd_dukh_on",
  "/dukh_off": "cmd_dukh_off",
  "/dukh_stop": "cmd_dukh_stop",
  "/poklyk": "cmd_poklyk",
  "/poklyk_on": "cmd_poklyk_on",
  "/auto": "cmd_auto",
  "/autoStop": "cmd_auto_stop",
  "/me": "cmd_me",
  "/who": "cmd_who",
  "/help": "cmd_help",
  "/rest": "cmd_rest",
  "/sleep": "cmd_sleep",
  "/track": "cmd_track",
  "/follow": "cmd_follow",
  "/unfollow": "cmd_unfollow",
  "/group": "cmd_group",
  "/group_create": "cmd_group_create",
  "/group_invite": "cmd_group_invite",
  "/group_accept": "cmd_group_accept",
  "/group_leave": "cmd_group_leave",
  "/group_follow_leader": "cmd_group_follow_leader",
  "/time": "cmd_time",
  "/calendar": "cmd_calendar",
  "/weather": "cmd_weather",
  "/inventory": "cmd_inventory",
  "/inv": "cmd_inventory",
  "/get_all": "cmd_get_all",
  "/pick_all": "cmd_get_all",
  "/put": "cmd_put",
  "/say": "cmd_say",
  "/yell": "cmd_yell",
  "/call_scribes": "cmd_call_scribes",
  "/north": "cmd_north",
  "/n": "cmd_north",
  "/south": "cmd_south",
  "/s": "cmd_south",
  "/west": "cmd_west",
  "/w": "cmd_west",
  "/east": "cmd_east",
  "/e": "cmd_east",
  "/up": "cmd_up",
  "/u": "cmd_up",
  "/down": "cmd_down",
  "/d": "cmd_down",
  "/inside": "cmd_inside",
  "/in": "cmd_inside",
  "/outside": "cmd_outside",
  "/out": "cmd_outside",
  "/build_campfire": "cmd_build_campfire",
  "/light_campfire": "cmd_light_campfire",
  "/douse_campfire": "cmd_douse_campfire",
  "/dismantle_campfire": "cmd_dismantle_campfire",
  "/dismantle_totem": "cmd_dismantle_totem",
  "/search_honey": "cmd_search_honey",
  "/search_beeswax": "cmd_search_beeswax",
  "/gather_honey": "cmd_gather_honey",
  "/gather_beeswax": "cmd_gather_beeswax",
} as const;

export type SafeGameCommand = keyof typeof SAFE_GAME_COMMAND_PAYLOADS;

export function normalizeGameBotUsername(username = config.gameBotUsername) {
  return username.trim().replace(/^@/, "") || "Chornolis_bot";
}

export function isSafeGameCommand(command: string): command is SafeGameCommand {
  return Object.prototype.hasOwnProperty.call(SAFE_GAME_COMMAND_PAYLOADS, command);
}

export function gameCommandDeepLink(command: SafeGameCommand, username = config.gameBotUsername) {
  const botUsername = encodeURIComponent(normalizeGameBotUsername(username));
  const payload = encodeURIComponent(SAFE_GAME_COMMAND_PAYLOADS[command]);
  return `https://t.me/${botUsername}?start=${payload}`;
}
