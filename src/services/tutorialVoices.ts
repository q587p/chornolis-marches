import { Direction, type Player } from "@prisma/client";
import { prisma } from "../db";
import {
  isTutorialLocation,
  TUTORIAL_ATTENTION_LOCATION_KEY,
  TUTORIAL_END_LOCATION_KEY,
  TUTORIAL_FORAGING_LOCATION_KEY,
  TUTORIAL_GATE_LOCATION_KEY,
  TUTORIAL_HUB_LOCATION_KEY,
  TUTORIAL_REST_LOCATION_KEY,
  TUTORIAL_SAFETY_LOCATION_KEY,
  TUTORIAL_SECOND_STEP_LOCATION_KEY,
  TUTORIAL_SIGNS_LOCATION_KEY,
  TUTORIAL_START_LOCATION_KEY,
  TUTORIAL_TIME_LOCATION_KEY,
  TUTORIAL_TRACES_LOCATION_KEY,
} from "./tutorial";

export type TutorialVoiceComment = {
  speaker: "Сон" | "Дрімота";
  title: string;
  text: string;
};

const TUTORIAL_LOOK_EVENT_TITLE = "Tutorial look";
const TUTORIAL_PACE_EVENT_TITLE = "Tutorial pace comment";
const TUTORIAL_GATE_SPEECH_EVENT_TITLE = "Tutorial gate speech comment";
const TUTORIAL_ACTION_HINT_EVENT_TITLE = "Tutorial action semantics hint";
const TUTORIAL_LOOK_WINDOW_MS = 60_000;
const TUTORIAL_IDLE_PACE_DELAY_MS = 120_000;
const TUTORIAL_PACE_BACKOFF_MS = [120_000, 300_000, 600_000, 1_200_000, 1_800_000];

type PaceCommentPair = {
  drowsinessTitle: string;
  drowsinessText: string;
  dreamTitle: string;
  dreamText: (pronoun: string, dativePronoun: string, nominativePronoun: string) => string;
};

export const PACE_COMMENT_PAIRS: PaceCommentPair[] = [
  {
    drowsinessTitle: "Дрімота підганяє",
    drowsinessText: "Ну ходімо вже скоріше. Якщо довго стояти, туман почне думати, що ми тут живемо.",
    dreamTitle: "Сон спокійно каже",
    dreamText: (pronoun) => `У ${pronoun} є час. У кожного свій темп; сон не жене, він чекає.`,
  },
  {
    drowsinessTitle: "Дрімота нетерпляче шепоче",
    drowsinessText: "Стежка ж не просто так лежить попереду. Можна вже й перевірити, куди вона веде.",
    dreamTitle: "Сон відповідає тихо",
    dreamText: (pronoun) => `Нехай ${pronoun === "них" ? "вони йдуть" : "іде"}, коли буде готово. Поріг не зникає від повільного кроку.`,
  },
  {
    drowsinessTitle: "Дрімота бурмоче",
    drowsinessText: "Якщо ще трохи постояти, мох почне записувати нас до своїх родичів.",
    dreamTitle: "Сон лагідно заперечує",
    dreamText: (_pronoun, dativePronoun) => `Мох уміє чекати, і ${dativePronoun} теж можна. Тут ніхто не виграє перегони.`,
  },
  {
    drowsinessTitle: "Дрімота підганяє",
    drowsinessText: "Далі, далі. Найкращі сни не люблять, коли їх розглядають тільки з порога.",
    dreamTitle: "Сон спокійно каже",
    dreamText: (pronoun) => `Поріг теж частина сну. У ${pronoun} є право придивитися, перш ніж рушити.`,
  },
  {
    drowsinessTitle: "Дрімота сопе",
    drowsinessText: "Ми вже майже стали пам’ятником нерішучості. Гарним, але нерішучим.",
    dreamTitle: "Сон усміхається",
    dreamText: (_pronoun, _dativePronoun, nominativePronoun) =>
      `Пам’ятники не питають дороги. А ${nominativePronoun} ще ${nominativePronoun === "вони" ? "слухають" : "слухає"} місцину, і це не зайве.`,
  },
  {
    drowsinessTitle: "Дрімота квапить",
    drowsinessText: "Попереду є шлях, позаду є туман, а ми все ще в середині думки.",
    dreamTitle: "Сон говорить рівно",
    dreamText: (pronoun) => `Думка теж може бути кроком. Нехай ${pronoun === "них" ? "вони оберуть" : "обере"} свій момент.`,
  },
  {
    drowsinessTitle: "Дрімота не вгаває",
    drowsinessText: "Можна стояти красиво, але йти все одно корисніше.",
    dreamTitle: "Сон м’яко відповідає",
    dreamText: (pronoun) => `Краще один власний крок, ніж десять чужих підштовхувань. У ${pronoun} є час.`,
  },
  {
    drowsinessTitle: "Дрімота озирається",
    drowsinessText: "Туман уже навчився нашої форми. Може, здивуємо його рухом?",
    dreamTitle: "Сон тихо каже",
    dreamText: () => "Нехай туман вчиться терпінню. Рух прийде, коли сон стане зрозумілішим.",
  },
  {
    drowsinessTitle: "Дрімота клацає язиком",
    drowsinessText: "Стільки чекати можна тільки тоді, коли хтось загубив власні ноги.",
    dreamTitle: "Сон відповідає м'яко",
    dreamText: (pronoun) => `Ноги не загубилися. ${pronoun === "них" ? "Вони" : pronoun === "неї" ? "Вона" : "Він"} просто слухає землю під собою.`,
  },
  {
    drowsinessTitle: "Дрімота тягне слово",
    drowsinessText: "Якщо думати ще довше, думка пустить коріння й попросить окрему місцину.",
    dreamTitle: "Сон не квапиться",
    dreamText: () => "Коріння теж знає шлях. Не кожен рух починається з кроку.",
  },
  {
    drowsinessTitle: "Дрімота шурхоче поруч",
    drowsinessText: "Попереду все ще південь. Він не стане ближчим від того, що ми дивимося на нього здалеку.",
    dreamTitle: "Сон озивається",
    dreamText: (pronoun) => `Південь дочекається. Нехай у ${pronoun} буде мить скласти себе докупи.`,
  },
  {
    drowsinessTitle: "Дрімота зітхає",
    drowsinessText: "Я вже майже встигла заснути всередині цього сну.",
    dreamTitle: "Сон говорить тихо",
    dreamText: () => "Сон у сні теж має двері. Не всі двері треба відчиняти поспіхом.",
  },
  {
    drowsinessTitle: "Дрімота підганяє",
    drowsinessText: "Крок-крок-крок. Ось так звучить шлях, коли ним нарешті користуються.",
    dreamTitle: "Сон усміхається",
    dreamText: (pronoun) => `А тиша звучить так, коли ${pronoun === "них" ? "вони вчаться" : "вчиться"} не боятися паузи.`,
  },
];

type TutorialPlayerRef = Pick<Player, "id" | "currentLocationId" | "pronoun" | "grammaticalGender">;
type TutorialActionHintPlayerRef = Pick<Player, "id" | "currentLocationId">;
type TutorialIdlePlayerRef = TutorialPlayerRef & Pick<Player, "lastActionAt" | "updatedAt" | "createdAt">;

function tutorialPacePronoun(player: TutorialPlayerRef) {
  if (player.pronoun === "SHE" || player.grammaticalGender === "FEMININE") return "неї";
  if (player.pronoun === "THEY" || player.grammaticalGender === "PLURAL") return "них";
  return "нього";
}

function tutorialPaceDativePronoun(player: TutorialPlayerRef) {
  if (player.pronoun === "SHE" || player.grammaticalGender === "FEMININE") return "їй";
  if (player.pronoun === "THEY" || player.grammaticalGender === "PLURAL") return "їм";
  return "йому";
}

function tutorialPaceNominativePronoun(player: TutorialPlayerRef) {
  if (player.pronoun === "SHE" || player.grammaticalGender === "FEMININE") return "вона";
  if (player.pronoun === "THEY" || player.grammaticalGender === "PLURAL") return "вони";
  return "він";
}

async function isPlayerInTutorial(locationId: number) {
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    select: { key: true, z: true, region: { select: { key: true } } },
  });
  return Boolean(location && isTutorialLocation(location));
}

export function tutorialPaceCooldownMs(previousComments: number) {
  const index = Math.max(0, Math.trunc(previousComments));
  return TUTORIAL_PACE_BACKOFF_MS[Math.min(index, TUTORIAL_PACE_BACKOFF_MS.length - 1)] ?? TUTORIAL_IDLE_PACE_DELAY_MS;
}

export function randomPaceCommentPair() {
  return PACE_COMMENT_PAIRS[Math.floor(Math.random() * PACE_COMMENT_PAIRS.length)] ?? PACE_COMMENT_PAIRS[0];
}

async function tutorialPaceComments(player: TutorialPlayerRef, reason: "look" | "wait" | "idle"): Promise<TutorialVoiceComment[]> {
  const locationId = player.currentLocationId;
  if (!locationId || !(await isPlayerInTutorial(locationId))) return [];

  const previousComments = await prisma.worldEvent.count({
    where: {
      playerId: player.id,
      locationId,
      title: TUTORIAL_PACE_EVENT_TITLE,
    },
  });
  const cooldownMs = tutorialPaceCooldownMs(previousComments);
  const latestComment = cooldownMs > 0 ? await prisma.worldEvent.findFirst({
    where: {
      playerId: player.id,
      locationId,
      title: TUTORIAL_PACE_EVENT_TITLE,
    },
    orderBy: { createdAt: "desc" },
  }) : null;
  if (latestComment && Date.now() - latestComment.createdAt.getTime() < cooldownMs) return [];

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: TUTORIAL_PACE_EVENT_TITLE,
      description: reason,
      playerId: player.id,
      locationId,
    },
  });

  const pair = randomPaceCommentPair();
  const pronoun = tutorialPacePronoun(player);
  const dativePronoun = tutorialPaceDativePronoun(player);
  const nominativePronoun = tutorialPaceNominativePronoun(player);
  return [
    {
      speaker: "Дрімота",
      title: pair.drowsinessTitle,
      text: pair.drowsinessText,
    },
    {
      speaker: "Сон",
      title: pair.dreamTitle,
      text: pair.dreamText(pronoun, dativePronoun, nominativePronoun),
    },
  ];
}

export async function tutorialLookPaceComments(player: TutorialPlayerRef): Promise<TutorialVoiceComment[]> {
  const locationId = player.currentLocationId;
  if (!locationId || !(await isPlayerInTutorial(locationId))) return [];

  const since = new Date(Date.now() - TUTORIAL_LOOK_WINDOW_MS);
  await prisma.worldEvent.create({
    data: {
      type: "LOOK",
      title: TUTORIAL_LOOK_EVENT_TITLE,
      description: "player looked around in tutorial",
      playerId: player.id,
      locationId,
    },
  });

  const recentLooks = await prisma.worldEvent.count({
    where: {
      playerId: player.id,
      locationId,
      title: TUTORIAL_LOOK_EVENT_TITLE,
      createdAt: { gte: since },
    },
  });

  if (recentLooks < 2) return [];
  return tutorialPaceComments(player, "look");
}

export function tutorialActionHintText(commandKey: "look" | "examine") {
  if (commandKey === "look") {
    return {
      speaker: "Дрімота",
      title: "Дрімота шепоче збоку",
      text: "Озирнутися — це згадати, де ти. А коли щось чіпляє погляд, роздивися ближче.",
    } satisfies TutorialVoiceComment;
  }

  return {
    speaker: "Сон",
    title: "Сон відповідає тихо",
    text: "Роздивитися — це спитати місце, що воно ховає. Написи, сліди й речі часто говорять тихіше за дорогу.",
  } satisfies TutorialVoiceComment;
}

export async function tutorialActionHintComment(player: TutorialActionHintPlayerRef, commandKey: "look" | "examine"): Promise<TutorialVoiceComment | null> {
  const locationId = player.currentLocationId;
  if (!locationId || !(await isPlayerInTutorial(locationId))) return null;

  const seen = await prisma.worldEvent.findFirst({
    where: {
      playerId: player.id,
      type: "SYSTEM",
      title: TUTORIAL_ACTION_HINT_EVENT_TITLE,
      description: commandKey,
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  if (seen) return null;

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: TUTORIAL_ACTION_HINT_EVENT_TITLE,
      description: commandKey,
      playerId: player.id,
      locationId,
    },
  });

  return tutorialActionHintText(commandKey);
}

export async function tutorialWaitPaceComments(player: TutorialPlayerRef): Promise<TutorialVoiceComment[]> {
  return tutorialPaceComments(player, "wait");
}

export async function tutorialGateSpeechComment(player: TutorialPlayerRef): Promise<TutorialVoiceComment | null> {
  const locationId = player.currentLocationId;
  if (!locationId) return null;

  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    select: { key: true, z: true, region: { select: { key: true } } },
  });
  if (!location || location.key !== TUTORIAL_GATE_LOCATION_KEY || !isTutorialLocation(location)) return null;

  const seen = await prisma.worldEvent.findFirst({
    where: {
      playerId: player.id,
      locationId,
      title: TUTORIAL_GATE_SPEECH_EVENT_TITLE,
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  if (seen) return null;

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: TUTORIAL_GATE_SPEECH_EVENT_TITLE,
      description: "player opened the tutorial gate by saying the written phrase",
      playerId: player.id,
      locationId,
    },
  });

  return {
    speaker: "Сон",
    title: "Сон озивається",
    text: "Добре. Порубіжжя не завжди слухає кнопки, але іноді слухає слово, сказане в правильному місці. Запам'ятай це: написи, сліди й чужі репліки теж можуть бути ключами.",
  };
}

export async function tutorialIdlePaceComments(player: TutorialIdlePlayerRef, now = new Date()): Promise<TutorialVoiceComment[]> {
  const lastActivity = [player.lastActionAt, player.updatedAt, player.createdAt]
    .filter((date): date is Date => Boolean(date))
    .reduce((latest, date) => (date.getTime() > latest.getTime() ? date : latest), player.createdAt);
  if (now.getTime() - lastActivity.getTime() < TUTORIAL_IDLE_PACE_DELAY_MS) return [];
  return (await tutorialPaceComments(player, "idle")).slice(0, 1);
}

export async function tutorialSpiritMoveComment(fromLocationId: number, toLocationId: number, direction: Direction): Promise<TutorialVoiceComment | null> {
  const [from, to] = await Promise.all([
    prisma.cellLocation.findUnique({ where: { id: fromLocationId }, select: { key: true, z: true, region: { select: { key: true } } } }),
    prisma.cellLocation.findUnique({ where: { id: toLocationId }, select: { key: true, z: true, region: { select: { key: true } } } }),
  ]);
  if (!from || !to || !isTutorialLocation(from) || !isTutorialLocation(to)) return null;

  if (from.key === TUTORIAL_START_LOCATION_KEY && to.key === TUTORIAL_SECOND_STEP_LOCATION_KEY && direction === "SOUTH") {
    return {
      speaker: "Сон",
      title: "Сон шепоче",
      text: "О, молодець. Саме туди, куди стежка кличе.",
    };
  }

  if (from.key === TUTORIAL_SECOND_STEP_LOCATION_KEY && to.key === TUTORIAL_GATE_LOCATION_KEY && direction === "SOUTH") {
    return {
      speaker: "Сон",
      title: "Сон шепоче",
      text: "Так. Далі. Коли шлях один, його легше запам’ятати.",
    };
  }

  if (from.key === TUTORIAL_GATE_LOCATION_KEY && to.key === TUTORIAL_HUB_LOCATION_KEY && direction === "SOUTH") {
    return {
      speaker: "Сон",
      title: "Сон говорить",
      text: "Бачиш? Зачинене не завжди вороже. Іноді воно просто чекає правильного слова. Тут уже можна прокинутися або піти вбік: на сході вчаться помічати речі, на заході — берегти снагу.",
    };
  }

  if (from.key === TUTORIAL_HUB_LOCATION_KEY && to.key === TUTORIAL_FORAGING_LOCATION_KEY && direction === "EAST") {
    return {
      speaker: "Сон",
      title: "Сон підказує",
      text: "Коли місцина здається порожньою, роздивися її ближче. Не все корисне видно з першого погляду.",
    };
  }

  if (from.key === TUTORIAL_HUB_LOCATION_KEY && to.key === TUTORIAL_REST_LOCATION_KEY && direction === "WEST") {
    return {
      speaker: "Сон",
      title: "Сон підказує",
      text: "Снага не бездонна. Якщо шлях довгий, короткий відпочинок іноді мудріший за ще один крок.",
    };
  }

  if (from.key === TUTORIAL_HUB_LOCATION_KEY && to.key === TUTORIAL_TIME_LOCATION_KEY && direction === "SOUTH") {
    return {
      speaker: "Сон",
      title: "Сон показує плесо",
      text: "Час, календар і погода в Порубіжжі не одне й те саме. /time питає, яка зараз пора доби; /calendar згадує коло й рік; /weather слухає небо.",
    };
  }

  if (from.key === TUTORIAL_TIME_LOCATION_KEY && to.key === TUTORIAL_SAFETY_LOCATION_KEY && direction === "SOUTH") {
    return {
      speaker: "Сон",
      title: "Сон говорить тихіше",
      text: "Добрий шлях знає не тільки рух уперед. Він знає, коли озирнутися, коли відпочити й коли перевірити власний стан.",
    };
  }

  if (from.key === TUTORIAL_SAFETY_LOCATION_KEY && to.key === TUTORIAL_ATTENTION_LOCATION_KEY && direction === "SOUTH") {
    return {
      speaker: "Сон",
      title: "Сон показує мох",
      text: "Озирнутися — це не втекти поглядом. Це згадати місце, перш ніж просити його про подробиці.",
    };
  }

  if (from.key === TUTORIAL_ATTENTION_LOCATION_KEY && to.key === TUTORIAL_SIGNS_LOCATION_KEY && direction === "SOUTH") {
    return {
      speaker: "Дрімота",
      title: "Дрімота позіхає біля знаків",
      text: "Знак, який доводиться роздивлятися, принаймні чесний: він одразу каже, що не збирається все робити за тебе.",
    };
  }

  if (from.key === TUTORIAL_SIGNS_LOCATION_KEY && to.key === TUTORIAL_TRACES_LOCATION_KEY && direction === "SOUTH") {
    return {
      speaker: "Сон",
      title: "Сон нахиляється до піску",
      text: "Слід — теж знак. Тільки його пишуть не руки, а рух.",
    };
  }

  if (from.key === TUTORIAL_TRACES_LOCATION_KEY && to.key === TUTORIAL_END_LOCATION_KEY && direction === "SOUTH") {
    return {
      speaker: "Сон",
      title: "Сон стишується",
      text: "Досить для першого пробудження. Далі Порубіжжя навчатиме не кімнатами, а власним шумом.",
    };
  }

  if ([TUTORIAL_FORAGING_LOCATION_KEY, TUTORIAL_REST_LOCATION_KEY, TUTORIAL_TIME_LOCATION_KEY].includes(from.key) && to.key === TUTORIAL_HUB_LOCATION_KEY) {
    return {
      speaker: "Сон",
      title: "Сон шепоче",
      text: "Добре. У Порубіжжі не треба знати все одразу; достатньо пам’ятати, куди можна повернутися.",
    };
  }

  if (from.key === TUTORIAL_SAFETY_LOCATION_KEY && to.key === TUTORIAL_TIME_LOCATION_KEY && direction === "NORTH") {
    return {
      speaker: "Сон",
      title: "Сон шепоче",
      text: "Назад до плеса, тоді до галявини. Навіть у сні корисно запам’ятовувати ланцюжок повернення.",
    };
  }

  if (direction === "NORTH") {
    const text = from.key === TUTORIAL_SECOND_STEP_LOCATION_KEY
      ? "Ой, чого ти повернувся? Там, позаду, тільки перший туман. Йди далі."
      : "Назад завжди м’якше, правда? Можна ходити колами й називати це обережністю.";
    return {
      speaker: from.key === TUTORIAL_SECOND_STEP_LOCATION_KEY ? "Сон" : "Дрімота",
      title: from.key === TUTORIAL_SECOND_STEP_LOCATION_KEY ? "Сон зітхає" : "Дрімота ворушиться",
      text,
    };
  }

  return null;
}

export async function tutorialTrackComments(locationId: number, detail: boolean): Promise<TutorialVoiceComment[]> {
  if (!detail) return [];
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    select: { key: true, z: true, region: { select: { key: true } } },
  });
  if (!location || !isTutorialLocation(location)) return [];

  return [
    {
      speaker: "Сон",
      title: "Сон шепоче",
      text: "Молодець. Уважний погляд знаходить те, що поспіх лишає позаду.",
    },
    {
      speaker: "Дрімота",
      title: "Дрімота бурмоче",
      text: "Не вдивляйся так довго. Йди вперед, не губи тут час.",
    },
  ];
}
