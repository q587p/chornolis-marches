import { config } from "../config";
import { escapeHtml } from "../utils/text";

export const HERALD_SAFE_GAME_COMMAND_PAYLOADS = {
  "/look": "cmd_look",
  "/examine": "cmd_examine",
  "/news": "cmd_news",
  "/auto": "cmd_auto",
  "/autoStop": "cmd_auto_stop",
  "/me": "cmd_me",
  "/help": "cmd_help",
} as const;

export type HeraldSafeGameCommand = keyof typeof HERALD_SAFE_GAME_COMMAND_PAYLOADS;

const BACKTICKED_COMMAND_PATTERN = /`(\/[A-Za-z][A-Za-z0-9_]*)`|(\/[A-Za-z][A-Za-z0-9_]*)/g;

function normalizeGameBotUsername(username = config.gameBotUsername) {
  return username.trim().replace(/^@/, "") || "Chornolis_bot";
}

function commandDeepLink(command: HeraldSafeGameCommand, username = config.gameBotUsername) {
  const botUsername = encodeURIComponent(normalizeGameBotUsername(username));
  const payload = encodeURIComponent(HERALD_SAFE_GAME_COMMAND_PAYLOADS[command]);
  return `https://t.me/${botUsername}?start=${payload}`;
}

function isSafeGameCommand(command: string): command is HeraldSafeGameCommand {
  return Object.prototype.hasOwnProperty.call(HERALD_SAFE_GAME_COMMAND_PAYLOADS, command);
}

function renderCommandHtml(command: HeraldSafeGameCommand, username = config.gameBotUsername) {
  return `<a href="${commandDeepLink(command, username)}">${escapeHtml(command)}</a>`;
}

export function linkHeraldGameCommandMentions(text: string, username = config.gameBotUsername) {
  let output = "";
  let lastIndex = 0;

  for (const match of text.matchAll(BACKTICKED_COMMAND_PATTERN)) {
    const index = match.index ?? 0;
    const command = match[1] ?? match[2];
    output += escapeHtml(text.slice(lastIndex, index));
    output += isSafeGameCommand(command) ? renderCommandHtml(command, username) : escapeHtml(match[0]);
    lastIndex = index + match[0].length;
  }

  output += escapeHtml(text.slice(lastIndex));
  return output;
}

export const HERALD_CHANNEL_MESSAGE_OPTIONS = {
  parse_mode: "HTML" as const,
  link_preview_options: { is_disabled: true },
};
