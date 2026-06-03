import { Direction } from "@prisma/client";

export type GatherKey = "berries" | "mushrooms" | "herbs" | "honey" | "beeswax";
export type UseItemKey = "berries" | "herbs" | "mushrooms" | "cooked_meat";
export type TargetAction = "inspect" | "greet" | "attack" | "freshen";
export type QueueAliasMode = "status" | "cancel-current" | "clear";
export type AutoAliasMode = "start" | "stop";
export type RestAliasMode = "start" | "queue" | "interrupt";
export type PostureAliasMode = "sit" | "lie" | "stand";
export type SocialSignalAlias = "smile" | "laugh" | "nod" | "bow" | "point" | "glare" | "sigh" | "wave";
export type ChatAliasMode = "time" | "location" | "character";
export type PutAliasAmount = number | "all";
export type GiveAliasAmount = number;
export type SessionPresenceAliasMode = "afk" | "end";
export type DaypartNoticeAliasMode = "show" | "on" | "off";
export type AutoMessageAliasMode = "show" | "on" | "off";

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
  | { kind: "calendar" }
  | { kind: "weather" }
  | { kind: "menu" }
  | { kind: "settings" }
  | { kind: "daypart-notices"; mode: DaypartNoticeAliasMode }
  | { kind: "auto-messages"; mode: AutoMessageAliasMode }
  | { kind: "session-presence"; mode: SessionPresenceAliasMode }
  | { kind: "beginner-return" }
  | { kind: "call-scribes" }
  | { kind: "tutorial-end" }
  | { kind: "back" }
  | { kind: "hide-keyboard" }
  | { kind: "move"; direction: Direction }
  | { kind: "gather"; resourceKey?: GatherKey }
  | { kind: "use-item"; item: UseItemKey }
  | { kind: "use-item-all"; item: UseItemKey }
  | { kind: "light-torch" }
  | { kind: "douse-torch" }
  | { kind: "sleep"; tutorial?: boolean }
  | { kind: "wake" }
  | { kind: "open"; target?: string }
  | { kind: "inspect-inventory-item"; target: string }
  | { kind: "drop-inventory-item"; target: string }
  | { kind: "equip-inventory-item"; target: string }
  | { kind: "unequip-inventory-item"; target: string }
  | { kind: "posture"; mode: PostureAliasMode }
  | { kind: "rest"; mode: RestAliasMode }
  | { kind: "auto"; mode: AutoAliasMode }
  | { kind: "queue"; mode: QueueAliasMode }
  | { kind: "track"; detail?: boolean; target?: string }
  | { kind: "inspect-vegetation" }
  | { kind: "inspect-border-marker" }
  | { kind: "inspect-feature"; target: string; detail?: "brief" | "full" }
  | { kind: "shake-tree" }
  | { kind: "wait" }
  | { kind: "add-twigs-campfire" }
  | { kind: "build-campfire" }
  | { kind: "light-campfire" }
  | { kind: "douse-campfire" }
  | { kind: "dismantle-campfire" }
  | { kind: "dismantle-totem"; target?: string }
  | { kind: "cook-meat" }
  | { kind: "cook-meat-all" }
  | { kind: "beginner-cache"; action: "inspect" | "take" | "contribute" | "contribute-all"; item?: string }
  | { kind: "put-item"; item: string; amount?: PutAliasAmount; container: string }
  | { kind: "give-item"; item: string; target: string; amount?: GiveAliasAmount }
  | { kind: "say"; text: string }
  | { kind: "whisper"; text: string }
  | { kind: "reply"; text: string }
  | { kind: "yell"; text: string }
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
const EN_TO_UK_KEYBOARD: Record<string, string> = {
  q: "й",
  w: "ц",
  e: "у",
  r: "к",
  t: "е",
  y: "н",
  u: "г",
  i: "ш",
  o: "щ",
  p: "з",
  "[": "х",
  "]": "ї",
  a: "ф",
  s: "і",
  d: "в",
  f: "а",
  g: "п",
  h: "р",
  j: "о",
  k: "л",
  l: "д",
  ";": "ж",
  "'": "є",
  z: "я",
  x: "ч",
  c: "с",
  v: "м",
  b: "и",
  n: "т",
  m: "ь",
  ",": "б",
  ".": "ю",
  "/": ".",
  "`": "'",
};
const UK_TO_EN_KEYBOARD: Record<string, string> = Object.fromEntries(
  Object.entries(EN_TO_UK_KEYBOARD).map(([english, ukrainian]) => [ukrainian, english])
);

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
  "вг": "UP",
  "вгору": "UP",
  "вверх": "UP",
  "нагору": "UP",
  "піднятися": "UP",

  down: "DOWN",
  d: "DOWN",
  "вн": "DOWN",
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
  calendar: { kind: "calendar" },
  "календар": { kind: "calendar" },
  "дата": { kind: "calendar" },
  "місячне коло": { kind: "calendar" },
  "яке коло": { kind: "calendar" },
  weather: { kind: "weather" },
  "погода": { kind: "weather" },
  "яка погода": { kind: "weather" },
  "що з погодою": { kind: "weather" },

  menu: { kind: "menu" },
  "меню": { kind: "menu" },
  "дії": { kind: "menu" },
  "кнопки": { kind: "menu" },
  settings: { kind: "settings" },
  notifications: { kind: "settings" },
  notification: { kind: "settings" },
  daynotices: { kind: "daypart-notices", mode: "show" },
  automessages: { kind: "auto-messages", mode: "show" },
  "auto messages": { kind: "auto-messages", mode: "show" },
  "налаштування": { kind: "settings" },
  "сповіщення": { kind: "settings" },
  "повідомлення": { kind: "settings" },
  "автоповідомлення": { kind: "auto-messages", mode: "show" },
  "авто повідомлення": { kind: "auto-messages", mode: "show" },

  respawn: { kind: "beginner-return" },
  "повернення": { kind: "beginner-return" },
  "повернення до табору": { kind: "beginner-return" },
  "повернутися до табору": { kind: "beginner-return" },
  "вернутися до табору": { kind: "beginner-return" },
  "назад до табору": { kind: "beginner-return" },
  "call scribes": { kind: "call-scribes" },
  "scribe help": { kind: "call-scribes" },
  "ask scribes": { kind: "call-scribes" },
  "покликати писарів": { kind: "call-scribes" },
  "покликати писаря": { kind: "call-scribes" },
  "звернутися до писарів": { kind: "call-scribes" },
  "звернутися до писаря": { kind: "call-scribes" },
  "попросити писарів": { kind: "call-scribes" },
  "допомога писарів": { kind: "call-scribes" },

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
  "взяти мед": { kind: "gather", resourceKey: "honey" },
  "добути мед": { kind: "gather", resourceKey: "honey" },
  "зібрати мед": { kind: "gather", resourceKey: "honey" },
  "обібрати вулик": { kind: "gather", resourceKey: "honey" },
  "обібрати бортю": { kind: "gather", resourceKey: "honey" },
  "пограбувати бортю": { kind: "gather", resourceKey: "honey" },
  "добути віск": { kind: "gather", resourceKey: "beeswax" },
  "search_honey": { kind: "gather", resourceKey: "honey" },
  "search_beeswax": { kind: "gather", resourceKey: "beeswax" },
  "gather_honey": { kind: "gather", resourceKey: "honey" },
  "gather_beeswax": { kind: "gather", resourceKey: "beeswax" },

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
  lie: { kind: "posture", mode: "lie" },
  "lie down": { kind: "posture", mode: "lie" },
  "лягти": { kind: "posture", mode: "lie" },
  "лягти на землю": { kind: "posture", mode: "lie" },
  "лежати": { kind: "posture", mode: "lie" },
  stand: { kind: "posture", mode: "stand" },
  "stand up": { kind: "posture", mode: "stand" },
  "встати": { kind: "posture", mode: "stand" },
  "підвестися": { kind: "posture", mode: "stand" },
  "підвестись": { kind: "posture", mode: "stand" },

  auto: { kind: "auto", mode: "start" },
  "авто": { kind: "auto", mode: "start" },
  autostop: { kind: "auto", mode: "stop" },
  "auto stop": { kind: "auto", mode: "stop" },
  "auto off": { kind: "auto", mode: "stop" },
  "stop auto": { kind: "auto", mode: "stop" },
  "увімкнути авто": { kind: "auto", mode: "start" },
  "ввімкнути авто": { kind: "auto", mode: "start" },
  "запустити авто": { kind: "auto", mode: "start" },
  "авто старт": { kind: "auto", mode: "start" },
  "авто увімкнути": { kind: "auto", mode: "start" },
  "авто ввімкнути": { kind: "auto", mode: "start" },
  "зупинити авто": { kind: "auto", mode: "stop" },
  "вимкнути авто": { kind: "auto", mode: "stop" },
  "авто стоп": { kind: "auto", mode: "stop" },
  "стоп авто": { kind: "auto", mode: "stop" },
  "авто зупинити": { kind: "auto", mode: "stop" },
  "авто вимкнути": { kind: "auto", mode: "stop" },

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
  "build campfire": { kind: "build-campfire" },
  "make campfire": { kind: "build-campfire" },
  "build fire": { kind: "build-campfire" },
  "make fire": { kind: "build-campfire" },
  "prepare campfire": { kind: "build-campfire" },
  "build bonfire": { kind: "build-campfire" },
  "make bonfire": { kind: "build-campfire" },
  "скласти вогнище": { kind: "build-campfire" },
  "розкласти вогнище": { kind: "build-campfire" },
  "зробити вогнище": { kind: "build-campfire" },
  "скласти багаття": { kind: "build-campfire" },
  "розкласти багаття": { kind: "build-campfire" },
  "зробити багаття": { kind: "build-campfire" },
  "скласти хмиз": { kind: "build-campfire" },
  "розкласти хмиз": { kind: "build-campfire" },
  "light campfire": { kind: "light-campfire" },
  "light fire": { kind: "light-campfire" },
  "ignite campfire": { kind: "light-campfire" },
  "запалити вогнище": { kind: "light-campfire" },
  "підпалити вогнище": { kind: "light-campfire" },
  "розпалити вогнище": { kind: "light-campfire" },
  "підпалити багаття": { kind: "light-campfire" },
  "розпалити багаття": { kind: "light-campfire" },
  "douse campfire": { kind: "douse-campfire" },
  "extinguish campfire": { kind: "douse-campfire" },
  "put out campfire": { kind: "douse-campfire" },
  "douse fire": { kind: "douse-campfire" },
  "погасити вогнище": { kind: "douse-campfire" },
  "загасити вогнище": { kind: "douse-campfire" },
  "притушити вогнище": { kind: "douse-campfire" },
  "потушити вогнище": { kind: "douse-campfire" },
  "погасити багаття": { kind: "douse-campfire" },
  "dismantle campfire": { kind: "dismantle-campfire" },
  "take apart campfire": { kind: "dismantle-campfire" },
  "break down campfire": { kind: "dismantle-campfire" },
  "dismantle fire": { kind: "dismantle-campfire" },
  "розібрати вогнище": { kind: "dismantle-campfire" },
  "розібрати багаття": { kind: "dismantle-campfire" },
  "прибрати вогнище": { kind: "dismantle-campfire" },
  "dismantle_totem": { kind: "dismantle-totem" },
  "dismantle totem": { kind: "dismantle-totem" },
  "dismantle strange totem": { kind: "dismantle-totem" },
  "take apart totem": { kind: "dismantle-totem" },
  "break down totem": { kind: "dismantle-totem" },
  "remove totem": { kind: "dismantle-totem" },
  "розібрати тотем": { kind: "dismantle-totem" },
  "розібрати підозрілий тотем": { kind: "dismantle-totem" },
  "розібрати дивний тотем": { kind: "dismantle-totem" },
  "прибрати тотем": { kind: "dismantle-totem" },
  "розв'язати тотем": { kind: "dismantle-totem" },
  "розв’язати тотем": { kind: "dismantle-totem" },
  "розвязати тотем": { kind: "dismantle-totem" },
  "cook meat": { kind: "cook-meat" },
  "cook raw meat": { kind: "cook-meat" },
  "cook all": { kind: "cook-meat-all" },
  "cook all meat": { kind: "cook-meat-all" },
  "cook all raw meat": { kind: "cook-meat-all" },
  "cook meat all": { kind: "cook-meat-all" },
  "cook_all": { kind: "cook-meat-all" },
  "cook_all_meat": { kind: "cook-meat-all" },
  "підсмажити м'ясо": { kind: "cook-meat" },
  "підсмажити м’ясо": { kind: "cook-meat" },
  "підсмажити все": { kind: "cook-meat-all" },
  "підсмажити все м'ясо": { kind: "cook-meat-all" },
  "підсмажити все м’ясо": { kind: "cook-meat-all" },
  "посмажити все": { kind: "cook-meat-all" },
  "посмажити все м'ясо": { kind: "cook-meat-all" },
  "посмажити все м’ясо": { kind: "cook-meat-all" },
  "смажити м'ясо": { kind: "cook-meat" },
  "смажити м’ясо": { kind: "cook-meat" },
  "смажити все": { kind: "cook-meat-all" },
  "смажити все м'ясо": { kind: "cook-meat-all" },
  "смажити все м’ясо": { kind: "cook-meat-all" },
  "приготувати м'ясо": { kind: "cook-meat" },
  "приготувати м’ясо": { kind: "cook-meat" },
  "приготувати все м'ясо": { kind: "cook-meat-all" },
  "приготувати все м’ясо": { kind: "cook-meat-all" },

  "eat berries": { kind: "use-item", item: "berries" },
  "eat all berries": { kind: "use-item-all", item: "berries" },
  "use all berries": { kind: "use-item-all", item: "berries" },
  "eat berries all": { kind: "use-item-all", item: "berries" },
  "eat_all_berries": { kind: "use-item-all", item: "berries" },
  "use berries": { kind: "use-item", item: "berries" },
  "з'їсти ягоди": { kind: "use-item", item: "berries" },
  "з'їсти всі ягоди": { kind: "use-item-all", item: "berries" },
  "з’їсти ягоди": { kind: "use-item", item: "berries" },
  "з’їсти всі ягоди": { kind: "use-item-all", item: "berries" },
  "зʼїсти ягоди": { kind: "use-item", item: "berries" },
  "зʼїсти всі ягоди": { kind: "use-item-all", item: "berries" },
  "зїсти ягоди": { kind: "use-item", item: "berries" },
  "зїсти всі ягоди": { kind: "use-item-all", item: "berries" },
  "їсти ягоди": { kind: "use-item", item: "berries" },
  "їсти всі ягоди": { kind: "use-item-all", item: "berries" },
  "використати ягоди": { kind: "use-item", item: "berries" },
  "використати всі ягоди": { kind: "use-item-all", item: "berries" },
  "eat mushrooms": { kind: "use-item", item: "mushrooms" },
  "eat all mushrooms": { kind: "use-item-all", item: "mushrooms" },
  "use all mushrooms": { kind: "use-item-all", item: "mushrooms" },
  "eat_all_mushrooms": { kind: "use-item-all", item: "mushrooms" },
  "use mushrooms": { kind: "use-item", item: "mushrooms" },
  "use mushroom": { kind: "use-item", item: "mushrooms" },
  "з'їсти гриби": { kind: "use-item", item: "mushrooms" },
  "з'їсти всі гриби": { kind: "use-item-all", item: "mushrooms" },
  "з’їсти гриби": { kind: "use-item", item: "mushrooms" },
  "з’їсти всі гриби": { kind: "use-item-all", item: "mushrooms" },
  "зʼїсти гриби": { kind: "use-item", item: "mushrooms" },
  "зʼїсти всі гриби": { kind: "use-item-all", item: "mushrooms" },
  "зїсти гриби": { kind: "use-item", item: "mushrooms" },
  "зїсти всі гриби": { kind: "use-item-all", item: "mushrooms" },
  "їсти гриби": { kind: "use-item", item: "mushrooms" },
  "їсти всі гриби": { kind: "use-item-all", item: "mushrooms" },
  "використати гриби": { kind: "use-item", item: "mushrooms" },
  "використати всі гриби": { kind: "use-item-all", item: "mushrooms" },
  "use herbs": { kind: "use-item", item: "herbs" },
  "use all herbs": { kind: "use-item-all", item: "herbs" },
  "use herb": { kind: "use-item", item: "herbs" },
  "eat herbs": { kind: "use-item", item: "herbs" },
  "eat all herbs": { kind: "use-item-all", item: "herbs" },
  "eat_all_herbs": { kind: "use-item-all", item: "herbs" },
  "eat herb": { kind: "use-item", item: "herbs" },
  "використати трави": { kind: "use-item", item: "herbs" },
  "використати всі трави": { kind: "use-item-all", item: "herbs" },
  "використати лікарські трави": { kind: "use-item", item: "herbs" },
  "використати всі лікарські трави": { kind: "use-item-all", item: "herbs" },
  "з'їсти трави": { kind: "use-item", item: "herbs" },
  "з'їсти всі трави": { kind: "use-item-all", item: "herbs" },
  "з’їсти трави": { kind: "use-item", item: "herbs" },
  "з’їсти всі трави": { kind: "use-item-all", item: "herbs" },
  "зʼїсти трави": { kind: "use-item", item: "herbs" },
  "зʼїсти всі трави": { kind: "use-item-all", item: "herbs" },
  "зїсти трави": { kind: "use-item", item: "herbs" },
  "зїсти всі трави": { kind: "use-item-all", item: "herbs" },
  "їсти трави": { kind: "use-item", item: "herbs" },
  "їсти всі трави": { kind: "use-item-all", item: "herbs" },
  "з'їсти лікарські трави": { kind: "use-item", item: "herbs" },
  "з'їсти всі лікарські трави": { kind: "use-item-all", item: "herbs" },
  "з’їсти лікарські трави": { kind: "use-item", item: "herbs" },
  "з’їсти всі лікарські трави": { kind: "use-item-all", item: "herbs" },
  "зʼїсти лікарські трави": { kind: "use-item", item: "herbs" },
  "зʼїсти всі лікарські трави": { kind: "use-item-all", item: "herbs" },
  "зїсти лікарські трави": { kind: "use-item", item: "herbs" },
  "зїсти всі лікарські трави": { kind: "use-item-all", item: "herbs" },
  "їсти лікарські трави": { kind: "use-item", item: "herbs" },
  "їсти всі лікарські трави": { kind: "use-item-all", item: "herbs" },
  "вжити трави": { kind: "use-item", item: "herbs" },
  "вжити всі трави": { kind: "use-item-all", item: "herbs" },
  "прикласти трави": { kind: "use-item", item: "herbs" },
  "лікуватися травами": { kind: "use-item", item: "herbs" },
  "eat cooked meat": { kind: "use-item", item: "cooked_meat" },
  "eat all cooked meat": { kind: "use-item-all", item: "cooked_meat" },
  "eat meat": { kind: "use-item", item: "cooked_meat" },
  "eat all meat": { kind: "use-item-all", item: "cooked_meat" },
  "eat_all_cooked_meat": { kind: "use-item-all", item: "cooked_meat" },
  "eat_all_meat": { kind: "use-item-all", item: "cooked_meat" },
  "use cooked meat": { kind: "use-item", item: "cooked_meat" },
  "use all cooked meat": { kind: "use-item-all", item: "cooked_meat" },
  "use all meat": { kind: "use-item-all", item: "cooked_meat" },
  "з'їсти м'ясо": { kind: "use-item", item: "cooked_meat" },
  "з'їсти все м'ясо": { kind: "use-item-all", item: "cooked_meat" },
  "з'їсти все смажене м'ясо": { kind: "use-item-all", item: "cooked_meat" },
  "з’їсти м’ясо": { kind: "use-item", item: "cooked_meat" },
  "з’їсти все м’ясо": { kind: "use-item-all", item: "cooked_meat" },
  "з’їсти все смажене м’ясо": { kind: "use-item-all", item: "cooked_meat" },
  "їсти смажене м'ясо": { kind: "use-item", item: "cooked_meat" },
  "їсти все смажене м'ясо": { kind: "use-item-all", item: "cooked_meat" },
  "їсти смажене м’ясо": { kind: "use-item", item: "cooked_meat" },
  "їсти все смажене м’ясо": { kind: "use-item-all", item: "cooked_meat" },
  "використати смажене м'ясо": { kind: "use-item", item: "cooked_meat" },
  "використати все смажене м'ясо": { kind: "use-item-all", item: "cooked_meat" },
  "використати смажене м’ясо": { kind: "use-item", item: "cooked_meat" },
  "використати все смажене м’ясо": { kind: "use-item-all", item: "cooked_meat" },
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
  tutorialend: { kind: "tutorial-end" },
  "tutorial end": { kind: "tutorial-end" },
  "закінчити навчання": { kind: "tutorial-end" },
  "завершити навчання": { kind: "tutorial-end" },
  "кінець навчання": { kind: "tutorial-end" },
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
  shake_tree: { kind: "shake-tree" },
  "shake tree": { kind: "shake-tree" },
  "потрусити дерево": { kind: "shake-tree" },
  "струсити дерево": { kind: "shake-tree" },
  "трусити дерево": { kind: "shake-tree" },
  "потрусити гілки": { kind: "shake-tree" },
  "струсити гілки": { kind: "shake-tree" },
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
  "yell",
  "call",
  "гук",
  "гукнути",
  "покликати",
  "крикнути поруч",
  "гучно сказати",
  "shout",
  "крик",
  "крикнути",
  "кричати",
  "закричати",
  "викрикнути",
  "вигукнути",
  "загукати",
  "волати",
  "заволати",
  "freshen all",
  "свіжувати все",
  "освіжити всі",
  "attack",
  "fight",
  "kill",
  "kick",
  "атака",
  "атакувати",
  "напасти",
  "вдарити",
  "бити",
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

function switchKeyboardLayout(raw: string, map: Record<string, string>) {
  let changed = false;
  const converted = [...raw].map((char) => {
    const lower = char.toLocaleLowerCase("uk-UA");
    const replacement = map[lower];
    if (!replacement) return char;
    changed = true;
    return char === lower ? replacement : replacement.toLocaleUpperCase("uk-UA");
  }).join("");

  return changed ? converted : null;
}

export function alternateKeyboardLayoutInputs(raw: string) {
  const variants = [
    switchKeyboardLayout(raw, EN_TO_UK_KEYBOARD),
    switchKeyboardLayout(raw, UK_TO_EN_KEYBOARD),
  ].filter((value): value is string => Boolean(value));

  return [...new Set(variants)].filter((value) => normalizeInput(value) !== normalizeInput(raw));
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
    if (["yell", "call", "гук", "гукнути", "покликати", "крикнути поруч", "гучно сказати"].includes(alias)) return "/yell";
    if (["shout", "крик", "крикнути", "кричати", "закричати", "викрикнути", "вигукнути", "загукати", "волати", "заволати"].includes(alias)) return "/shout";
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
  if (parsed.kind === "calendar") return "/calendar";
  if (parsed.kind === "weather") return "/weather";
  if (parsed.kind === "menu") return "/menu";
  if (parsed.kind === "settings") return "/settings";
  if (parsed.kind === "daypart-notices") return parsed.mode === "show" ? "/daynotices" : `/daynotices ${parsed.mode}`;
  if (parsed.kind === "auto-messages") return parsed.mode === "show" ? "/automessages" : `/automessages ${parsed.mode}`;
  if (parsed.kind === "session-presence") return parsed.mode === "afk" ? "/afk" : "/end_session";
  if (parsed.kind === "beginner-return") return "/respawn";
  if (parsed.kind === "call-scribes") return "/call_scribes";
  if (parsed.kind === "tutorial-end") return "/tutorialEnd";
  if (parsed.kind === "chat") return "/chat";
  if (parsed.kind === "sleep") return parsed.tutorial ? "/sleep_tutorial" : "/sleep";
  if (parsed.kind === "wake") return "/wake";
  if (parsed.kind === "open") return "/open";
  if (parsed.kind === "move") {
    if (parsed.direction === "NORTH") return "/north";
    if (parsed.direction === "SOUTH") return "/south";
    if (parsed.direction === "WEST") return "/west";
    if (parsed.direction === "EAST") return "/east";
    if (parsed.direction === "UP") return "/up";
    if (parsed.direction === "DOWN") return "/down";
    if (parsed.direction === "INSIDE") return "/inside";
    if (parsed.direction === "OUTSIDE") return "/outside";
  }
  if (parsed.kind === "gather") return parsed.resourceKey ? `/gather_${parsed.resourceKey}` : "/gather";
  if (parsed.kind === "use-item") return `/use_${parsed.item}`;
  if (parsed.kind === "use-item-all") return `/eat_all_${parsed.item}`;
  if (parsed.kind === "light-torch") return "/light_torch";
  if (parsed.kind === "douse-torch") return "/douse_torch";
  if (parsed.kind === "posture") return parsed.mode === "sit" ? "/sit" : parsed.mode === "lie" ? "/lie" : "/stand";
  if (parsed.kind === "rest") return "/rest";
  if (parsed.kind === "auto") return parsed.mode === "stop" ? "/auto_stop" : "/auto";
  if (parsed.kind === "queue") return "/queue";
  if (parsed.kind === "track") return "/track";
  if (parsed.kind === "inspect-vegetation" || parsed.kind === "inspect-border-marker" || parsed.kind === "inspect-feature") return "/examine";
  if (parsed.kind === "shake-tree") return "/shake_tree";
  if (parsed.kind === "wait") return "/wait";
  if (parsed.kind === "add-twigs-campfire") return "/add_twigs_campfire";
  if (parsed.kind === "build-campfire") return "/build_campfire";
  if (parsed.kind === "light-campfire") return "/light_campfire";
  if (parsed.kind === "douse-campfire") return "/douse_campfire";
  if (parsed.kind === "dismantle-campfire") return "/dismantle_campfire";
  if (parsed.kind === "dismantle-totem") return "/dismantle_totem";
  if (parsed.kind === "cook-meat") return "/cook_meat";
  if (parsed.kind === "cook-meat-all") return "/cook_all";
  if (parsed.kind === "beginner-cache") {
    if (parsed.action === "take") return "/take_cache";
    if (parsed.action === "contribute-all") return "/contribute_cache_all";
    if (parsed.action === "contribute") return "/contribute_cache";
    return "/cache";
  }
  if (parsed.kind === "say") return "/say";
  if (parsed.kind === "whisper") return "/whisper";
  if (parsed.kind === "reply") return "/reply";
  if (parsed.kind === "yell") return "/yell";
  if (parsed.kind === "shout") return "/shout";
  if (parsed.kind === "put-item") return "/put";
  if (parsed.kind === "give-item") return "/give";
  if (parsed.kind === "inspect-inventory-item") return "/item";
  if (parsed.kind === "drop-inventory-item") return "/drop";
  if (parsed.kind === "equip-inventory-item") return "/item";
  if (parsed.kind === "unequip-inventory-item") return "/item";
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

export function suggestKeyboardLayoutAliasEntries(raw: string, limit = 4): AliasSuggestion[] {
  const suggestions: AliasSuggestion[] = [];
  const seen = new Set<string>();

  for (const candidate of alternateKeyboardLayoutInputs(raw)) {
    const normalized = withoutLeadingSlash(normalizeInput(candidate));
    if (!normalized) continue;
    const parsed = parseAlias(candidate);
    if (parsed && !seen.has(normalized)) {
      seen.add(normalized);
      suggestions.push({ alias: normalized, command: slashCommandForAlias(normalized) });
      if (suggestions.length >= limit) return suggestions;
    }

    for (const suggestion of suggestAliasEntries(candidate, limit)) {
      const key = `${suggestion.alias}\u0000${suggestion.command ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push(suggestion);
      if (suggestions.length >= limit) return suggestions;
    }
  }

  return suggestions;
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
  const match = text.match(/^(?:gather|search|збирати|зібрати|шукати|пошукати|назбирати)\s+(.+)$/);
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
  if (["honey", "мед", "меду"].includes(resource)) return { kind: "gather", resourceKey: "honey" };
  if (["beeswax", "wax", "віск", "воску"].includes(resource)) return { kind: "gather", resourceKey: "beeswax" };
  return null;
}

function parseSay(raw: string, text: string): ParsedAliasCommand | null {
  if (/^\/?(?:say|сказати|говорити|мовити|промовити|ск|сказ|гов)$/u.test(text)) {
    return { kind: "say", text: "" };
  }

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

const WHISPER_ALIAS_SOURCE = "whisper|шепнути|прошепотіти|шеп";
const YELL_ALIAS_SOURCE = "yell|call|гук|гукнути|покликати|крикнути поруч|гучно сказати";
const SHOUT_ALIAS_SOURCE = "shout|крик|крикнути|кричати|закричати|викрикнути|вигукнути|загукати|волати|заволати";

function parseDirectedSpeech(raw: string, text: string): ParsedAliasCommand | null {
  if (new RegExp(`^/?(?:${WHISPER_ALIAS_SOURCE})$`, "u").test(text)) return { kind: "whisper", text: "" };

  const whisper = text.match(new RegExp(`^/?(?:${WHISPER_ALIAS_SOURCE})\\s+(.+)$`, "u"));
  if (whisper?.[1]?.trim()) {
    const rawMatch = raw.match(new RegExp(`^/?(?:${WHISPER_ALIAS_SOURCE})\\s+(.+)$`, "iu"));
    const speech = (rawMatch?.[1] ?? whisper[1]).trim().slice(0, 300);
    return speech ? { kind: "whisper", text: speech } : null;
  }

  const reply = text.match(/^\/?(?:reply|відповісти|відповідь)\s+(.+)$/);
  if (reply?.[1]?.trim()) {
    const rawMatch = raw.match(/^\/?(?:reply|відповісти|відповідь)\s+(.+)$/i);
    const speech = (rawMatch?.[1] ?? reply[1]).trim().slice(0, 300);
    return speech ? { kind: "reply", text: speech } : null;
  }
  if (/^\/?(?:reply|відповісти|відповідь)$/u.test(text)) return { kind: "reply", text: "" };

  if (new RegExp(`^/?(?:${YELL_ALIAS_SOURCE})$`, "u").test(text)) return { kind: "yell", text: "" };

  const yell = text.match(new RegExp(`^/?(?:${YELL_ALIAS_SOURCE})\\s+(.+)$`, "u"));
  if (yell?.[1]?.trim()) {
    const rawMatch = raw.match(new RegExp(`^/?(?:${YELL_ALIAS_SOURCE})\\s+(.+)$`, "iu"));
    const speech = (rawMatch?.[1] ?? yell[1]).trim().slice(0, 300);
    return speech ? { kind: "yell", text: speech } : null;
  }

  if (new RegExp(`^/?(?:${SHOUT_ALIAS_SOURCE})$`, "u").test(text)) return { kind: "shout", text: "" };

  const shout = text.match(new RegExp(`^/?(?:${SHOUT_ALIAS_SOURCE})\\s+(.+)$`, "u"));
  if (shout?.[1]?.trim()) {
    const rawMatch = raw.match(new RegExp(`^/?(?:${SHOUT_ALIAS_SOURCE})\\s+(.+)$`, "iu"));
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

function parseDaypartNotices(text: string): ParsedAliasCommand | null {
  const match = text.match(/^daynotices(?:\s+(.+))?$/);
  if (!match) return null;
  const arg = match[1]?.trim();
  if (!arg) return { kind: "daypart-notices", mode: "show" };
  if (["on", "увімкнути", "ввімкнути", "так"].includes(arg)) return { kind: "daypart-notices", mode: "on" };
  if (["off", "вимкнути", "ні"].includes(arg)) return { kind: "daypart-notices", mode: "off" };
  return { kind: "daypart-notices", mode: "show" };
}

function parseAutoMessages(text: string): ParsedAliasCommand | null {
  const match = text.match(/^(?:automessages|auto messages|автоповідомлення|авто повідомлення)(?:\s+(.+))?$/);
  if (!match) return null;
  const arg = match[1]?.trim();
  if (!arg) return { kind: "auto-messages", mode: "show" };
  if (["on", "увімкнути", "ввімкнути", "так"].includes(arg)) return { kind: "auto-messages", mode: "on" };
  if (["off", "вимкнути", "ні"].includes(arg)) return { kind: "auto-messages", mode: "off" };
  return { kind: "auto-messages", mode: "show" };
}

function parseAll(text: string): ParsedAliasCommand | null {
  const match = text.match(/^all(?:\s+(.+))?$/);
  if (!match) return null;
  return { kind: "all", showDead: match[1]?.trim() === "dead" };
}

function parseTrackIntent(text: string): ParsedAliasCommand | null {
  const direct = text.match(/^(?:track|відслідкувати|вистежити|сліди|шукати сліди|йти слідом)(?:\s+(.+))?$/u);
  if (direct) {
    const target = direct[1]?.trim();
    return target ? { kind: "track", target } : { kind: "track" };
  }

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
  if (text === "attack_mouse") return { kind: "target-action", action: "attack", target: "mouse" };

  const patterns: Array<[TargetAction, RegExp]> = [
    ["inspect", /^(?:look\s+at|look|x|examine|inspect|роздивитися|оглянути|огл|глянути\s+на|подивитися\s+на|придивитися\s+до)\s+(.+)$/],
    ["attack", /^(?:attack|fight|hit|kill|kick|атака|атакувати|напасти\s+на|напасти|вдарити|ударити|копнути|бити|битися\s+з)\s+(.+)$/],
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
  const allMatch = text.match(/^(?:get_all|pick_all|pickup_all|take_all)(?:\s+(.+))?$/);
  if (allMatch) {
    const filter = allMatch[1]?.trim();
    return { kind: "pickup-target", target: filter ? `all ${filter}` : "all" };
  }

  const match = text.match(/^(?:pickup|pick|take|get|підібрати|підняти|взяти|забрати)\s+(.+)$/);
  if (!match?.[1]?.trim()) return null;
  const target = match[1].trim();
  const apiaryGather = parseGatherResource(target);
  if (apiaryGather?.kind === "gather" && (apiaryGather.resourceKey === "honey" || apiaryGather.resourceKey === "beeswax")) {
    return apiaryGather;
  }
  return { kind: "pickup-target", target };
}

function parseBeginnerCacheIntent(text: string): ParsedAliasCommand | null {
  if (/^(?:cache|supply cache|beginner cache|скриня|спільна скриня|скриня прибулих|запаси|припаси)$/u.test(text)) {
    return { kind: "beginner-cache", action: "inspect" };
  }

  const directTake = text.match(/^(?:take cache|cache take|take from cache|взяти зі скрині|взяти з скрині|узяти зі скрині|забрати зі скрині)(?:\s+(.+))?$/u);
  if (directTake) {
    const item = directTake[1]?.trim();
    return item ? { kind: "beginner-cache", action: "take", item } : { kind: "beginner-cache", action: "take" };
  }

  const slashTake = text.match(/^(?:take_cache|cache_take)(?:\s+(.+))?$/u);
  if (slashTake) {
    const item = slashTake[1]?.trim();
    return item ? { kind: "beginner-cache", action: "take", item } : { kind: "beginner-cache", action: "take" };
  }

  const directContributeAll = text.match(/^(?:contribute all cache|contribute cache all|cache contribute all|лишити всі в скрині|лишити усе в скрині|лишити все в скрині|залишити всі в скрині|залишити усе в скрині|залишити все в скрині|лишити всі у скрині|лишити усе у скрині|лишити все у скрині|залишити всі у скрині|залишити усе у скрині|залишити все у скрині)\s+(.+)$/u);
  if (directContributeAll?.[1]?.trim()) return { kind: "beginner-cache", action: "contribute-all", item: directContributeAll[1].trim() };

  const directContributeAllItemFirst = text.match(/^(?:лишити|залишити)\s+(?:all|всі|усі|весь|увесь|все|усе)\s+(.+?)\s+(?:у|в|до|into|in|to)\s+(?:скриню|скрині|cache|supply cache)$/u);
  if (directContributeAllItemFirst?.[1]?.trim()) return { kind: "beginner-cache", action: "contribute-all", item: directContributeAllItemFirst[1].trim() };

  const slashContributeAll = text.match(/^(?:contribute_cache_all|cache_contribute_all)\s+(.+)$/u);
  if (slashContributeAll?.[1]?.trim()) return { kind: "beginner-cache", action: "contribute-all", item: slashContributeAll[1].trim() };

  const directContribute = text.match(/^(?:contribute cache|cache contribute|лишити в скрині|залишити в скрині|лишити у скрині|залишити у скрині|додати до скрині)\s+(.+)$/u);
  if (directContribute?.[1]?.trim()) return { kind: "beginner-cache", action: "contribute", item: directContribute[1].trim() };

  const slashContribute = text.match(/^(?:contribute_cache|cache_contribute)\s+(.+)$/u);
  if (slashContribute?.[1]?.trim()) return { kind: "beginner-cache", action: "contribute", item: slashContribute[1].trim() };

  return null;
}

const GIVE_TARGET_ALIASES = [
  "camp spirit cat",
  "spirit cat",
  "camp cat",
  "cat",
  "бережникові",
  "бережнику",
  "бережника",
  "бережник",
  "котові-бережникові",
  "котові-бережнику",
  "котові-бережника",
  "коту-бережникові",
  "коту-бережнику",
  "коту-бережника",
  "кота-бережника",
  "кіт-бережник",
  "котові бережникові",
  "котові бережнику",
  "котові бережника",
  "коту бережникові",
  "коту бережнику",
  "коту бережника",
  "кота бережника",
  "кіт бережник",
  "котові",
  "коту",
  "кота",
  "кіт",
].sort((a, b) => b.length - a.length);

const GIVE_RAW_MEAT_ITEM_ALIASES = new Set([
  "raw meat",
  "rawmeat",
  "raw_meat",
  "сире м'ясо",
  "сире мясо",
  "сирого м'яса",
  "сирого мяса",
  "м'ясо",
  "мясо",
  "м'яса",
  "мяса",
]);

function normalizeGivePhrase(value: string) {
  return normalizeInput(value)
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalGiveItem(value: string) {
  const normalized = normalizeInput(value);
  const compact = normalized.replace(/[\s_-]+/g, "");
  const noApostrophe = normalized.replace(/'/g, "");
  if (GIVE_RAW_MEAT_ITEM_ALIASES.has(normalized) || GIVE_RAW_MEAT_ITEM_ALIASES.has(compact) || GIVE_RAW_MEAT_ITEM_ALIASES.has(noApostrophe)) {
    return "raw meat";
  }
  return value;
}

function canonicalGiveTarget(value: string) {
  const normalized = normalizeInput(value);
  const normalizedHyphenless = normalizeGivePhrase(value);
  if (GIVE_TARGET_ALIASES.includes(normalized) || GIVE_TARGET_ALIASES.includes(normalizedHyphenless)) {
    return "cat";
  }
  return value;
}

function canonicalGiveItemTarget(parsed: { item: string; target: string }) {
  return {
    item: canonicalGiveItem(parsed.item),
    target: canonicalGiveTarget(parsed.target),
  };
}

function amountFromGiveToken(token: string): GiveAliasAmount | null {
  if (!/^\d+$/.test(token)) return null;
  const amount = Number(token);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function parseGiveAmount(value: string) {
  const words = value.split(/\s+/).filter(Boolean);
  if (!words.length) return { value, amount: undefined as GiveAliasAmount | undefined };
  const amount = amountFromGiveToken(words[0]);
  if (!amount) return { value, amount: undefined as GiveAliasAmount | undefined };
  return { value: words.slice(1).join(" "), amount };
}

function parseGiveItemTarget(value: string): { item: string; target: string } | null {
  const withPreposition = value.match(/^(.+?)\s+(?:to|для|до)\s+(.+)$/u);
  if (withPreposition?.[1]?.trim() && withPreposition?.[2]?.trim()) {
    return canonicalGiveItemTarget({ item: withPreposition[1].trim(), target: withPreposition[2].trim() });
  }

  for (const target of GIVE_TARGET_ALIASES) {
    if (value === target) return canonicalGiveItemTarget({ item: "", target });
    if (value.endsWith(` ${target}`)) {
      const item = value.slice(0, -target.length).trim();
      if (item) return canonicalGiveItemTarget({ item, target });
    }
  }

  return null;
}

function parseGiveIntent(text: string): ParsedAliasCommand | null {
  if (/^(?:feed_raw_meat|feed raw meat|feed_raw_meet|feed raw meet|feed_cat|feed cat)$/u.test(text)) {
    return { kind: "give-item", item: "raw meat", target: "cat", amount: 1 };
  }

  if (/^(?:give|дати)$/u.test(text)) return { kind: "give-item", item: "", target: "" };

  const match = text.match(/^(?:give|дати)\s+(.+)$/u);
  if (!match?.[1]?.trim()) return null;

  const parsedAmount = parseGiveAmount(match[1].trim());
  const parsed = parseGiveItemTarget(parsedAmount.value.trim());
  if (parsed) return { kind: "give-item", ...parsed, ...(parsedAmount.amount !== undefined ? { amount: parsedAmount.amount } : {}) };

  return { kind: "give-item", item: parsedAmount.value.trim(), target: "", ...(parsedAmount.amount !== undefined ? { amount: parsedAmount.amount } : {}) };
}

function parseInventoryItemAction(text: string): ParsedAliasCommand | null {
  const drop = text.match(/^(?:drop|discard|throw away|викинути|кинути|покласти на землю)\s+(.+)$/);
  if (drop?.[1]?.trim()) return { kind: "drop-inventory-item", target: drop[1].trim() };

  const inspect = text.match(/^(?:inspect item|examine item|look at item|item|річ|речі|оглянути в речах|роздивитися в речах)\s+(.+)$/);
  if (inspect?.[1]?.trim()) return { kind: "inspect-inventory-item", target: inspect[1].trim() };

  const equip = text.match(/^(?:equip|wield|hold|взяти в руку|тримати|озброїтися)\s+(.+)$/);
  if (equip?.[1]?.trim()) return { kind: "equip-inventory-item", target: equip[1].trim() };

  const unequip = text.match(/^(?:unequip|unwield|free hand|прибрати з руки|зняти з руки|звільнити руку)\s*(.*)$/);
  if (unequip) return { kind: "unequip-inventory-item", target: unequip[1]?.trim() ?? "" };

  return null;
}

function amountFromPutToken(token: string): PutAliasAmount | null {
  if (["all", "все", "усе", "всі", "усі", "весь", "увесь"].includes(token)) return "all";
  if (/^\d+$/.test(token)) {
    const amount = Number(token);
    return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
  }
  return null;
}

function normalizePutItemText(value: string) {
  return value
    .replace(/^(?:all|все|усе|всі|усі)\s+/u, "")
    .replace(/^(?:весь|увесь)\s+/u, "")
    .replace(/\s+(?:all|все|усе|всі|усі|весь|увесь)$/u, "")
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
    return item ? { item, ...(amount !== undefined ? { amount } : {}), container: withPreposition[2].trim() } : null;
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
  if (text === "put out campfire") return null;
  const defaultMatch = text.match(/^(?:put|покласти|класти)$/u);
  if (defaultMatch) return { kind: "put-item", item: "туша", container: "рів" };

  const match = text.match(/^(?:put|покласти|класти)\s+(.+)$/u);
  if (!match?.[1]?.trim()) return null;
  const parsed = parsePutParts(match[1].trim());
  if (!parsed?.item || !parsed.container) return null;
  return { kind: "put-item", ...parsed };
}

function parseCampfireActionIntent(text: string): ParsedAliasCommand | null {
  if ([
    "build campfire",
    "make campfire",
    "build fire",
    "make fire",
    "prepare campfire",
    "build bonfire",
    "make bonfire",
    "скласти вогнище",
    "розкласти вогнище",
    "зробити вогнище",
    "скласти багаття",
    "розкласти багаття",
    "зробити багаття",
    "скласти хмиз",
    "розкласти хмиз",
  ].includes(text)) return { kind: "build-campfire" };

  if ([
    "light campfire",
    "light fire",
    "ignite campfire",
    "запалити вогнище",
    "підпалити вогнище",
    "розпалити вогнище",
    "підпалити багаття",
    "розпалити багаття",
  ].includes(text)) return { kind: "light-campfire" };

  if ([
    "douse campfire",
    "extinguish campfire",
    "put out campfire",
    "douse fire",
    "погасити вогнище",
    "загасити вогнище",
    "притушити вогнище",
    "потушити вогнище",
    "погасити багаття",
  ].includes(text)) return { kind: "douse-campfire" };

  if ([
    "dismantle campfire",
    "take apart campfire",
    "break down campfire",
    "dismantle fire",
    "розібрати вогнище",
    "розібрати багаття",
    "прибрати вогнище",
  ].includes(text)) return { kind: "dismantle-campfire" };

  return null;
}

function parseTotemDismantleIntent(text: string): ParsedAliasCommand | null {
  const match = text.match(/^(?:dismantle|take apart|break down|remove|розібрати|прибрати|розв'язати|розв’язати|розвязати)\s+(?:strange\s+)?(?:totem|підозрілий\s+тотем|дивний\s+тотем|тотем)(?:\s+(.+))?$/u);
  if (!match) return null;
  const target = match[1]?.trim();
  return target ? { kind: "dismantle-totem", target } : { kind: "dismantle-totem" };
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
  if ([
    "call scribes",
    "scribe help",
    "ask scribes",
    "покликати писарів",
    "покликати писаря",
    "звернутися до писарів",
    "звернутися до писаря",
    "попросити писарів",
    "допомога писарів",
  ].includes(commandText)) return { kind: "call-scribes" };

  const directedSpeech = parseDirectedSpeech(raw, text);
  if (directedSpeech) return directedSpeech;

  const say = parseSay(raw, text);
  if (say) return say;

  const chat = parseChat(commandText);
  if (chat) return chat;

  const daypartNotices = parseDaypartNotices(commandText);
  if (daypartNotices) return daypartNotices;

  const autoMessages = parseAutoMessages(commandText);
  if (autoMessages) return autoMessages;

  const all = parseAll(commandText);
  if (all) return all;

  const trackIntent = parseTrackIntent(commandText);
  if (trackIntent) return trackIntent;

  const vegetationIntent = parseVegetationInspectionIntent(commandText);
  if (vegetationIntent) return vegetationIntent;

  const borderMarkerIntent = parseBorderMarkerInspectionIntent(commandText);
  if (borderMarkerIntent) return borderMarkerIntent;

  const beginnerCacheIntent = parseBeginnerCacheIntent(commandText);
  if (beginnerCacheIntent) return beginnerCacheIntent;

  const giveIntent = parseGiveIntent(commandText);
  if (giveIntent) return giveIntent;

  const inventoryItemAction = parseInventoryItemAction(commandText);
  if (inventoryItemAction) return inventoryItemAction;

  const putIntent = parsePutIntent(commandText);
  if (putIntent) return putIntent;

  const campfireIntent = parseCampfireActionIntent(commandText);
  if (campfireIntent) return campfireIntent;

  const totemDismantleIntent = parseTotemDismantleIntent(commandText);
  if (totemDismantleIntent) return totemDismantleIntent;

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
