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

async function scribeTelegramRecipients() {
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

  return [...new Set([...configured, ...scribes.map((player) => player.telegramId)])]
    .filter((telegramId) => telegramId);
}

function formatAuditDate(value: Date) {
  return value.toISOString().replace("T", " ").slice(0, 16);
}

export async function buildScribeReturnAuditEntries(limit = 10) {
  const requests = await prisma.worldEvent.findMany({
    where: { title: SCRIBE_HELP_EVENT_TITLE },
    include: { location: { select: { name: true, key: true, x: true, y: true, z: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(25, Math.floor(limit))),
  });
  const playerIds = [...new Set(requests.map((event) => event.playerId).filter((id): id is number => Number.isSafeInteger(id)))];
  const [players, returns] = await Promise.all([
    playerIds.length
      ? prisma.player.findMany({
          where: { id: { in: playerIds } },
          select: {
            id: true,
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
            username: true,
            currentLocation: { select: { name: true, key: true, x: true, y: true, z: true } },
          },
        })
      : Promise.resolve([]),
    playerIds.length
      ? prisma.worldEvent.findMany({
          where: { title: SCRIBE_HELP_RETURN_EVENT_TITLE, playerId: { in: playerIds } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);
  const playerById = new Map(players.map((player) => [player.id, player]));

  return requests.map((event) => {
    const player = event.playerId ? playerById.get(event.playerId) : null;
    const handled = returns.find((returnEvent) => returnEvent.playerId === event.playerId && returnEvent.createdAt >= event.createdAt);
    const currentLocation = player?.currentLocation;
    const requestLocation = event.location;
    const location = currentLocation ?? requestLocation ?? null;
    return {
      event,
      player,
      handled,
      playerName: player ? playerForms(player as any).nominative : event.playerId ? `#${event.playerId}` : "невідомий персонаж",
      locationText: location ? `${location.name} (${location.x},${location.y},${location.z})` : "місцина невідома",
    };
  });
}

export async function buildScribeReturnAuditText(limit = 10) {
  const entries = await buildScribeReturnAuditEntries(limit);
  if (!entries.length) {
    return "✒️ У книзі Писарів поки немає звернень про повернення.";
  }

  return [
    "✒️ Звернення до Писарів",
    "",
    ...entries.map(({ event, handled, playerName, locationText }) => {
      const status = handled ? `опрацьовано ${formatAuditDate(handled.createdAt)}` : "очікує знака";
      return `#${event.id} — ${playerName}; ${locationText}; ${status}; ${formatAuditDate(event.createdAt)}\n/call_scribes_approve_${event.id}`;
    }),
  ].join("\n");
}

export async function approveScribeReturnRequest(bot: Bot, eventId: number, scribeTelegramId: number | string) {
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    return { ok: false as const, message: "Не вдалося прочитати номер звернення." };
  }

  const event = await prisma.worldEvent.findUnique({ where: { id: eventId } });
  if (!event || event.title !== SCRIBE_HELP_EVENT_TITLE || !event.playerId) {
    return { ok: false as const, message: "Не знайшов такого звернення до Писарів." };
  }

  const handled = await prisma.worldEvent.findFirst({
    where: {
      title: SCRIBE_HELP_RETURN_EVENT_TITLE,
      playerId: event.playerId,
      createdAt: { gte: event.createdAt },
    },
    orderBy: { createdAt: "desc" },
  });
  if (handled) {
    return { ok: false as const, message: `Це звернення вже опрацьовано: ${formatAuditDate(handled.createdAt)}.` };
  }

  return performScribeReturn(bot, event.playerId, scribeTelegramId);
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

  const recipients = await scribeTelegramRecipients();
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
