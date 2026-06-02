import { config } from "../config";

export const SAFE_GAME_COMMAND_PAYLOADS = {
  "/look": "cmd_look",
  "/examine": "cmd_examine",
  "/news": "cmd_news",
  "/auto": "cmd_auto",
  "/autoStop": "cmd_auto_stop",
  "/me": "cmd_me",
  "/help": "cmd_help",
  "/track": "cmd_track",
  "/time": "cmd_time",
  "/weather": "cmd_weather",
  "/inventory": "cmd_inventory",
  "/inv": "cmd_inventory",
  "/say": "cmd_say",
  "/yell": "cmd_yell",
  "/call_scribes": "cmd_call_scribes",
  "/build_campfire": "cmd_build_campfire",
  "/light_campfire": "cmd_light_campfire",
  "/douse_campfire": "cmd_douse_campfire",
  "/dismantle_campfire": "cmd_dismantle_campfire",
  "/dismantle_totem": "cmd_dismantle_totem",
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
