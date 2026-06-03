import { Bot } from "grammy";
import { PlayerSleepState } from "@prisma/client";
import { prisma } from "../db";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { escapeHtml } from "../utils/text";
import { playerForms } from "./grammar";
import { notifyLocationExcept } from "./notifications";

export const CELLAR_WATER_PASSAGE_SOURCE_KEY = "start_border_cellar";
export const CELLAR_WATER_PASSAGE_DESTINATION_KEY = "under_bridge_18_05";
export const CELLAR_WATER_PASSAGE_EVENT_TITLE = "Cellar water-word passage";
export const CELLAR_WATER_PASSAGE_RESULT_TEXT =
  "Слова падають у суху глину. На мить під ногами чути воду. Коли темрява повертається на місце, ви стоїте під старим мостом.";

export function normalizeCellarWaterWordPhrase(text: string) {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase("uk-UA")
    .replace(/[!?.,:;"'«»“”„’`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isCellarWaterWordPhrase(text: string) {
  return normalizeCellarWaterWordPhrase(text) === "до води";
}

export function canTriggerCellarWaterWordPassage(input: {
  text: string;
  locationKey?: string | null;
  hp?: number | null;
  isResting?: boolean | null;
  sleepState?: string | null;
}) {
  return Boolean(
    isCellarWaterWordPhrase(input.text)
    && input.locationKey === CELLAR_WATER_PASSAGE_SOURCE_KEY
    && (input.hp ?? 0) > 0
    && input.isResting !== true
    && input.sleepState === PlayerSleepState.AWAKE,
  );
}

export function cellarWaterWordPassageEventDescription(playerId: number) {
  return `player=${playerId}; source=${CELLAR_WATER_PASSAGE_SOURCE_KEY}; destination=${CELLAR_WATER_PASSAGE_DESTINATION_KEY}; trigger=water_word_phrase`;
}

export async function tryCompleteCellarWaterWordPassage(bot: Bot, input: { playerId: number; text: string; chatId?: string | number | null }) {
  if (!isCellarWaterWordPhrase(input.text)) return false;

  const player = await prisma.player.findUnique({
    where: { id: input.playerId },
    include: { currentLocation: { select: { id: true, key: true } } },
  });
  if (!player?.currentLocationId || !canTriggerCellarWaterWordPassage({
    text: input.text,
    locationKey: player.currentLocation?.key,
    hp: player.hp,
    isResting: player.isResting,
    sleepState: player.sleepState,
  })) {
    return false;
  }

  const destination = await prisma.cellLocation.findUnique({
    where: { key: CELLAR_WATER_PASSAGE_DESTINATION_KEY },
    select: { id: true, key: true },
  });
  if (!destination) return false;

  const sourceLocationId = player.currentLocationId;
  const forms = playerForms(player);
  const moved = await prisma.$transaction(async (tx) => {
    const updated = await tx.player.updateMany({
      where: {
        id: player.id,
        currentLocationId: sourceLocationId,
        hp: { gt: 0 },
        isResting: false,
        sleepState: PlayerSleepState.AWAKE,
      },
      data: {
        currentLocationId: destination.id,
        steps: { increment: 1 },
        lastActionAt: new Date(),
        lastPlayerActionAt: new Date(),
      },
    });
    if (updated.count === 0) return false;

    await tx.worldEvent.create({
      data: {
        type: "PLAYER_ACTION",
        title: CELLAR_WATER_PASSAGE_EVENT_TITLE,
        description: cellarWaterWordPassageEventDescription(player.id),
        playerId: player.id,
        locationId: sourceLocationId,
      },
    });
    return true;
  });
  if (!moved) return false;

  await notifyLocationExcept(
    bot,
    sourceLocationId,
    [player.id],
    `${escapeHtml(forms.nominative)} стихає біля стіни зарубок і зникає з кроку.`,
    { parseMode: "HTML" },
  );
  await notifyLocationExcept(
    bot,
    destination.id,
    [player.id],
    `${escapeHtml(forms.nominative)} виходить з мокрої темряви під мостом.`,
    { parseMode: "HTML" },
  );

  if (input.chatId) {
    await bot.api.sendMessage(input.chatId, CELLAR_WATER_PASSAGE_RESULT_TEXT, {
      reply_markup: await buildMainReplyKeyboardForTelegramId(Number(player.telegramId), false),
    });
  }
  return true;
}
