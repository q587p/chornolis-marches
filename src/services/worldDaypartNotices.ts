import { Bot } from "grammy";
import { prisma, type PrismaDb } from "../db";
import {
  START_WORLD_ABSOLUTE_MINUTE,
  worldTimeSnapshotFromAbsoluteMinute,
  type WorldDaypart,
} from "../data/worldClock";
import { notifyAllDaypartNoticePlayers } from "./notifications";
import { ensureWorldState } from "./worldTime";

export const WORLD_DAYPART_NOTICE_EVENT_TITLE = "World Daypart Notice";

const START_DAYPART = worldTimeSnapshotFromAbsoluteMinute(START_WORLD_ABSOLUTE_MINUTE).daypart;

export function worldDaypartNoticeText(daypart: WorldDaypart) {
  if (daypart === "dawn") {
    return "🌅 Настав світанок.\n\nСвіт поволі світлішає; тіні ще тримаються низько, але стежки вже легше читаються очима.";
  }
  if (daypart === "day") {
    return "☀️ День розвиднився.\n\nМісцини відкриваються ясніше, а дрібні речі менше ховаються в тіні.";
  }
  if (daypart === "dusk") {
    return "🌘 Настав присмерк.\n\nСвіт темнішає; дрібні сліди, рухи й речі вже легше загубити поглядом.";
  }
  return "🌑 Настала ніч.\n\nЧорноліс стишує видиме. Вогонь, жар і факел тепер важать більше, ніж удень.";
}

function worldDaypartNoticeEventDescription(daypart: WorldDaypart, absoluteMinute: number, clockLabel: string) {
  return `daypart=${daypart}; absoluteMinute=${absoluteMinute}; clock=${clockLabel}`;
}

export function daypartFromNoticeDescription(description?: string | null): WorldDaypart | null {
  const value = description?.match(/\bdaypart=(dawn|day|dusk|night)\b/)?.[1];
  return value === "dawn" || value === "day" || value === "dusk" || value === "night" ? value : null;
}

export async function notifyWorldDaypartChangeIfNeeded(bot: Bot, db: PrismaDb = prisma) {
  const state = await ensureWorldState(db);
  const snapshot = worldTimeSnapshotFromAbsoluteMinute(state.absoluteMinute, state.weatherKey, state.weatherIntensity);
  const latest = await db.worldEvent.findFirst({
    where: { type: "SYSTEM", title: WORLD_DAYPART_NOTICE_EVENT_TITLE },
    orderBy: { id: "desc" },
    select: { description: true },
  });
  const previousDaypart = daypartFromNoticeDescription(latest?.description);

  if (previousDaypart === snapshot.daypart) return false;

  await db.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: WORLD_DAYPART_NOTICE_EVENT_TITLE,
      description: worldDaypartNoticeEventDescription(snapshot.daypart, snapshot.absoluteMinute, snapshot.clockLabel),
    },
  });

  const shouldNotify = Boolean(previousDaypart) || snapshot.daypart !== START_DAYPART;
  if (shouldNotify) {
    await notifyAllDaypartNoticePlayers(bot, worldDaypartNoticeText(snapshot.daypart));
  }

  return shouldNotify;
}
