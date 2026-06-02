import { config } from "../config";
import {
  gameCommandDeepLink,
  isSafeGameCommand,
  SAFE_GAME_COMMAND_PAYLOADS,
  type SafeGameCommand,
} from "../services/gameCommandLinks";
import { escapeHtml } from "../utils/text";

export const HERALD_SAFE_GAME_COMMAND_PAYLOADS = SAFE_GAME_COMMAND_PAYLOADS;
export type HeraldSafeGameCommand = SafeGameCommand;

const BACKTICKED_COMMAND_PATTERN = /`(\/[A-Za-z][A-Za-z0-9_]*)`|(\/[A-Za-z][A-Za-z0-9_]*)/g;

function renderCommandHtml(command: HeraldSafeGameCommand, username = config.gameBotUsername) {
  return `<a href="${gameCommandDeepLink(command, username)}">${escapeHtml(command)}</a>`;
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
