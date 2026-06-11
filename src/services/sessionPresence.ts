import { Bot } from "grammy";
import { PlayerSessionPresence } from "@prisma/client";
import { config } from "../config";
import { prisma } from "../db";
import { actorGrammarGender } from "./grammar";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";

const AUTO_AFK_CHECK_INTERVAL_MS = Number(process.env.AUTO_AFK_CHECK_INTERVAL_MS || 60_000);
const MAX_IDLE_REMINDERS_PER_SCENE = 1;

export const SESSION_AFK_CONFIRMATION = "Гаразд, сесія на паузі. Я не надсилатиму нагадування, поки ви не повернетеся.\n\nЩоб продовжити, просто напишіть будь-яку дію або натисніть ігрову кнопку.";
export const SESSION_ENDED_CONFIRMATION = "Сесію завершено. Я не надсилатиму нагадування, доки ви знову не звернетеся до бота. Пасивний голод теж стає на паузу; якщо просто відійти в AFK, світ і тіло живуть далі, але без нагадувань.\n\nЩоб повернутися, напишіть /start або будь-яку ігрову команду.";

function autoAfkCutoff(now = new Date()) {
  return new Date(now.getTime() - config.autoAfkAfterMinutes * 60_000);
}

function autoEndSessionCutoff(now = new Date()) {
  return new Date(now.getTime() - config.autoEndSessionAfterMinutes * 60_000);
}

export function isAutoAfkDue(session: { sessionPresence?: PlayerSessionPresence | string | null; remindersPaused?: boolean | null; lastPlayerActionAt?: Date | null }, now = new Date()) {
  if (session.sessionPresence !== "ACTIVE" || session.remindersPaused || !session.lastPlayerActionAt) return false;
  return session.lastPlayerActionAt.getTime() <= autoAfkCutoff(now).getTime();
}

export function isAutoEndSessionDue(session: { sessionPresence?: PlayerSessionPresence | string | null; isAutoEnabled?: boolean | null; lastPlayerActionAt?: Date | null }, now = new Date()) {
  if (session.isAutoEnabled || !session.lastPlayerActionAt) return false;
  if (session.sessionPresence !== "ACTIVE" && session.sessionPresence !== "AFK") return false;
  return session.lastPlayerActionAt.getTime() <= autoEndSessionCutoff(now).getTime();
}

export function canSendProactiveMessage(session: {
  sessionPresence?: PlayerSessionPresence | string | null;
  remindersPaused?: boolean | null;
  onboardingComplete?: boolean | null;
} | null | undefined) {
  if (!session) return false;
  if (session.onboardingComplete === false) return false;
  if (session.sessionPresence === "AFK" || session.sessionPresence === "ENDED") return false;
  if (session.remindersPaused) return false;
  return true;
}

export function isAutoActionNote(note?: string | null) {
  return typeof note === "string" && note.startsWith("auto:");
}

export function canSendPlayerActionMessage(session: {
  sessionPresence?: PlayerSessionPresence | string | null;
  sessionPresenceReason?: string | null;
  remindersPaused?: boolean | null;
  onboardingComplete?: boolean | null;
  autoActionMessagesEnabled?: boolean | null;
} | null | undefined, actionNote?: string | null) {
  if (canSendProactiveMessage(session)) return true;
  if (!session || !isAutoActionNote(actionNote)) return false;
  if (session.onboardingComplete === false) return false;
  if (session.sessionPresence !== "AFK" || session.sessionPresenceReason !== "auto_afk") return false;
  return Boolean(session.autoActionMessagesEnabled);
}

function afkPastLabel(player: { grammaticalGender?: string | null; pronoun?: string | null }) {
  const gender = actorGrammarGender(player);
  if (gender === "FEMININE") return "відійшла";
  if (gender === "NEUTER") return "відійшло";
  if (gender === "PLURAL") return "відійшли";
  return "відійшов";
}

export function playerPresenceDisplaySuffix(player: {
  sessionPresence?: PlayerSessionPresence | string | null;
  grammaticalGender?: string | null;
  pronoun?: string | null;
} | null | undefined) {
  return player?.sessionPresence === "AFK" ? ` (${afkPastLabel(player)})` : "";
}

export function sessionPresenceReasonLabel(reason?: string | null) {
  if (reason === "manual_afk") return "ручний AFK (/afk або кнопка)";
  if (reason === "auto_afk") return "авто-AFK через неактивність";
  if (reason === "auto_end_session") return "автозавершення сесії через довгу неактивність";
  if (reason === "end_session") return "завершення сесії";
  if (reason === "player_interaction") return "повернення через взаємодію";
  return "не записано";
}

export function sessionPresenceLabel(session: {
  sessionPresence?: PlayerSessionPresence | string | null;
  remindersPaused?: boolean | null;
  sessionPresenceReason?: string | null;
  sessionPresenceChangedAt?: Date | null;
}, formatDate: (date: Date) => string = (date) => date.toISOString()) {
  const presence = session.sessionPresence ?? "ACTIVE";
  const state =
    presence === "AFK" ? "AFK / відійшов"
      : presence === "ENDED" ? "сесію завершено"
        : "активний";
  const paused = session.remindersPaused ? "нагадування на паузі" : "нагадування активні";
  const reason = sessionPresenceReasonLabel(session.sessionPresenceReason);
  const changedAt = session.sessionPresenceChangedAt ? `; змінено: ${formatDate(session.sessionPresenceChangedAt)}` : "";
  return `${state}; ${paused}; причина: ${reason}${changedAt}`;
}

export type SessionReturnMarker = {
  from: PlayerSessionPresence | string;
  since: Date | null;
};

function pluralForm(value: number, forms: [string, string, string]) {
  const abs = Math.abs(value);
  const lastTwo = abs % 100;
  const last = abs % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

function durationUnit(value: number, forms: [string, string, string]) {
  return `${value} ${pluralForm(value, forms)}`;
}

export function sessionAbsenceDurationText(ms: number) {
  let minutes = Math.max(1, Math.round(ms / 60_000));
  const units: string[] = [];

  const years = Math.floor(minutes / (365 * 24 * 60));
  if (years > 0) {
    units.push(durationUnit(years, ["рік", "роки", "років"]));
    minutes -= years * 365 * 24 * 60;
  }

  const months = Math.floor(minutes / (30 * 24 * 60));
  if (months > 0) {
    units.push(durationUnit(months, ["місяць", "місяці", "місяців"]));
    minutes -= months * 30 * 24 * 60;
  }

  const days = Math.floor(minutes / (24 * 60));
  if (days > 0) {
    units.push(durationUnit(days, ["день", "дні", "днів"]));
    minutes -= days * 24 * 60;
  }

  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    units.push(durationUnit(hours, ["годину", "години", "годин"]));
    minutes -= hours * 60;
  }

  if (minutes > 0 || units.length === 0) {
    units.push(durationUnit(minutes, ["хвилину", "хвилини", "хвилин"]));
  }

  if (units.length <= 1) return units[0];
  return units.slice(0, 2).join(" і ");
}

export function renderSessionReturnHint(marker: SessionReturnMarker | null | undefined, now = new Date()) {
  if (!marker || (marker.from !== "AFK" && marker.from !== "ENDED")) return null;

  const pauseKind = marker.from === "ENDED" ? "сесія була завершена" : "стежка на мить стихла";
  const since = marker.since ? ` Приблизно ${sessionAbsenceDurationText(Math.max(0, now.getTime() - marker.since.getTime()))} вас не було чути.` : "";
  return `Ви знову прислухаєтеся до Чорнолісу: ${pauseKind}.${since}`;
}

export function idleReminderSceneKeyForLocation(locationId: number | null | undefined) {
  return locationId ? `location:${locationId}` : null;
}

export function canSendIdleReminder(session: {
  sessionPresence?: PlayerSessionPresence | string | null;
  remindersPaused?: boolean | null;
  awaitingPlayerInput?: boolean | null;
  idleReminderSceneKey?: string | null;
  idleReminderCountForCurrentScene?: number | null;
  currentIdleReminderSceneKey?: string | null;
} | null | undefined) {
  if (!canSendProactiveMessage(session)) return false;
  if (!session?.awaitingPlayerInput) return false;
  const currentSceneKey = session.currentIdleReminderSceneKey ?? null;
  if (!currentSceneKey) return false;
  const count = session.idleReminderSceneKey === currentSceneKey ? session.idleReminderCountForCurrentScene ?? 0 : 0;
  return count < MAX_IDLE_REMINDERS_PER_SCENE;
}

export function canSendScheduledIdleReminder(session: Parameters<typeof canSendIdleReminder>[0], scheduledSceneKey: string | null | undefined) {
  if (!scheduledSceneKey) return false;
  if (session?.currentIdleReminderSceneKey !== scheduledSceneKey) return false;
  return canSendIdleReminder(session);
}

export async function claimIdleReminderForPlayerScene(playerId: number, sceneKey: string) {
  await applyAutoAfkByPlayerId(playerId);
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      sessionPresence: true,
      remindersPaused: true,
      currentLocationId: true,
      idleReminderSceneKey: true,
      idleReminderCountForCurrentScene: true,
    },
  });
  if (!player) return false;

  const currentSceneKey = idleReminderSceneKeyForLocation(player.currentLocationId);
  if (!canSendScheduledIdleReminder({ ...player, awaitingPlayerInput: true, currentIdleReminderSceneKey: currentSceneKey }, sceneKey)) return false;

  await prisma.player.updateMany({
    where: { id: playerId },
    data: {
      idleReminderSceneKey: sceneKey,
      idleReminderCountForCurrentScene: player.idleReminderSceneKey === sceneKey ? { increment: 1 } : 1,
    },
  });
  return true;
}

export async function applyAutoAfkForPlayer(player: { id: number; sessionPresence: PlayerSessionPresence; remindersPaused: boolean; lastPlayerActionAt: Date | null }, now = new Date()) {
  if (!isAutoAfkDue(player, now)) return false;

  await prisma.player.updateMany({
    where: { id: player.id, sessionPresence: "ACTIVE", remindersPaused: false },
    data: { sessionPresence: "AFK", sessionPresenceReason: "auto_afk", sessionPresenceChangedAt: now, remindersPaused: true },
  });
  return true;
}

export async function applyAutoEndSessionForPlayer(player: { id: number; sessionPresence: PlayerSessionPresence; isAutoEnabled: boolean; lastPlayerActionAt: Date | null }, now = new Date()) {
  if (!isAutoEndSessionDue(player, now)) return false;

  await prisma.player.updateMany({
    where: { id: player.id, sessionPresence: { in: ["ACTIVE", "AFK"] }, isAutoEnabled: false },
    data: { sessionPresence: "ENDED", sessionPresenceReason: "auto_end_session", sessionPresenceChangedAt: now, remindersPaused: true },
  });
  return true;
}

export async function applyAutoAfkByPlayerId(playerId: number, now = new Date()) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, sessionPresence: true, remindersPaused: true, lastPlayerActionAt: true },
  });
  return player ? applyAutoAfkForPlayer(player, now) : false;
}

export async function canSendProactiveToPlayerId(playerId: number) {
  await applyAutoAfkByPlayerId(playerId);
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { sessionPresence: true, remindersPaused: true, onboardingComplete: true },
  });
  return canSendProactiveMessage(player);
}

export async function canSendPlayerActionMessageToPlayerId(playerId: number, actionNote?: string | null) {
  await applyAutoAfkByPlayerId(playerId);
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      sessionPresence: true,
      sessionPresenceReason: true,
      remindersPaused: true,
      onboardingComplete: true,
      autoActionMessagesEnabled: true,
    },
  });
  return canSendPlayerActionMessage(player, actionNote);
}

export async function canSendProactiveToTelegramId(telegramId: string | number) {
  const player = await prisma.player.findUnique({
    where: { telegramId: String(telegramId) },
    select: { id: true, sessionPresence: true, remindersPaused: true, lastPlayerActionAt: true, onboardingComplete: true },
  });
  if (!player) return false;
  await applyAutoAfkForPlayer(player);
  const refreshed = await prisma.player.findUnique({
    where: { id: player.id },
    select: { sessionPresence: true, remindersPaused: true, onboardingComplete: true },
  });
  return canSendProactiveMessage(refreshed);
}

export async function markPlayerInteraction(telegramId: string | number) {
  const player = await prisma.player.findUnique({
    where: { telegramId: String(telegramId) },
    select: { id: true, sessionPresence: true, sessionPresenceChangedAt: true, lastPlayerActionAt: true },
  });
  if (!player) return null;

  const now = new Date();
  await prisma.player.updateMany({
    where: { id: player.id },
    data: {
      lastPlayerActionAt: now,
      sessionPresence: "ACTIVE",
      sessionPresenceReason: "player_interaction",
      sessionPresenceChangedAt: now,
      remindersPaused: false,
    },
  });
  return player.sessionPresence === "AFK" || player.sessionPresence === "ENDED"
    ? { from: player.sessionPresence, since: player.lastPlayerActionAt ?? player.sessionPresenceChangedAt }
    : null;
}

export async function setPlayerAfk(telegramId: string | number) {
  const now = new Date();
  const player = await prisma.player.update({
    where: { telegramId: String(telegramId) },
    data: {
      sessionPresence: "AFK",
      sessionPresenceReason: "manual_afk",
      sessionPresenceChangedAt: now,
      remindersPaused: true,
      lastPlayerActionAt: now,
    },
    select: { telegramId: true, isAutoEnabled: true },
  });
  return player;
}

export async function endPlayerSession(telegramId: string | number) {
  const now = new Date();
  const player = await prisma.player.update({
    where: { telegramId: String(telegramId) },
    data: {
      sessionPresence: "ENDED",
      sessionPresenceReason: "end_session",
      sessionPresenceChangedAt: now,
      remindersPaused: true,
      lastPlayerActionAt: now,
    },
    select: { telegramId: true, isAutoEnabled: true },
  });
  return player;
}

export function registerSessionPresenceMiddleware(bot: Bot) {
  bot.use(async (ctx, next) => {
    if (ctx.from?.id && (ctx.message || ctx.callbackQuery)) {
      const returnMarker = await markPlayerInteraction(ctx.from.id).catch(() => undefined);
      if (returnMarker) (ctx as any).sessionReturnMarker = returnMarker;
    }
    await next();
  });
}

export function startAutoAfkLoop() {
  const run = async () => {
    try {
      await prisma.player.updateMany({
        where: {
          sessionPresence: { in: ["ACTIVE", "AFK"] },
          isAutoEnabled: false,
          lastPlayerActionAt: { lt: autoEndSessionCutoff() },
        },
        data: { sessionPresence: "ENDED", sessionPresenceReason: "auto_end_session", sessionPresenceChangedAt: new Date(), remindersPaused: true },
      });
      await prisma.player.updateMany({
        where: {
          sessionPresence: "ACTIVE",
          remindersPaused: false,
          lastPlayerActionAt: { lt: autoAfkCutoff() },
        },
        data: { sessionPresence: "AFK", sessionPresenceReason: "auto_afk", sessionPresenceChangedAt: new Date(), remindersPaused: true },
      });
    } catch (error) {
      console.warn("Auto-AFK check failed:", error);
    }
  };

  void run();
  setInterval(run, AUTO_AFK_CHECK_INTERVAL_MS);
}

export async function afkReplyOptions(telegramId: string | number) {
  const numeric = Number(telegramId);
  return Number.isSafeInteger(numeric)
    ? { reply_markup: await buildMainReplyKeyboardForTelegramId(numeric, false) }
    : undefined;
}
