import { InlineKeyboard } from "grammy";
import { PlayerSleepState } from "@prisma/client";
import { prisma, type PrismaDb } from "../db";

export const SETTINGS_TITLE = "⚙️ Налаштування";

export const DAYPART_NOTICE_HINT_TEXT = [
  "Підказка після сну",
  "",
  "Світ буде й далі мінятися без вас. Якщо повідомлення про світанок, день, присмерк і ніч заважають, їх можна вимкнути в ⚙️ Налаштуваннях або командою /daynotices off.",
  "",
  "Але тоді доведеться бути уважнішим: звіряйте /time, /weather, світло, тіні й описи місцини.",
].join("\n");

export const DAYPART_NOTICES_DISABLED_TEXT = [
  "Зміни часу дня вимкнено. Я не кликатиму вас на світанок, день, присмерк і ніч.",
  "",
  "Будьте уважніші: /time, /weather, світло, тіні й описи місцини тепер важать більше.",
].join("\n");

export const DAYPART_NOTICES_ENABLED_TEXT =
  "Зміни часу дня увімкнено. Я знову повідомлятиму про світанок, день, присмерк і ніч, коли ви не спите й не в навчальному сні.";

export const AUTO_ACTION_MESSAGES_ENABLED_TEXT =
  "Авто-повідомлення увімкнено. Якщо авто веде персонажа далі, я показуватиму вибір і результати його дій навіть після довшої тиші з вашого боку.";

export const AUTO_ACTION_MESSAGES_DISABLED_TEXT =
  "Авто-повідомлення вимкнено. Авто може вести персонажа далі, але після вашої довшої тиші Порубіжжя не засипатиме чат кожним кроком.";

export type PlayerNotificationSettings = {
  daypartNoticesEnabled: boolean;
  autoActionMessagesEnabled: boolean;
};

export function renderNotificationSettings(input: PlayerNotificationSettings) {
  return [
    SETTINGS_TITLE,
    "",
    `Повідомлення про зміну часу дня: ${input.daypartNoticesEnabled ? "увімкнено" : "вимкнено"}`,
    `Авто-повідомлення: ${input.autoActionMessagesEnabled ? "увімкнено" : "вимкнено"}`,
    "",
    input.daypartNoticesEnabled
      ? "Зміни часу дня коротко нагадують про світанок, день, присмерк і ніч. Якщо вимкнути їх, світ не стане безпечнішим: доведеться частіше звіряти /time, /weather, світло, тіні й описи місцини."
      : "Світ усе одно світлішає, темнішає і змінюється. Ви просто не отримуєте окремих повідомлень про межі дня.",
    "",
    input.autoActionMessagesEnabled
      ? "Авто-повідомлення показують, що саме обирає авто і чим закінчуються його дії, навіть якщо ви вже давно не натискали кнопок."
      : "Коли авто ввімкнене, але ви довго не взаємодієте з ботом, частина рутинних авто-повідомлень може стихати, щоб не перетворюватися на флуд.",
  ].join("\n");
}

export function buildSettingsKeyboard(input: PlayerNotificationSettings) {
  const keyboard = new InlineKeyboard();
  if (input.daypartNoticesEnabled) {
    keyboard.text("Вимкнути зміни часу дня", "settings:daypart:off");
  } else {
    keyboard.text("Увімкнути зміни часу дня", "settings:daypart:on");
  }
  keyboard.row();
  if (input.autoActionMessagesEnabled) {
    keyboard.text("Вимкнути авто-повідомлення", "settings:autoMessages:off");
  } else {
    keyboard.text("Увімкнути авто-повідомлення", "settings:autoMessages:on");
  }
  return keyboard.row().text("↩️ Назад", "settings:back");
}

export function buildDaypartNoticeHintKeyboard() {
  return new InlineKeyboard()
    .text("Вимкнути зміни часу дня", "settings:daypart:off")
    .row()
    .text("Зрозуміло", "settings:hint-dismiss");
}

export type DaypartNoticeEligibilityInput = {
  currentLocationId?: number | null;
  sleepState?: PlayerSleepState | string | null;
  daypartNoticesEnabled?: boolean | null;
  isDreamLocation?: boolean;
};

export function canReceiveDaypartNotice(input: DaypartNoticeEligibilityInput) {
  return Boolean(input.currentLocationId)
    && input.sleepState === PlayerSleepState.AWAKE
    && input.daypartNoticesEnabled !== false
    && !input.isDreamLocation;
}

export function shouldShowDaypartNoticeHint(input: {
  daypartNoticesEnabled: boolean;
  daypartNoticeHintShown: boolean;
  ordinaryWakeCount: number;
}) {
  return input.daypartNoticesEnabled && !input.daypartNoticeHintShown && input.ordinaryWakeCount >= 2;
}

export async function notificationSettingsForPlayer(playerId: number, db: PrismaDb = prisma) {
  return db.player.findUnique({
    where: { id: playerId },
    select: { id: true, daypartNoticesEnabled: true, autoActionMessagesEnabled: true },
  });
}

export async function notificationSettingsForTelegramId(telegramId: number | string, db: PrismaDb = prisma) {
  return db.player.findUnique({
    where: { telegramId: String(telegramId) },
    select: { id: true, daypartNoticesEnabled: true, autoActionMessagesEnabled: true },
  });
}

export async function setDaypartNoticesEnabled(playerId: number, enabled: boolean, db: PrismaDb = prisma) {
  return db.player.update({
    where: { id: playerId },
    data: { daypartNoticesEnabled: enabled },
    select: { id: true, daypartNoticesEnabled: true, autoActionMessagesEnabled: true },
  });
}

export async function setAutoActionMessagesEnabled(playerId: number, enabled: boolean, db: PrismaDb = prisma) {
  return db.player.update({
    where: { id: playerId },
    data: { autoActionMessagesEnabled: enabled },
    select: { id: true, daypartNoticesEnabled: true, autoActionMessagesEnabled: true },
  });
}

export async function recordOrdinaryWakeAndClaimDaypartHint(playerId: number, db: PrismaDb = prisma) {
  const player = await db.player.findUnique({
    where: { id: playerId },
    select: {
      daypartNoticesEnabled: true,
      daypartNoticeHintShown: true,
      ordinaryWakeCount: true,
    },
  });
  if (!player) return null;

  const nextWakeCount = player.ordinaryWakeCount + 1;
  const shouldClaim = shouldShowDaypartNoticeHint({
    daypartNoticesEnabled: player.daypartNoticesEnabled,
    daypartNoticeHintShown: player.daypartNoticeHintShown,
    ordinaryWakeCount: nextWakeCount,
  });

  if (!shouldClaim) {
    await db.player.updateMany({
      where: { id: playerId },
      data: { ordinaryWakeCount: { increment: 1 } },
    });
    return null;
  }

  const claimed = await db.player.updateMany({
    where: {
      id: playerId,
      daypartNoticesEnabled: true,
      daypartNoticeHintShown: false,
    },
    data: {
      ordinaryWakeCount: { increment: 1 },
      daypartNoticeHintShown: true,
    },
  });

  return claimed.count > 0 ? DAYPART_NOTICE_HINT_TEXT : null;
}
