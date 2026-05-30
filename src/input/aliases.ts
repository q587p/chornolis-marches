import { Direction } from "@prisma/client";

export type GatherKey = "berries" | "mushrooms" | "herbs";
export type UseItemKey = "berries" | "herbs" | "mushrooms" | "cooked_meat";
export type TargetAction = "inspect" | "greet" | "attack" | "freshen";
export type QueueAliasMode = "status" | "cancel-current" | "clear";
export type AutoAliasMode = "start" | "stop";
export type RestAliasMode = "start" | "queue" | "interrupt";
export type PostureAliasMode = "sit" | "stand";
export type SocialSignalAlias = "smile" | "laugh" | "nod" | "bow" | "point" | "glare" | "sigh" | "wave";
export type ChatAliasMode = "time" | "location" | "character";
export type PutAliasAmount = number | "all";
export type SessionPresenceAliasMode = "afk" | "end";

export type ParsedAliasCommand =
  | { kind: "location" }
  | { kind: "glance" }
  | { kind: "exits" }
  | { kind: "look-action" }
  | { kind: "me" }
  | { kind: "inventory" }
  | { kind: "help" }
  | { kind: "news" }
  | { kind: "stat" }
  | { kind: "who" }
  | { kind: "chat"; mode?: ChatAliasMode; window?: string }
  | { kind: "all"; showDead?: boolean }
  | { kind: "time" }
  | { kind: "menu" }
  | { kind: "session-presence"; mode: SessionPresenceAliasMode }
  | { kind: "back" }
  | { kind: "hide-keyboard" }
  | { kind: "move"; direction: Direction }
  | { kind: "gather"; resourceKey?: GatherKey }
  | { kind: "use-item"; item: UseItemKey }
  | { kind: "light-torch" }
  | { kind: "douse-torch" }
  | { kind: "sleep"; tutorial?: boolean }
  | { kind: "wake" }
  | { kind: "open"; target?: string }
  | { kind: "inspect-inventory-item"; target: string }
  | { kind: "drop-inventory-item"; target: string }
  | { kind: "posture"; mode: PostureAliasMode }
  | { kind: "rest"; mode: RestAliasMode }
  | { kind: "auto"; mode: AutoAliasMode }
  | { kind: "queue"; mode: QueueAliasMode }
  | { kind: "track"; detail?: boolean }
  | { kind: "inspect-vegetation" }
  | { kind: "inspect-border-marker" }
  | { kind: "inspect-feature"; target: string; detail?: "brief" | "full" }
  | { kind: "wait" }
  | { kind: "add-twigs-campfire" }
  | { kind: "cook-meat" }
  | { kind: "put-item"; item: string; amount?: PutAliasAmount; container: string }
  | { kind: "say"; text: string }
  | { kind: "whisper"; text: string }
  | { kind: "reply"; text: string }
  | { kind: "shout"; text: string }
  | { kind: "target-action"; action: TargetAction; target: string }
  | { kind: "pickup-target"; target: string }
  | { kind: "social-signal"; signal: SocialSignalAlias; target?: string };

export type AliasSuggestion = {
  alias: string;
  command?: string;
};

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

  enter: "INSIDE",
  inside: "INSIDE",
  in: "INSIDE",
  "вср": "INSIDE",
  "всередину": "INSIDE",
  "усередину": "INSIDE",
  "увійти": "INSIDE",
  "зайти": "INSIDE",

  leave: "OUTSIDE",
  outside: "OUTSIDE",
  out: "OUTSIDE",
  "наз": "OUTSIDE",
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

  glance: { kind: "glance" },
  "quick look": { kind: "glance" },
  "quick glance": { kind: "glance" },
  "глянути швидко": { kind: "glance" },
  "швидко глянути": { kind: "glance" },
  "коротко глянути": { kind: "glance" },
  "швидкий огляд": { kind: "glance" },

  exits: { kind: "exits" },
  exit: { kind: "exits" },
  "виходи": { kind: "exits" },
  "шляхи": { kind: "exits" },
  "куди можна йти": { kind: "exits" },
  "куди можна піти": { kind: "exits" },

  examine: { kind: "look-action" },
  observe: { kind: "look-action" },
  watch: { kind: "look-action" },
  x: { kind: "look-action" },
  "озирнутися": { kind: "look-action" },
  "озирнись": { kind: "look-action" },
  "оглянутися": { kind: "look-action" },
  "оглянути": { kind: "look-action" },
  "роззирнутися": { kind: "look-action" },
  "див": { kind: "look-action" },
  "дивитися": { kind: "look-action" },
  "спостерігати": { kind: "look-action" },
  "поспостерігати": { kind: "look-action" },
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
  "інвентар": { kind: "inventory" },
  inventory: { kind: "inventory" },
  inv: { kind: "inventory" },
  "речі": { kind: "inventory" },
  "що в мене": { kind: "inventory" },
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

  who: { kind: "who" },
  "хто": { kind: "who" },
  "хто активний": { kind: "who" },
  "хто тут": { kind: "who" },
  "хто поруч": { kind: "who" },

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
  "сховати клавіатуру": { kind: "hide-keyboard" },
  "прибрати клавіатуру": { kind: "hide-keyboard" },
  "прибрати кнопки": { kind: "hide-keyboard" },
  "hide keyboard": { kind: "hide-keyboard" },

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
  "перепочинок": { kind: "rest", mode: "start" },
  "почати відпочинок": { kind: "rest", mode: "start" },
  "додати відпочинок": { kind: "rest", mode: "queue" },
  "додати відпочинок у чергу": { kind: "rest", mode: "queue" },
  "поставити відпочинок у чергу": { kind: "rest", mode: "queue" },
  "перервати відпочинок": { kind: "rest", mode: "interrupt" },

  sit: { kind: "posture", mode: "sit" },
  "sit down": { kind: "posture", mode: "sit" },
  "сісти": { kind: "posture", mode: "sit" },
  "присісти": { kind: "posture", mode: "sit" },
  stand: { kind: "posture", mode: "stand" },
  "stand up": { kind: "posture", mode: "stand" },
  "встати": { kind: "posture", mode: "stand" },
  "підвестися": { kind: "posture", mode: "stand" },
  "підвестись": { kind: "posture", mode: "stand" },

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
  "queue cancel": { kind: "queue", mode: "cancel-current" },
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
  "cook meat": { kind: "cook-meat" },
  "cook raw meat": { kind: "cook-meat" },
  "підсмажити м'ясо": { kind: "cook-meat" },
  "підсмажити м’ясо": { kind: "cook-meat" },
  "смажити м'ясо": { kind: "cook-meat" },
  "смажити м’ясо": { kind: "cook-meat" },
  "приготувати м'ясо": { kind: "cook-meat" },
  "приготувати м’ясо": { kind: "cook-meat" },

  "eat berries": { kind: "use-item", item: "berries" },
  "use berries": { kind: "use-item", item: "berries" },
  "з'їсти ягоди": { kind: "use-item", item: "berries" },
  "з’їсти ягоди": { kind: "use-item", item: "berries" },
  "зʼїсти ягоди": { kind: "use-item", item: "berries" },
  "зїсти ягоди": { kind: "use-item", item: "berries" },
  "їсти ягоди": { kind: "use-item", item: "berries" },
  "використати ягоди": { kind: "use-item", item: "berries" },
  "eat mushrooms": { kind: "use-item", item: "mushrooms" },
  "use mushrooms": { kind: "use-item", item: "mushrooms" },
  "use mushroom": { kind: "use-item", item: "mushrooms" },
  "з'їсти гриби": { kind: "use-item", item: "mushrooms" },
  "з’їсти гриби": { kind: "use-item", item: "mushrooms" },
  "зʼїсти гриби": { kind: "use-item", item: "mushrooms" },
  "зїсти гриби": { kind: "use-item", item: "mushrooms" },
  "їсти гриби": { kind: "use-item", item: "mushrooms" },
  "використати гриби": { kind: "use-item", item: "mushrooms" },
  "use herbs": { kind: "use-item", item: "herbs" },
  "use herb": { kind: "use-item", item: "herbs" },
  "eat herbs": { kind: "use-item", item: "herbs" },
  "eat herb": { kind: "use-item", item: "herbs" },
  "використати трави": { kind: "use-item", item: "herbs" },
  "використати лікарські трави": { kind: "use-item", item: "herbs" },
  "з'їсти трави": { kind: "use-item", item: "herbs" },
  "з’їсти трави": { kind: "use-item", item: "herbs" },
  "зʼїсти трави": { kind: "use-item", item: "herbs" },
  "зїсти трави": { kind: "use-item", item: "herbs" },
  "їсти трави": { kind: "use-item", item: "herbs" },
  "з'їсти лікарські трави": { kind: "use-item", item: "herbs" },
  "з’їсти лікарські трави": { kind: "use-item", item: "herbs" },
  "зʼїсти лікарські трави": { kind: "use-item", item: "herbs" },
  "зїсти лікарські трави": { kind: "use-item", item: "herbs" },
  "їсти лікарські трави": { kind: "use-item", item: "herbs" },
  "вжити трави": { kind: "use-item", item: "herbs" },
  "прикласти трави": { kind: "use-item", item: "herbs" },
  "лікуватися травами": { kind: "use-item", item: "herbs" },
  "eat cooked meat": { kind: "use-item", item: "cooked_meat" },
  "eat meat": { kind: "use-item", item: "cooked_meat" },
  "use cooked meat": { kind: "use-item", item: "cooked_meat" },
  "з'їсти м'ясо": { kind: "use-item", item: "cooked_meat" },
  "з’їсти м’ясо": { kind: "use-item", item: "cooked_meat" },
  "їсти смажене м'ясо": { kind: "use-item", item: "cooked_meat" },
  "їсти смажене м’ясо": { kind: "use-item", item: "cooked_meat" },
  "використати смажене м'ясо": { kind: "use-item", item: "cooked_meat" },
  "використати смажене м’ясо": { kind: "use-item", item: "cooked_meat" },
  "light torch": { kind: "light-torch" },
  "use torch": { kind: "light-torch" },
  "запалити факел": { kind: "light-torch" },
  "підпалити факел": { kind: "light-torch" },
  "douse torch": { kind: "douse-torch" },
  "extinguish torch": { kind: "douse-torch" },
  "put out torch": { kind: "douse-torch" },
  "загасити факел": { kind: "douse-torch" },
  "погасити факел": { kind: "douse-torch" },
  "притушити факел": { kind: "douse-torch" },
  "потушити факел": { kind: "douse-torch" },

  sleep: { kind: "sleep" },
  tutorial: { kind: "sleep", tutorial: true },
  "sleep tutorial": { kind: "sleep", tutorial: true },
  "tutorial sleep": { kind: "sleep", tutorial: true },
  "сон": { kind: "sleep" },
  "навчання": { kind: "sleep", tutorial: true },
  "туторіал": { kind: "sleep", tutorial: true },
  "навчальний сон": { kind: "sleep", tutorial: true },
  "сон навчання": { kind: "sleep", tutorial: true },
  "пройти навчання": { kind: "sleep", tutorial: true },
  "повернутися до навчання": { kind: "sleep", tutorial: true },
  "повернутися в навчання": { kind: "sleep", tutorial: true },
  "повернутися до сну": { kind: "sleep", tutorial: true },
  "повернутися в сон": { kind: "sleep", tutorial: true },
  "спати": { kind: "sleep" },
  "заснути": { kind: "sleep" },
  "прокинутися": { kind: "wake" },
  "прокинутись": { kind: "wake" },
  wake: { kind: "wake" },
  wakeup: { kind: "wake" },
  "відкрити": { kind: "open" },
  "відчинити": { kind: "open" },
  "відчини": { kind: "open" },
  "відчиняй": { kind: "open" },
  "відкрий": { kind: "open" },
  "відкр": { kind: "open" },
  "відч": { kind: "open" },
  "привідкрити": { kind: "open" },
  "прочинити": { kind: "open" },
  "отворити": { kind: "open" },
  open: { kind: "open" },
  o: { kind: "open" },
};

const COMPACT_ALIASES: Record<string, ParsedAliasCommand> = {
  "хтоя": { kind: "me" },
  "дея": { kind: "location" },
  whereami: { kind: "location" },
};

const SUGGESTABLE_PATTERN_ALIASES = [
  "say",
  "сказати",
  "говорити",
  "мовити",
  "промовити",
  "whisper",
  "шепнути",
  "прошепотіти",
  "reply",
  "відповісти",
  "shout",
  "yell",
  "крик",
  "крикнути",
  "кричати",
  "закричати",
  "викрикнути",
  "вигукнути",
  "гук",
  "гукнути",
  "загукати",
  "клич",
  "кликати",
  "покликати",
  "волати",
  "заволати",
  "freshen all",
  "свіжувати все",
  "освіжити всі",
  "smile",
  "усміхнутися",
  "усміхнутись",
  "посміхнутися",
  "посміхнутись",
  "усміх",
  "посміх",
  "laugh",
  "засміятися",
  "сміятися",
  "nod",
  "кивнути",
  "bow",
  "вклонитися",
  "point",
  "вказати",
  "glare",
  "насупитися",
  "sigh",
  "зітхнути",
  "wave",
  "помахати",
  "махнути",
];

const SUGGESTABLE_ALIASES = [...new Set([...Object.keys(EXACT_ALIASES), ...Object.keys(DIRECTION_ALIASES), ...SUGGESTABLE_PATTERN_ALIASES])];

function normalizeSlashCommand(text: string) {
  return text.replace(/^\/([^\s@]+)@[A-Za-z0-9_]+/i, "/$1");
}

export function normalizeInput(raw: string) {
  return normalizeSlashCommand(raw.trim())
    .toLowerCase()
    .replace(APOSTROPHES, "'")
    .replace(/_/g, " ")
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

  const compactCandidatePrefix = compactCandidate.slice(0, compactQuery.length);
  const fuzzyLimit = compactQuery.length >= 5 ? 2 : compactQuery.length >= 4 ? 1 : 0;
  if (fuzzyLimit > 0 && editDistance(compactQuery, compactCandidatePrefix) <= fuzzyLimit) return 6;

  return Number.POSITIVE_INFINITY;
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = previous[j];
      previous[j] = left[i - 1] === right[j - 1]
        ? diagonal
        : Math.min(previous[j - 1] + 1, above + 1, diagonal + 1);
      diagonal = above;
    }
  }
  return previous[right.length];
}

function slashCommandForAlias(alias: string): string | undefined {
  const parsed = parseAlias(alias);
  if (!parsed) {
    if (["say", "сказати", "говорити", "мовити", "промовити"].includes(alias)) return "/say";
    if (["whisper", "шепнути", "прошепотіти"].includes(alias)) return "/whisper";
    if (["reply", "відповісти"].includes(alias)) return "/reply";
    if (["shout", "yell", "крик", "крикнути", "кричати", "закричати", "викрикнути", "вигукнути", "гук", "гукнути", "загукати", "клич", "кликати", "покликати", "волати", "заволати"].includes(alias)) return "/shout";
    return undefined;
  }

  if (parsed.kind === "location") return "/look";
  if (parsed.kind === "glance") return "/glance";
  if (parsed.kind === "exits") return "/exits";
  if (parsed.kind === "look-action") {
    if (["озирнутися", "озирнись", "оглянутися", "роззирнутися", "див", "дивитися", "що видно", "довкола"].includes(alias)) return "/look";
    return "/examine";
  }
  if (parsed.kind === "help") return "/help";
  if (parsed.kind === "me") return "/me";
  if (parsed.kind === "inventory") return "/inventory";
  if (parsed.kind === "news") return "/news";
  if (parsed.kind === "stat") return "/stat";
  if (parsed.kind === "who") return "/who";
  if (parsed.kind === "all") return "/all";
  if (parsed.kind === "time") return "/time";
  if (parsed.kind === "menu") return "/menu";
  if (parsed.kind === "session-presence") return parsed.mode === "afk" ? "/afk" : "/end_session";
  if (parsed.kind === "chat") return "/chat";
  if (parsed.kind === "sleep") return parsed.tutorial ? "/sleep_tutorial" : "/sleep";
  if (parsed.kind === "wake") return "/wake";
  if (parsed.kind === "open") return "/open";
  if (parsed.kind === "gather") return parsed.resourceKey ? `/gather_${parsed.resourceKey}` : "/gather";
  if (parsed.kind === "use-item") return `/use_${parsed.item}`;
  if (parsed.kind === "light-torch") return "/light_torch";
  if (parsed.kind === "douse-torch") return "/douse_torch";
  if (parsed.kind === "posture") return parsed.mode === "sit" ? "/sit" : "/stand";
  if (parsed.kind === "rest") return "/rest";
  if (parsed.kind === "auto") return "/auto";
  if (parsed.kind === "queue") return "/queue";
  if (parsed.kind === "track") return "/track";
  if (parsed.kind === "inspect-vegetation" || parsed.kind === "inspect-border-marker" || parsed.kind === "inspect-feature") return "/examine";
  if (parsed.kind === "wait") return "/wait";
  if (parsed.kind === "add-twigs-campfire") return "/add_twigs_campfire";
  if (parsed.kind === "cook-meat") return "/cook_meat";
  if (parsed.kind === "put-item") return "/put";
  if (parsed.kind === "inspect-inventory-item") return "/item";
  if (parsed.kind === "drop-inventory-item") return "/drop";
  if (parsed.kind === "pickup-target") return "/get";
  if (parsed.kind === "social-signal") return `/${parsed.signal}`;
  if (parsed.kind === "target-action") {
    if (parsed.action === "attack") return "/attack";
    if (parsed.action === "freshen") return isAllTargetToken(parsed.target) ? "/freshen_all" : "/freshen";
    if (parsed.action === "inspect") return "/examine";
  }
  return undefined;
}

function isAllTargetToken(target: string) {
  return ["all", "все", "усе", "всі", "усі"].includes(target.trim().toLowerCase());
}

export function formatAliasSuggestion(suggestion: AliasSuggestion) {
  return suggestion.command ? `${suggestion.alias} (${suggestion.command})` : suggestion.alias;
}

export function suggestAliasEntries(raw: string, limit = 4): AliasSuggestion[] {
  const query = withoutLeadingSlash(normalizeInput(raw));
  if (!query) return [];

  return SUGGESTABLE_ALIASES
    .map((alias) => ({ alias, score: aliasSuggestionScore(query, alias) }))
    .filter((item) => Number.isFinite(item.score) && item.alias !== query)
    .sort((a, b) => a.score - b.score || a.alias.length - b.alias.length || a.alias.localeCompare(b.alias, "uk"))
    .slice(0, limit)
    .map((item) => ({ alias: item.alias, command: slashCommandForAlias(item.alias) }));
}

export function suggestAliasInputs(raw: string, limit = 4) {
  return suggestAliasEntries(raw, limit).map((item) => item.alias);
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

  const enterExitMatch = text.match(/^(?:enter|leave|увійти|зайти|вийти|піднятися|спуститися)(?:\s+(.+))?$/);
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
  const gatheredResource = parseGatherResource(resource);
  if (gatheredResource) return gatheredResource;
  if (["torch", "torches", "факел", "факели", "факела", "факелів", "twigs", "хмиз"].includes(resource)) return { kind: "pickup-target", target: resource };
  return null;
}

function parseGatherResource(resource: string): ParsedAliasCommand | null {
  if (["berries", "berry", "ягоди", "ягід"].includes(resource)) return { kind: "gather", resourceKey: "berries" };
  if (["mushrooms", "mushroom", "гриби", "грибів"].includes(resource)) return { kind: "gather", resourceKey: "mushrooms" };
  if (["herbs", "herb", "трави", "трав", "лікарські трави", "зілля", "зіллячко"].includes(resource)) return { kind: "gather", resourceKey: "herbs" };
  return null;
}

function parseSay(raw: string, text: string): ParsedAliasCommand | null {
  const echoedSay = raw.trim().match(/^ви\s+сказали(?:\s*[:：]\s*|\s+)([\s\S]+)$/iu);
  if (echoedSay?.[1]?.trim()) {
    const said = echoedSay[1].trim().slice(0, 300);
    return said ? { kind: "say", text: said } : null;
  }

  const match = text.match(/^\/?(say|сказати|говорити|мовити|промовити|ск|сказ|гов)\s+(.+)$/);
  if (!match) return null;
  if (match[1] === "говорити" && match[2].trim().startsWith("з ")) return null;

  const rawMatch = raw.match(/^\/?(say|сказати|говорити|мовити|промовити|ск|сказ|гов)\s+(.+)$/i);
  const said = (rawMatch?.[2] ?? match[2]).trim().slice(0, 300);
  return said ? { kind: "say", text: said } : null;
}

function parseDirectedSpeech(raw: string, text: string): ParsedAliasCommand | null {
  const whisper = text.match(/^\/?(?:whisper|шепнути|прошепотіти|шеп)\s+(.+)$/);
  if (whisper?.[1]?.trim()) {
    const rawMatch = raw.match(/^\/?(?:whisper|шепнути|прошепотіти|шеп)\s+(.+)$/i);
    const speech = (rawMatch?.[1] ?? whisper[1]).trim().slice(0, 300);
    return speech ? { kind: "whisper", text: speech } : null;
  }

  const reply = text.match(/^\/?(?:reply|відповісти|відповідь)\s+(.+)$/);
  if (reply?.[1]?.trim()) {
    const rawMatch = raw.match(/^\/?(?:reply|відповісти|відповідь)\s+(.+)$/i);
    const speech = (rawMatch?.[1] ?? reply[1]).trim().slice(0, 300);
    return speech ? { kind: "reply", text: speech } : null;
  }

  const shout = text.match(/^\/?(?:shout|yell|крик|крикнути|кричати|закричати|викрикнути|вигукнути|гук|гукнути|загукати|клич|кликати|покликати|волати|заволати)\s+(.+)$/);
  if (shout?.[1]?.trim()) {
    const rawMatch = raw.match(/^\/?(?:shout|yell|крик|крикнути|кричати|закричати|викрикнути|вигукнути|гук|гукнути|загукати|клич|кликати|покликати|волати|заволати)\s+(.+)$/i);
    const speech = (rawMatch?.[1] ?? shout[1]).trim().slice(0, 300);
    return speech ? { kind: "shout", text: speech } : null;
  }

  return null;
}

function parseChat(text: string): ParsedAliasCommand | null {
  const match = text.match(/^chat(?:\s+(.+))?$/);
  if (!match) return null;

  const args = match[1]?.trim();
  if (!args) return { kind: "chat" };
  const parts = args.split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (["time", "location", "character"].includes(first)) {
    return { kind: "chat", mode: first as ChatAliasMode, window: parts[1] };
  }
  return { kind: "chat", mode: "time", window: first };
}

function parseAll(text: string): ParsedAliasCommand | null {
  const match = text.match(/^all(?:\s+(.+))?$/);
  if (!match) return null;
  return { kind: "all", showDead: match[1]?.trim() === "dead" };
}

function parseTrackIntent(text: string): ParsedAliasCommand | null {
  if (/^(?:examine|inspect|look|x|роздивитися|роздивитись|придивитися|придивитись|оглянути|глянути)(?:\s+(?:tracks|track|сліди|слід)|\s+до\s+(?:слідів|сліду))$/.test(text)) {
    return { kind: "track", detail: true };
  }
  return null;
}

function parseVegetationInspectionIntent(text: string): ParsedAliasCommand | null {
  if (/^(?:examine|inspect|look|x)(?:\s+(?:grass|vegetation|depleted grass|depleted vegetation))$/.test(text)) {
    return { kind: "inspect-vegetation" };
  }
  if (/^(?:роздивитися|роздивитись|придивитися|придивитись|оглянути|глянути)(?:\s+(?:траву|винищену траву|винищену рослинність)|\s+до\s+(?:трави|винищеної трави))$/.test(text)) {
    return { kind: "inspect-vegetation" };
  }
  if (/^(?:оцінити|перевірити)(?:\s+(?:траву|відновлення|відновлення трави|стан трави))$/.test(text)) {
    return { kind: "inspect-vegetation" };
  }
  return null;
}

function parseBorderMarkerInspectionIntent(text: string): ParsedAliasCommand | null {
  if (/^(?:examine|inspect|look|x)(?:\s+(?:sign|marker|border marker|boundary marker))$/.test(text)) {
    return { kind: "inspect-border-marker" };
  }
  if (/^(?:роздивитися|роздивитись|придивитися|придивитись|оглянути|глянути)(?:\s+(?:знак|межовий знак)|\s+до\s+(?:знака|межового знака))$/.test(text)) {
    return { kind: "inspect-border-marker" };
  }
  return null;
}

function parseFeatureInspectionIntent(text: string): ParsedAliasCommand | null {
  const brief = text.match(/^(?:look\s+at|look|оглянути|огл|глянути\s+на|глянути(?!\s+(?:швидко|коротко))|подивитися\s+на|дивитися\s+на|дивитися|озирнутися\s+на|озирнутися)\s+(.+)$/);
  if (brief?.[1]?.trim()) return { kind: "inspect-feature", target: brief[1].trim(), detail: "brief" };

  const full = text.match(/^(?:x|examine|inspect|роздивитися|роздивитись|придивитися\s+до|придивитись\s+до|придивитися|придивитись)\s+(.+)$/);
  if (full?.[1]?.trim()) return { kind: "inspect-feature", target: full[1].trim(), detail: "full" };

  return null;
}

function parseOpenIntent(text: string): ParsedAliasCommand | null {
  const match = text.match(/^(?:open|o|відкрити|відчинити|відчини|відчиняй|відкрий|відкр|відч|привідкрити|прочинити|отворити)(?:\s+(.+))?$/u);
  if (!match) return null;
  const target = match[1]?.trim();
  return target ? { kind: "open", target } : { kind: "open" };
}

function parseTargetAction(text: string): ParsedAliasCommand | null {
  const patterns: Array<[TargetAction, RegExp]> = [
    ["inspect", /^(?:look\s+at|look|x|examine|inspect|роздивитися|оглянути|огл|глянути\s+на|подивитися\s+на|придивитися\s+до)\s+(.+)$/],
    ["attack", /^(?:attack|fight|hit|kill|kick|атакувати|напасти\s+на|напасти|вдарити|ударити|копнути|бити|битися\s+з)\s+(.+)$/],
    ["greet", /^(?:greet|привітати|привітатися\s+з|заговорити\s+з|говорити\s+з|звернутися\s+до)\s+(.+)$/],
    ["freshen", /^(?:freshen|butcher|освіжувати|освіжити|свіжувати|свіжити|зняти\s+шкуру\s+з|оббілувати|розібрати|обробити|підготувати\s+м'ясо\s+з|підготувати\s+м’ясо\s+з)\s+(.+)$/],
  ];

  for (const [action, pattern] of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return { kind: "target-action", action, target: match[1].trim() };
  }

  return null;
}

function parsePickup(text: string): ParsedAliasCommand | null {
  const match = text.match(/^(?:pickup|pick|take|get|підібрати|підняти|взяти|забрати)\s+(.+)$/);
  if (!match?.[1]?.trim()) return null;
  const target = match[1].trim();
  return { kind: "pickup-target", target };
}

function parseInventoryItemAction(text: string): ParsedAliasCommand | null {
  const drop = text.match(/^(?:drop|discard|throw away|викинути|кинути|покласти на землю)\s+(.+)$/);
  if (drop?.[1]?.trim()) return { kind: "drop-inventory-item", target: drop[1].trim() };

  const inspect = text.match(/^(?:inspect item|examine item|look at item|item|річ|речі|оглянути в речах|роздивитися в речах)\s+(.+)$/);
  if (inspect?.[1]?.trim()) return { kind: "inspect-inventory-item", target: inspect[1].trim() };

  return null;
}

function amountFromPutToken(token: string): PutAliasAmount | null {
  if (["all", "все", "усе", "всі", "усі"].includes(token)) return "all";
  if (/^\d+$/.test(token)) {
    const amount = Number(token);
    return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
  }
  return null;
}

function normalizePutItemText(value: string) {
  return value
    .replace(/^(?:all|все|усе|всі|усі)\s+/u, "")
    .replace(/\s+(?:all|все|усе|всі|усі)$/u, "")
    .trim();
}

function parsePutParts(value: string): { item: string; amount?: PutAliasAmount; container: string } | null {
  const withPreposition = value.match(/^(.+?)\s+(?:into|in|to|в|у|до)\s+(.+)$/u);
  if (withPreposition?.[1]?.trim() && withPreposition?.[2]?.trim()) {
    const itemWords = withPreposition[1].trim().split(/\s+/).filter(Boolean);
    let amount: PutAliasAmount | undefined;
    const firstAmount = itemWords.length ? amountFromPutToken(itemWords[0]) : null;
    const lastAmount = itemWords.length ? amountFromPutToken(itemWords[itemWords.length - 1]) : null;
    if (firstAmount) {
      amount = firstAmount;
      itemWords.shift();
    } else if (lastAmount) {
      amount = lastAmount;
      itemWords.pop();
    }
    const item = normalizePutItemText(itemWords.join(" "));
    return item ? { item, amount, container: withPreposition[2].trim() } : null;
  }

  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;

  const firstAmount = amountFromPutToken(words[0]);
  if (firstAmount && words.length >= 3) {
    return { amount: firstAmount, item: normalizePutItemText(words.slice(1, -1).join(" ")), container: words[words.length - 1] };
  }

  const amountIndex = words.findIndex((word) => amountFromPutToken(word) !== null);
  if (amountIndex > 0 && amountIndex < words.length - 1) {
    return {
      item: normalizePutItemText(words.slice(0, amountIndex).join(" ")),
      amount: amountFromPutToken(words[amountIndex]) ?? undefined,
      container: words.slice(amountIndex + 1).join(" "),
    };
  }

  return {
    item: normalizePutItemText(words.slice(0, -1).join(" ")),
    container: words[words.length - 1],
  };
}

function parsePutIntent(text: string): ParsedAliasCommand | null {
  if (text === "put out torch") return null;
  const defaultMatch = text.match(/^(?:put|покласти|класти)$/u);
  if (defaultMatch) return { kind: "put-item", item: "туша", container: "рів" };

  const match = text.match(/^(?:put|покласти|класти)\s+(.+)$/u);
  if (!match?.[1]?.trim()) return null;
  const parsed = parsePutParts(match[1].trim());
  if (!parsed?.item || !parsed.container) return null;
  return { kind: "put-item", ...parsed };
}

function parseSocialSignal(text: string): ParsedAliasCommand | null {
  const patterns: Array<[SocialSignalAlias, RegExp, boolean]> = [
    ["smile", /^(?:smile|усміхнутися|усміхнутись|посміхнутися|посміхнутись|усміх|посміх)(?:\s+(.+))?$/, true],
    ["laugh", /^(?:laugh|засміятися|засміятись|сміятися|сміятись)(?:\s+(.+))?$/, true],
    ["nod", /^(?:nod|кивнути|кивнути\s+до|кивнути\s+на)(?:\s+(.+))?$/, true],
    ["bow", /^(?:bow|вклонитися|вклонитись|уклонитися|уклонитись)(?:\s+(.+))?$/, true],
    ["point", /^(?:point|вказати|показати\s+на|вказати\s+на)\s+(.+)$/, false],
    ["glare", /^(?:glare|насупитися|насупитись|витріщитися|витріщитись)(?:\s+(.+))?$/, true],
    ["sigh", /^(?:sigh|зітхнути|зітхнути\s+до|зітхнути\s+на)(?:\s+(.+))?$/, true],
    ["wave", /^(?:wave|помахати|махнути|помахати\s+до|помахати\s+на)(?:\s+(.+))?$/, true],
  ];

  for (const [signal, pattern, allowTargetless] of patterns) {
    const match = text.match(pattern);
    if (match) {
      const target = match[1]?.trim();
      if (target) return { kind: "social-signal", signal, target };
      if (allowTargetless) return { kind: "social-signal", signal };
    }
  }

  return null;
}

export function parseAlias(raw: string): ParsedAliasCommand | null {
  const text = normalizeInput(raw);
  if (!text) return null;
  const commandText = withoutLeadingSlash(text);

  if (["afk", "відійти"].includes(commandText)) return { kind: "session-presence", mode: "afk" };
  if (["end session", "end-session", "endsession", "quit", "leave", "завершити сесію", "вийти"].includes(commandText)) return { kind: "session-presence", mode: "end" };

  const directedSpeech = parseDirectedSpeech(raw, text);
  if (directedSpeech) return directedSpeech;

  const say = parseSay(raw, text);
  if (say) return say;

  const chat = parseChat(commandText);
  if (chat) return chat;

  const all = parseAll(commandText);
  if (all) return all;

  const trackIntent = parseTrackIntent(commandText);
  if (trackIntent) return trackIntent;

  const vegetationIntent = parseVegetationInspectionIntent(commandText);
  if (vegetationIntent) return vegetationIntent;

  const borderMarkerIntent = parseBorderMarkerInspectionIntent(commandText);
  if (borderMarkerIntent) return borderMarkerIntent;

  const inventoryItemAction = parseInventoryItemAction(commandText);
  if (inventoryItemAction) return inventoryItemAction;

  const putIntent = parsePutIntent(commandText);
  if (putIntent) return putIntent;

  const openIntent = parseOpenIntent(commandText);
  if (openIntent) return openIntent;

  const featureIntent = parseFeatureInspectionIntent(commandText);
  if (featureIntent) return featureIntent;

  const target = parseTargetAction(commandText);
  if (target) return target;

  const pickup = parsePickup(commandText);
  if (pickup) return pickup;

  const signal = parseSocialSignal(commandText);
  if (signal) return signal;

  const direction = parseDirectionPhrase(text);
  if (direction) return direction;

  const gather = parseGather(commandText);
  if (gather) return gather;

  const exactKey = commandText;
  if (EXACT_ALIASES[exactKey]) return EXACT_ALIASES[exactKey];
  if (EXACT_ALIASES[text]) return EXACT_ALIASES[text];

  const compact = compactKey(exactKey);
  if (COMPACT_ALIASES[compact]) return COMPACT_ALIASES[compact];

  return null;
}
