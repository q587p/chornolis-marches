import { Bot } from "grammy";
import { PlayerSessionPresence } from "@prisma/client";
import { config } from "../config";
import { prisma } from "../db";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";

const AUTO_AFK_CHECK_INTERVAL_MS = Number(process.env.AUTO_AFK_CHECK_INTERVAL_MS || 60_000);
const MAX_IDLE_REMINDERS_PER_SCENE = 1;

export const SESSION_AFK_CONFIRMATION = "Гаразд, сесія на паузі. Я не надсилатиму нагадування, поки ви не повернетеся.\n\nЩоб продовжити, просто напишіть будь-яку дію або натисніть ігрову кнопку.";
export const SESSION_ENDED_CONFIRMATION = "Сесію завершено. Я не надсилатиму нагадування, доки ви знову не звернетеся до бота.\n\nЩоб повернутися, напишіть /start або будь-яку ігрову команду.";

function autoAfkCutoff(now = new Date()) {
  return new Date(now.getTime() - config.autoAfkAfterMinutes * 60_000);
}

export function isAutoAfkDue(session: { sessionPresence?: PlayerSessionPresence | string | null; remindersPaused?: boolean | null; lastPlayerActionAt?: Date | null }, now = new Date()) {
  if (session.sessionPresence !== "ACTIVE" || session.remindersPaused || !session.lastPlayerActionAt) return false;
  return session.lastPlayerActionAt.getTime() <= autoAfkCutoff(now).getTime();
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

export function playerPresenceDisplaySuffix(player: { sessionPresence?: PlayerSessionPresence | string | null } | null | undefined) {
  return player?.sessionPresence === "AFK" ? " (відійшов)" : "";
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
    data: { sessionPresence: "AFK", remindersPaused: true },
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
    select: { id: true, sessionPresence: true },
  });
  if (!player) return null;

  await prisma.player.updateMany({
    where: { id: player.id },
    data: {
      lastPlayerActionAt: new Date(),
      sessionPresence: "ACTIVE",
      remindersPaused: false,
    },
  });
  return player.sessionPresence === "AFK" || player.sessionPresence === "ENDED" ? player.sessionPresence : null;
}

export async function setPlayerAfk(telegramId: string | number) {
  const player = await prisma.player.update({
    where: { telegramId: String(telegramId) },
    data: {
      sessionPresence: "AFK",
      remindersPaused: true,
      lastPlayerActionAt: new Date(),
    },
    select: { telegramId: true, isAutoEnabled: true },
  });
  return player;
}

export async function endPlayerSession(telegramId: string | number) {
  const player = await prisma.player.update({
    where: { telegramId: String(telegramId) },
    data: {
      sessionPresence: "ENDED",
      remindersPaused: true,
      lastPlayerActionAt: new Date(),
    },
    select: { telegramId: true, isAutoEnabled: true },
  });
  return player;
}

export function registerSessionPresenceMiddleware(bot: Bot) {
  bot.use(async (ctx, next) => {
    if (ctx.from?.id && (ctx.message || ctx.callbackQuery)) {
      await markPlayerInteraction(ctx.from.id).catch(() => undefined);
    }
    await next();
  });
}

export function startAutoAfkLoop() {
  const run = async () => {
    try {
      await prisma.player.updateMany({
        where: {
          sessionPresence: "ACTIVE",
          remindersPaused: false,
          lastPlayerActionAt: { lt: autoAfkCutoff() },
        },
        data: { sessionPresence: "AFK", remindersPaused: true },
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
