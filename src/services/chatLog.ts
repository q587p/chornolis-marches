import { WorldEventType } from "@prisma/client";
import { prisma } from "../db";

const CHAT_EVENT_TYPES: WorldEventType[] = ["SAY", "NPC_SAY", "GREET", "SOCIAL_SIGNAL"];
const CREATURE_SPEECH_MARKERS = ["лісовик"];

export type ChatLogWindow = number | "all";
export type ChatLogMode = "time" | "location" | "character";
export type ChatLogResult = Awaited<ReturnType<typeof getChatLog>>;

type PublicChatEventInput = {
  type: WorldEventType | string;
  title?: string | null;
  description?: string | null;
  location?: { name: string } | null;
};

const CHAT_LOG_MODE_TOKENS = new Set([
  "time",
  "location",
  "locations",
  "loc",
  "character",
  "characters",
  "char",
  "місцина",
  "місцини",
  "персонаж",
  "персонажі",
]);

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

export function normalizeChatLogMode(raw?: string | null): ChatLogMode {
  const value = raw?.trim().toLowerCase();
  if (value === "location" || value === "locations" || value === "loc" || value === "місцина" || value === "місцини") return "location";
  if (value === "character" || value === "characters" || value === "char" || value === "персонаж" || value === "персонажі") return "character";
  return "time";
}

export function chatLogModeLabel(mode: ChatLogMode) {
  if (mode === "location") return "за місциною";
  if (mode === "character") return "за персонажем";
  return "за часом";
}

export function chatLogModeToken(mode: ChatLogMode) {
  return mode;
}

export function parseChatLogRequest(raw?: string | null): { mode: ChatLogMode; window: ChatLogWindow } {
  const parts = raw?.trim().split(/\s+/).filter(Boolean) ?? [];
  const first = parts[0]?.toLowerCase();
  if (first && CHAT_LOG_MODE_TOKENS.has(first)) {
    const mode = normalizeChatLogMode(first);
    return { mode, window: normalizeChatLogWindow(parts[1]) };
  }
  return { mode: "time", window: normalizeChatLogWindow(parts[0]) };
}

function isCreatureSpeechEvent(event: PublicChatEventInput) {
  if (event.type !== "NPC_SAY") return false;
  const haystack = `${event.title ?? ""}\n${event.description ?? ""}`.toLocaleLowerCase("uk-UA");
  return CREATURE_SPEECH_MARKERS.some((marker) => haystack.includes(marker));
}

export function publicChatEventType(event: PublicChatEventInput) {
  if (event.type === "NPC_SAY" && !isCreatureSpeechEvent(event)) return "SAY";
  return String(event.type);
}

export function publicChatEventDescription(event: PublicChatEventInput) {
  if (event.type === "SOCIAL_SIGNAL" && event.description === "location") return "";
  return event.description ?? "";
}

export function chatEventCharacterLabel(event: PublicChatEventInput) {
  const title = String(event.title ?? "").trim();
  if (!title) return "невідомий мовець";
  const splitters = [
    /\s+каже\b/u,
    /\s+промовляє\b/u,
    /\s+сказав\b/u,
    /\s+сказала\b/u,
    /\s+сказали\b/u,
    /\s+вітає\b/u,
    /\s+киває\b/u,
    /\s+усміхається\b/u,
    /\s+махає\b/u,
    /\s+вклоняється\b/u,
    /\s+жестом\b/u,
  ];
  for (const splitter of splitters) {
    const match = title.match(splitter);
    if (match?.index && match.index > 0) return title.slice(0, match.index).trim();
  }
  return title;
}

export function chatEventGroupLabel(event: PublicChatEventInput, mode: ChatLogMode) {
  if (mode === "location") return event.location?.name ?? "невідома місцина";
  if (mode === "character") return chatEventCharacterLabel(event);
  return "";
}

export function publicChatLog<T extends { events: PublicChatEventInput[] }>(log: T) {
  return {
    ...log,
    events: log.events.map((event) => ({
      ...event,
      type: publicChatEventType(event),
      description: publicChatEventDescription(event),
    })),
  };
}

export async function getChatLog(input: { mode?: ChatLogMode; window?: ChatLogWindow; page?: number; perPage?: number } = {}) {
  const mode = input.mode ?? "time";
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
      orderBy: chatLogOrderBy(mode),
      skip: page * perPage,
      take: perPage,
    }),
  ]);

  return {
    events,
    mode,
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    window,
    since,
  };
}

function chatLogOrderBy(mode: ChatLogMode) {
  if (mode === "location") return [{ locationId: "asc" as const }, { createdAt: "desc" as const }, { id: "desc" as const }];
  if (mode === "character") return [{ title: "asc" as const }, { createdAt: "desc" as const }, { id: "desc" as const }];
  return [{ createdAt: "desc" as const }, { id: "desc" as const }];
}
