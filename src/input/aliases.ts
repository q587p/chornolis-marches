import { Direction } from "@prisma/client";

export type GatherKey = "berries" | "mushrooms" | "herbs";
export type TargetAction = "inspect" | "greet" | "attack" | "freshen";
export type QueueAliasMode = "status" | "cancel-current" | "clear";
export type AutoAliasMode = "start" | "stop";
export type RestAliasMode = "start" | "queue" | "interrupt";
export type SocialSignalAlias = "smile" | "laugh" | "nod" | "bow" | "point" | "glare" | "sigh" | "wave";

export type ParsedAliasCommand =
  | { kind: "location" }
  | { kind: "look-action" }
  | { kind: "me" }
  | { kind: "help" }
  | { kind: "news" }
  | { kind: "stat" }
  | { kind: "chat" }
  | { kind: "time" }
  | { kind: "menu" }
  | { kind: "back" }
  | { kind: "move"; direction: Direction }
  | { kind: "gather"; resourceKey?: GatherKey }
  | { kind: "rest"; mode: RestAliasMode }
  | { kind: "auto"; mode: AutoAliasMode }
  | { kind: "queue"; mode: QueueAliasMode }
  | { kind: "track" }
  | { kind: "wait" }
  | { kind: "add-twigs-campfire" }
  | { kind: "say"; text: string }
  | { kind: "target-action"; action: TargetAction; target: string }
  | { kind: "pickup-target"; target: string }
  | { kind: "social-signal"; signal: SocialSignalAlias; target: string };

const APOSTROPHES = /[ʼ’`´]/g;
const TRAILING_PUNCTUATION = /[!?.,;:]+$/g;

const DIRECTION_ALIASES: Record<string, Direction> = {
  north: "NORTH",
  n: "NORTH",
  "північ": "NORTH",
  "пн": "NORTH",
  "п": "NORTH",
  pivnich: "NORTH",

  south: "SOUTH",
  s: "SOUTH",
  "південь": "SOUTH",
  "пд": "SOUTH",
  pivden: "SOUTH",

  east: "EAST",
  e: "EAST",
  "схід": "EAST",
  "сх": "EAST",
  skhid: "EAST",
  shid: "EAST",

  west: "WEST",
  w: "WEST",
  "захід": "WEST",
  "зх": "WEST",
  "з": "WEST",
  zakhid: "WEST",
  zahid: "WEST",

  up: "UP",
  u: "UP",
  "вгору": "UP",
  "нагору": "UP",
  "піднятися": "UP",

  down: "DOWN",
  d: "DOWN",
  "вниз": "DOWN",
  "донизу": "DOWN",
  "спуститися": "DOWN",

  inside: "INSIDE",
  in: "INSIDE",
  "всередину": "INSIDE",
  "усередину": "INSIDE",
  "увійти": "INSIDE",
  "зайти": "INSIDE",

  outside: "OUTSIDE",
  out: "OUTSIDE",
  "назовні": "OUTSIDE",
  "надвір": "OUTSIDE",
  "вийти": "OUTSIDE",
};

const EXACT_ALIASES: Record<string, ParsedAliasCommand> = {
  look: { kind: "location" },
  l: { kind: "location" },
  loc: { kind: "location" },
  location: { kind: "location" },
  "де я": { kind: "location" },
  "де стою": { kind: "location" },
  "де я стою": { kind: "location" },
  "де я зараз": { kind: "location" },
  "місцина": { kind: "location" },
  "локація": { kind: "location" },
  "місце": { kind: "location" },
  room: { kind: "location" },

  examine: { kind: "look-action" },
  x: { kind: "look-action" },
  "озирнутися": { kind: "look-action" },
  "озирнись": { kind: "look-action" },
  "оглянутися": { kind: "look-action" },
  "роззирнутися": { kind: "look-action" },
  "придивитися": { kind: "look-action" },
  "роздивитися": { kind: "look-action" },
  "що видно": { kind: "look-action" },
  "довкола": { kind: "look-action" },

  me: { kind: "me" },
  i: { kind: "me" },
  whoami: { kind: "me" },
  "who am i": { kind: "me" },
  "хто я": { kind: "me" },
  "я": { kind: "me" },
  "про мене": { kind: "me" },
  "персонаж": { kind: "me" },
  "мій персонаж": { kind: "me" },
  "стан": { kind: "me" },
  "статус": { kind: "me" },
  "інвентар": { kind: "me" },
  "речі": { kind: "me" },
  "що в мене": { kind: "me" },
  hp: { kind: "me" },
  "хп": { kind: "me" },
  "здоров'я": { kind: "me" },
  "снага": { kind: "me" },
  "витривалість": { kind: "me" },
  "голод": { kind: "me" },

  help: { kind: "help" },
  h: { kind: "help" },
  "?": { kind: "help" },
  "допомога": { kind: "help" },
  "поміч": { kind: "help" },
  "команди": { kind: "help" },
  "що робити": { kind: "help" },
  "що мені робити": { kind: "help" },
  "як грати": { kind: "help" },
  "куди йти": { kind: "help" },

  news: { kind: "news" },
  "новини": { kind: "news" },
  "оновлення": { kind: "news" },
  "патч": { kind: "news" },
  "що нового": { kind: "news" },

  stat: { kind: "stat" },
  stats: { kind: "stat" },
  "статистика": { kind: "stat" },
  "екологія": { kind: "stat" },
  "стан світу": { kind: "stat" },

  chat: { kind: "chat" },
  "репліки": { kind: "chat" },
  "чат": { kind: "chat" },
  "журнал реплік": { kind: "chat" },

  time: { kind: "time" },
  "час": { kind: "time" },
  "котра година": { kind: "time" },
  "який час": { kind: "time" },

  menu: { kind: "menu" },
  "меню": { kind: "menu" },
  "дії": { kind: "menu" },
  "кнопки": { kind: "menu" },

  back: { kind: "back" },
  "назад": { kind: "back" },
  "повернутися": { kind: "back" },
  "до місцини": { kind: "back" },
  "до локації": { kind: "back" },

  gather: { kind: "gather" },
  "збирати": { kind: "gather" },
  "зібрати": { kind: "gather" },
  "шукати": { kind: "gather" },
  "пошукати": { kind: "gather" },
  "пошук поживи": { kind: "gather" },
  "збір": { kind: "gather" },

  rest: { kind: "rest", mode: "start" },
  "відпочити": { kind: "rest", mode: "start" },
  "перепочити": { kind: "rest", mode: "start" },
  "сісти": { kind: "rest", mode: "start" },
  "присісти": { kind: "rest", mode: "start" },
  "перепочинок": { kind: "rest", mode: "start" },
  "почати відпочинок": { kind: "rest", mode: "start" },
  "додати відпочинок": { kind: "rest", mode: "queue" },
  "додати відпочинок у чергу": { kind: "rest", mode: "queue" },
  "поставити відпочинок у чергу": { kind: "rest", mode: "queue" },
  "перервати відпочинок": { kind: "rest", mode: "interrupt" },

  auto: { kind: "auto", mode: "start" },
  "авто": { kind: "auto", mode: "start" },
  autostop: { kind: "auto", mode: "stop" },
  "auto stop": { kind: "auto", mode: "stop" },
  "увімкнути авто": { kind: "auto", mode: "start" },
  "ввімкнути авто": { kind: "auto", mode: "start" },
  "запустити авто": { kind: "auto", mode: "start" },
  "зупинити авто": { kind: "auto", mode: "stop" },
  "вимкнути авто": { kind: "auto", mode: "stop" },

  queue: { kind: "queue", mode: "status" },
  q: { kind: "queue", mode: "status" },
  "черга": { kind: "queue", mode: "status" },
  "план": { kind: "queue", mode: "status" },
  "план дій": { kind: "queue", mode: "status" },
  "що роблю": { kind: "queue", mode: "status" },
  "що в черзі": { kind: "queue", mode: "status" },

  stop: { kind: "queue", mode: "cancel-current" },
  "стоп": { kind: "queue", mode: "cancel-current" },
  "скасувати": { kind: "queue", mode: "cancel-current" },
  "перервати дію": { kind: "queue", mode: "cancel-current" },
  "скасувати дію": { kind: "queue", mode: "cancel-current" },
  "скасувати поточну": { kind: "queue", mode: "cancel-current" },

  "queue clear": { kind: "queue", mode: "clear" },
  "clear queue": { kind: "queue", mode: "clear" },
  "очистити чергу": { kind: "queue", mode: "clear" },
  "скинути чергу": { kind: "queue", mode: "clear" },
  "скасувати все": { kind: "queue", mode: "clear" },
  "стоп усе": { kind: "queue", mode: "clear" },

  track: { kind: "track" },
  "сліди": { kind: "track" },
  "відслідкувати": { kind: "track" },
  "вистежити": { kind: "track" },
  "шукати сліди": { kind: "track" },
  "йти слідом": { kind: "track" },

  wait: { kind: "wait" },
  w8: { kind: "wait" },
  "чекати": { kind: "wait" },
  "почекати": { kind: "wait" },
  "зачекати": { kind: "wait" },
  "нічого не робити": { kind: "wait" },
  "пропустити": { kind: "wait" },

  "add twigs campfire": { kind: "add-twigs-campfire" },
  "додати хмиз": { kind: "add-twigs-campfire" },
  "підкинути хмиз": { kind: "add-twigs-campfire" },
  "додати хмиз у вогнище": { kind: "add-twigs-campfire" },
};

const COMPACT_ALIASES: Record<string, ParsedAliasCommand> = {
  "хтоя": { kind: "me" },
  "дея": { kind: "location" },
  whereami: { kind: "location" },
};

const SUGGESTABLE_ALIASES = Object.keys(EXACT_ALIASES);

function normalizeSlashCommand(text: string) {
  return text.replace(/^\/([^\s@]+)@[A-Za-z0-9_]+/, "/$1");
}

export function normalizeInput(raw: string) {
  return normalizeSlashCommand(raw)
    .trim()
    .toLowerCase()
    .replace(APOSTROPHES, "'")
    .replace(TRAILING_PUNCTUATION, "")
    .replace(/\s+/g, " ");
}

function withoutLeadingSlash(text: string) {
  return text.startsWith("/") ? text.slice(1) : text;
}

function compactKey(text: string) {
  return text.replace(/[\s_-]+/g, "");
}

function aliasSuggestionScore(query: string, candidate: string) {
  if (!query) return Number.POSITIVE_INFINITY;

  const compactQuery = compactKey(query);
  const compactCandidate = compactKey(candidate);

  if (candidate === query) return 0;
  if (candidate.startsWith(query)) return 1;
  if (candidate.includes(query)) return 2;
  if (compactCandidate.startsWith(compactQuery)) return 3;
  if (compactCandidate.includes(compactQuery)) return 4;

  const queryWords = query.split(" ").filter(Boolean);
  if (queryWords.some((word) => word.length > 1 && candidate.split(" ").some((candidateWord) => candidateWord.startsWith(word)))) return 5;

  return Number.POSITIVE_INFINITY;
}

export function suggestAliasInputs(raw: string, limit = 4) {
  const query = withoutLeadingSlash(normalizeInput(raw));
  if (!query) return [];

  return SUGGESTABLE_ALIASES
    .map((alias) => ({ alias, score: aliasSuggestionScore(query, alias) }))
    .filter((item) => Number.isFinite(item.score) && item.alias !== query)
    .sort((a, b) => a.score - b.score || a.alias.length - b.alias.length || a.alias.localeCompare(b.alias, "uk"))
    .slice(0, limit)
    .map((item) => item.alias);
}

function directionFrom(raw: string) {
  const text = withoutLeadingSlash(raw).trim();
  return DIRECTION_ALIASES[text];
}

function parseDirectionPhrase(text: string): ParsedAliasCommand | null {
  const direct = directionFrom(text);
  if (direct) return { kind: "move", direction: direct };

  const moveMatch = text.match(/^(?:йти|іти|піти|пішов|рушити|рухатися|попрямувати|крокувати|go|move|walk)\s+(?:на\s+|to\s+)?(.+)$/);
  if (moveMatch) {
    const direction = directionFrom(moveMatch[1]);
    if (direction) return { kind: "move", direction };
  }

  const enterExitMatch = text.match(/^(?:увійти|зайти|вийти|піднятися|спуститися)(?:\s+(.+))?$/);
  if (enterExitMatch) {
    const verb = text.split(" ")[0];
    const byVerb = DIRECTION_ALIASES[verb];
    if (byVerb) return { kind: "move", direction: byVerb };
  }

  return null;
}

function parseGather(text: string): ParsedAliasCommand | null {
  const match = text.match(/^(?:gather|збирати|зібрати|шукати|пошукати|назбирати)\s+(.+)$/);
  if (!match) return null;

  const resource = match[1].trim();
  if (["berries", "berry", "ягоди", "ягід"].includes(resource)) return { kind: "gather", resourceKey: "berries" };
  if (["mushrooms", "mushroom", "гриби", "грибів"].includes(resource)) return { kind: "gather", resourceKey: "mushrooms" };
  if (["herbs", "herb", "трави", "трав", "лікарські трави", "зілля", "зіллячко"].includes(resource)) return { kind: "gather", resourceKey: "herbs" };
  if (["torch", "torches", "факел", "факели", "факела", "факелів"].includes(resource)) return { kind: "pickup-target", target: resource };
  return null;
}

function parseSay(raw: string, text: string): ParsedAliasCommand | null {
  const match = text.match(/^(?:\/say|say|\/сказати|сказати|мовити|промовити|крикнути)\s+(.+)$/);
  if (!match) return null;

  const rawMatch = raw.match(/^(?:\/say|say|\/сказати|сказати|мовити|промовити|крикнути)\s+(.+)$/i);
  const said = (rawMatch?.[1] ?? match[1]).trim().slice(0, 300);
  return said ? { kind: "say", text: said } : null;
}

function parseTrackIntent(text: string): ParsedAliasCommand | null {
  if (/^(?:examine|inspect|look|x|роздивитися|роздивитись|придивитися|придивитись|оглянути|глянути)(?:\s+(?:tracks|track|сліди|слід)|\s+до\s+(?:слідів|сліду))$/.test(text)) {
    return { kind: "track" };
  }
  return null;
}

function parseTargetAction(text: string): ParsedAliasCommand | null {
  const patterns: Array<[TargetAction, RegExp]> = [
    ["inspect", /^(?:look\s+at|look|x|examine|inspect|роздивитися|оглянути|глянути\s+на|подивитися\s+на|придивитися\s+до)\s+(.+)$/],
    ["attack", /^(?:attack|hit|kill|атакувати|напасти\s+на|напасти|вдарити|ударити|бити)\s+(.+)$/],
    ["greet", /^(?:greet|привітати|привітатися\s+з|заговорити\s+з|говорити\s+з|звернутися\s+до)\s+(.+)$/],
    ["freshen", /^(?:freshen|освіжувати|освіжити|зняти\s+шкуру\s+з|оббілувати|розібрати\s+труп)\s+(.+)$/],
  ];

  for (const [action, pattern] of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return { kind: "target-action", action, target: match[1].trim() };
  }

  return null;
}

function parsePickup(text: string): ParsedAliasCommand | null {
  const match = text.match(/^(?:pickup|take|get|підібрати|підняти|взяти|забрати)\s+(.+)$/);
  if (!match?.[1]?.trim()) return null;
  return { kind: "pickup-target", target: match[1].trim() };
}

function parseSocialSignal(text: string): ParsedAliasCommand | null {
  const patterns: Array<[SocialSignalAlias, RegExp]> = [
    ["smile", /^(?:smile|усміхнутися|усміхнутись|посміхнутися|посміхнутись)\s+(.+)$/],
    ["laugh", /^(?:laugh|засміятися|засміятись|сміятися|сміятись)\s+(.+)$/],
    ["nod", /^(?:nod|кивнути|кивнути\s+до|кивнути\s+на)\s+(.+)$/],
    ["bow", /^(?:bow|вклонитися|вклонитись|уклонитися|уклонитись)\s+(.+)$/],
    ["point", /^(?:point|вказати|показати\s+на|вказати\s+на)\s+(.+)$/],
    ["glare", /^(?:glare|насупитися|насупитись|витріщитися|витріщитись)\s+(.+)$/],
    ["sigh", /^(?:sigh|зітхнути|зітхнути\s+до|зітхнути\s+на)\s+(.+)$/],
    ["wave", /^(?:wave|помахати|махнути|помахати\s+до|помахати\s+на)\s+(.+)$/],
  ];

  for (const [signal, pattern] of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return { kind: "social-signal", signal, target: match[1].trim() };
  }

  return null;
}

export function parseAlias(raw: string): ParsedAliasCommand | null {
  const text = normalizeInput(raw);
  if (!text) return null;

  const say = parseSay(raw, text);
  if (say) return say;

  const trackIntent = parseTrackIntent(text);
  if (trackIntent) return trackIntent;

  const target = parseTargetAction(text);
  if (target) return target;

  const pickup = parsePickup(text);
  if (pickup) return pickup;

  const signal = parseSocialSignal(text);
  if (signal) return signal;

  const direction = parseDirectionPhrase(text);
  if (direction) return direction;

  const gather = parseGather(text);
  if (gather) return gather;

  const exactKey = withoutLeadingSlash(text);
  if (EXACT_ALIASES[exactKey]) return EXACT_ALIASES[exactKey];
  if (EXACT_ALIASES[text]) return EXACT_ALIASES[text];

  const compact = compactKey(exactKey);
  if (COMPACT_ALIASES[compact]) return COMPACT_ALIASES[compact];

  return null;
}
