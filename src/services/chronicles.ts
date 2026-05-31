import { prisma } from "../db";
import { playerForms } from "./grammar";

export const CHRONICLE_TITLE_PREFIX = "Chronicle:";
export const NEW_PLAYER_CHRONICLE_KIND = "new_player";
export const CARCASS_QUEST_STARTED_KIND = "carcass_quest_started";
export const CARCASS_QUEST_STOPPED_KIND = "carcass_quest_stopped";

type ChronicleEventLike = {
  title: string;
  description: string | null;
  createdAt: Date;
};

function chronicleTitle(kind: string) {
  return `${CHRONICLE_TITLE_PREFIX} ${kind}`;
}

export function formatChronicleDate(value: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    day: "numeric",
    month: "long",
  }).format(value);
}

export function formatChronicleTime(value: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function chronicleLine(event: ChronicleEventLike) {
  return `${formatChronicleTime(event.createdAt)} | ${event.description ?? event.title}`;
}

export function renderGlobalChronicles(events: ChronicleEventLike[]) {
  const lines = ["📜 Хроніки Порубіжжя"];
  let previousDate = "";

  if (events.length === 0) {
    return `${lines.join("\n")}\n\nПоки на корі немає свіжих зарубок.`;
  }

  for (const event of events) {
    const date = formatChronicleDate(event.createdAt);
    if (date !== previousDate) {
      lines.push("", date);
      previousDate = date;
    }
    lines.push(chronicleLine(event));
  }

  return lines.join("\n");
}

export async function latestGlobalChronicles(take = 30) {
  const events = await prisma.worldEvent.findMany({
    where: { title: { startsWith: CHRONICLE_TITLE_PREFIX } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });
  return renderGlobalChronicles(events);
}

export async function recordNewPlayerChronicle(player: { id: number; nameNominative: string | null; firstName: string | null }) {
  const existing = await prisma.worldEvent.findFirst({
    where: {
      title: chronicleTitle(NEW_PLAYER_CHRONICLE_KIND),
      playerId: player.id,
    },
    select: { id: true },
  });
  if (existing) return;

  const name = playerForms(player).nominative;
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: chronicleTitle(NEW_PLAYER_CHRONICLE_KIND),
      description: `👋 Новий слід у Порубіжжі: ${name}.`,
      playerId: player.id,
    },
  });
}

export async function recordCarcassQuestChronicle(mode: "start" | "stop", locationId?: number | null) {
  const kind = mode === "start" ? CARCASS_QUEST_STARTED_KIND : CARCASS_QUEST_STOPPED_KIND;
  const latest = await prisma.worldEvent.findFirst({
    where: { title: { startsWith: `${CHRONICLE_TITLE_PREFIX} carcass_quest_` } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { title: true },
  });
  if (latest?.title === chronicleTitle(kind)) return;

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: chronicleTitle(kind),
      description: mode === "start"
        ? "🦴 Падальний рів знову кличе до здобичі."
        : "🦴 Біля падального рову прибили бересту: поки досить.",
      locationId: locationId ?? undefined,
    },
  });
}
