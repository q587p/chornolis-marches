import { Bot, InlineKeyboard } from "grammy";
import { PlayerPosture } from "@prisma/client";
import { config } from "../config";
import { prisma } from "../db";
import { getStartLocationId, START_LOCATION_KEY } from "./players";
import { playerForms } from "./grammar";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { safeSendMessage } from "../utils/telegram";

export const SCRIBE_HELP_COMMAND = "/call_scribes";
export const SCRIBE_HELP_EVENT_TITLE = "Player requested scribe return help";
export const SCRIBE_HELP_RETURN_EVENT_TITLE = "Scribe returned player to camp";

type ScribeHelpPlayer = {
  id: number;
  telegramId: string;
  currentLocationId: number | null;
  isAutoEnabled?: boolean | null;
  currentLocation?: {
    id: number;
    key: string;
    name: string;
    x: number;
    y: number;
    z: number;
    region?: { name: string } | null;
  } | null;
};

type ScribeRef = {
  id?: number | null;
  telegramId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  nameNominative?: string | null;
};

export function establishedReturnHelpText() {
  return [
    "Можна гукнути поруч — інші мандрівники або місцеві можуть почути вас, якщо вони недалеко.",
    "",
    "Напишіть так: <i>yell</i> Допоможіть, я заблукав! або <i>гукнути</i> Допоможіть, я заблукала!",
    "",
    `Якщо потрібен знак Писаря, зверніться до Писарів: ${SCRIBE_HELP_COMMAND} або <i>покликати писарів</i>.`,
  ].join("\n");
}

export function scribeHelpRequestedText() {
  return [
    "Ви торкаєтеся нитки, якою Порубіжжя іноді веде записи до Писарів.",
    "",
    "Якщо хтось із них зараз біля книги й печатки, він побачить ваше прохання і зможе повернути вас до межового табору.",
  ].join("\n");
}

export function scribeHelpNoScribesText() {
  return [
    "Прохання лишилося в записах світу, але зараз не видно жодного Писаря, якому можна негайно передати знак.",
    "",
    "Спробуйте ще гукнути поруч: /yell Допоможіть, я заблукав!",
  ].join("\n");
}

export function scribeReturnRequestKeyboard(playerId: number) {
  return new InlineKeyboard().text("✒️ Застосувати знак Писаря", `scribeReturn:${playerId}`);
}

export function scribeReturnHelpKeyboard() {
  return new InlineKeyboard()
    .text("📣 Гукнути поруч", "respawn:yell_help")
    .row()
    .text("✒️ Звернутися до Писарів", "scribeReturn:request");
}

export function scribeReturnRequestMessage(player: ScribeHelpPlayer) {
  const forms = playerForms(player as any);
  const location = player.currentLocation;
  const place = location
    ? `${location.name} (${location.x},${location.y},${location.z}); регіон: ${location.region?.name ?? "невідомий"}`
    : "місцина невідома";
  return [
    "✒️ <b>Прохання до Писарів</b>",
    "",
    `${forms.nominative} просить допомоги з поверненням до межового табору.`,
    `Поточна місцина: ${place}.`,
    "",
    "Якщо це доречно, застосуйте знак Писаря для повернення.",
  ].join("\n");
}

function scribeDisplayName(scribe: ScribeRef | null | undefined, telegramId?: number | string | null) {
  if (scribe) return playerForms(scribe as any).nominative;
  return telegramId ? `Писар #${telegramId}` : "Писар Порубіжжя";
}

async function scribeTelegramRecipients(exceptTelegramId?: string | number | null) {
  const configured = config.adminTelegramIds;
  const scribes = await prisma.player.findMany({
    where: {
      OR: [
        { role: "SCRIBE" },
        ...(configured.length ? [{ telegramId: { in: configured } }] : []),
      ],
    },
    select: { telegramId: true },
  });

  const except = exceptTelegramId ? String(exceptTelegramId) : null;
  return [...new Set([...configured, ...scribes.map((player) => player.telegramId)])]
    .filter((telegramId) => telegramId && telegramId !== except);
}

export async function requestScribeReturnHelp(bot: Bot, telegramId: number | string) {
  const player = await prisma.player.findUnique({
    where: { telegramId: String(telegramId) },
    select: {
      id: true,
      telegramId: true,
      currentLocationId: true,
      isAutoEnabled: true,
      firstName: true,
      lastName: true,
      nameNominative: true,
      nameGenitive: true,
      nameDative: true,
      nameAccusative: true,
      nameInstrumental: true,
      nameLocative: true,
      nameVocative: true,
      grammaticalGender: true,
      pronoun: true,
      currentLocation: {
        select: {
          id: true,
          key: true,
          name: true,
          x: true,
          y: true,
          z: true,
          region: { select: { name: true } },
        },
      },
    },
  });
  if (!player) return { ok: false as const, reason: "no-player" as const };

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: SCRIBE_HELP_EVENT_TITLE,
      description: `player=${player.id}; location=${player.currentLocation?.key ?? "unknown"}`,
      playerId: player.id,
      locationId: player.currentLocationId ?? undefined,
    },
  });

  const recipients = await scribeTelegramRecipients(telegramId);
  const text = scribeReturnRequestMessage(player);
  let sent = 0;
  for (const recipient of recipients) {
    const message = await safeSendMessage(
      bot,
      recipient,
      text,
      { parse_mode: "HTML", reply_markup: scribeReturnRequestKeyboard(player.id) },
      "scribe return help",
    ).catch((error) => {
      console.warn("Failed to notify scribe return help:", error);
      return null;
    });
    if (message) sent += 1;
  }

  return { ok: true as const, player, sent };
}

export async function performScribeReturn(bot: Bot, playerId: number, scribeTelegramId: number | string) {
  const [player, scribe, startLocationId] = await Promise.all([
    prisma.player.findUnique({ where: { id: playerId } }),
    prisma.player.findUnique({ where: { telegramId: String(scribeTelegramId) } }),
    getStartLocationId(),
  ]);
  if (!player) return { ok: false as const, message: "Персонажа не знайдено." };

  const startLocation = await prisma.cellLocation.findUnique({ where: { id: startLocationId } });
  if (!startLocation) return { ok: false as const, message: "Межовий табір не знайдено. Перевірте seed світу." };

  const scribeName = scribeDisplayName(scribe, scribeTelegramId);
  const fromLocationId = player.currentLocationId;
  await prisma.$transaction([
    prisma.worldAction.updateMany({
      where: { actorType: "PLAYER", playerId, status: { in: ["QUEUED", "RUNNING"] } },
      data: { status: "CANCELLED", note: "перервано знаком Писаря" },
    }),
    prisma.player.update({
      where: { id: playerId },
      data: {
        currentLocationId: startLocationId,
        posture: PlayerPosture.STANDING,
        sleepState: "AWAKE",
        ordinarySleepStartedAtMinute: null,
        isResting: false,
        isAutoEnabled: false,
        sessionPresence: "ACTIVE",
        remindersPaused: false,
        lastPlayerActionAt: new Date(),
      },
    }),
    prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: SCRIBE_HELP_RETURN_EVENT_TITLE,
        description: `player=${playerId}; from=${fromLocationId ?? "unknown"}; to=${START_LOCATION_KEY}; scribe=${scribeName}`,
        playerId,
        locationId: startLocationId,
      },
    }),
  ]);

  const targetTelegramId = Number(player.telegramId);
  if (Number.isSafeInteger(targetTelegramId)) {
    await safeSendMessage(
      bot,
      targetTelegramId,
      `${scribeName} застосував знак Писаря. Межовий табір знову проступає поруч: ${startLocation.name}.`,
      { reply_markup: await buildMainReplyKeyboardForTelegramId(targetTelegramId, false) },
      "scribe return target notice",
    ).catch((error) => console.warn("Failed to notify target of scribe return:", error));
  }

  return { ok: true as const, player, startLocation, scribeName };
}
