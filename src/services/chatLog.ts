import { WorldEventType } from "@prisma/client";
import { prisma } from "../db";

const CHAT_EVENT_TYPES: WorldEventType[] = ["SAY", "NPC_SAY", "GREET", "SOCIAL_SIGNAL"];

export type ChatLogWindow = number | "all";

export function normalizeChatLogWindow(raw?: string | null): ChatLogWindow {
  const value = raw?.trim().toLowerCase();
  if (!value || value === "24") return 24;
  if (value === "all" || value === "всі" || value === "усі") return "all";
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 24 * 365) : 24;
}

export function chatLogWindowLabel(window: ChatLogWindow) {
  if (window === "all") return "увесь час";
  if (window < 1) return `${Math.round(window * 60)} хв`;
  return `${window} год`;
}

export function chatLogWindowToken(window: ChatLogWindow) {
  return window === "all" ? "all" : String(window);
}

export async function getChatLog(input: { window?: ChatLogWindow; page?: number; perPage?: number } = {}) {
  const window = input.window ?? 24;
  const page = Math.max(0, Math.floor(input.page ?? 0));
  const perPage = Math.max(1, Math.min(Math.floor(input.perPage ?? 25), 100));
  const since = window === "all" ? undefined : new Date(Date.now() - window * 60 * 60 * 1000);
  const where = {
    type: { in: CHAT_EVENT_TYPES },
    ...(since ? { createdAt: { gte: since } } : {}),
  };

  const [total, events] = await Promise.all([
    prisma.worldEvent.count({ where }),
    prisma.worldEvent.findMany({
      where,
      include: { location: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: page * perPage,
      take: perPage,
    }),
  ]);

  return {
    events,
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    window,
    since,
  };
}
