import { rememberTutorialInventoryAvailable } from "../services/tutorial";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";

type PlayerRef = {
  id: number;
  telegramId?: string | number | null;
  currentLocationId?: number | null;
};

export async function rememberTutorialInventoryForPlayer(player: PlayerRef, reason: string) {
  return rememberTutorialInventoryAvailable(player.id, player.currentLocationId, reason);
}

export async function inventoryGainReplyOptions(player: PlayerRef, reason: string) {
  await rememberTutorialInventoryForPlayer(player, reason);
  const telegramId = Number(player.telegramId);
  if (!Number.isFinite(telegramId)) return undefined;
  return { reply_markup: await buildMainReplyKeyboardForTelegramId(telegramId, false) };
}
