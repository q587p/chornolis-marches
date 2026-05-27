import { Direction, type Player } from "@prisma/client";
import { prisma } from "../db";
import {
  isTutorialLocation,
  TUTORIAL_FORAGING_LOCATION_KEY,
  TUTORIAL_GATE_LOCATION_KEY,
  TUTORIAL_HUB_LOCATION_KEY,
  TUTORIAL_REST_LOCATION_KEY,
  TUTORIAL_SECOND_STEP_LOCATION_KEY,
  TUTORIAL_START_LOCATION_KEY,
} from "./tutorial";

export type TutorialVoiceComment = {
  speaker: "Сон" | "Дрімота";
  title: string;
  text: string;
};

const TUTORIAL_LOOK_EVENT_TITLE = "Tutorial look";
const TUTORIAL_PACE_EVENT_TITLE = "Tutorial pace comment";
const TUTORIAL_LOOK_WINDOW_MS = 60_000;
const TUTORIAL_PACE_COOLDOWN_MS = 30_000;
const TUTORIAL_IDLE_PACE_COOLDOWN_MS = 120_000;
const TUTORIAL_IDLE_PACE_DELAY_MS = 30_000;

type TutorialPlayerRef = Pick<Player, "id" | "currentLocationId" | "pronoun" | "grammaticalGender">;
type TutorialIdlePlayerRef = TutorialPlayerRef & Pick<Player, "lastActionAt" | "updatedAt" | "createdAt">;

function tutorialPacePronoun(player: TutorialPlayerRef) {
  if (player.pronoun === "SHE" || player.grammaticalGender === "FEMININE") return "неї";
  if (player.pronoun === "THEY" || player.grammaticalGender === "PLURAL") return "них";
  return "нього";
}

async function isPlayerInTutorial(locationId: number) {
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    select: { key: true, z: true, region: { select: { key: true } } },
  });
  return Boolean(location && isTutorialLocation(location));
}

async function tutorialPaceComments(player: TutorialPlayerRef, reason: "look" | "wait" | "idle", cooldownMs = TUTORIAL_PACE_COOLDOWN_MS): Promise<TutorialVoiceComment[]> {
  const locationId = player.currentLocationId;
  if (!locationId || !(await isPlayerInTutorial(locationId))) return [];

  const recentComment = await prisma.worldEvent.findFirst({
    where: {
      playerId: player.id,
      locationId,
      title: TUTORIAL_PACE_EVENT_TITLE,
      createdAt: { gte: new Date(Date.now() - cooldownMs) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recentComment) return [];

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: TUTORIAL_PACE_EVENT_TITLE,
      description: reason,
      playerId: player.id,
      locationId,
    },
  });

  return [
    {
      speaker: "Дрімота",
      title: "Дрімота підганяє",
      text: "Ну ходімо вже скоріше. Якщо довго стояти, туман почне думати, що ми тут живемо.",
    },
    {
      speaker: "Сон",
      title: "Сон спокійно каже",
      text: `У ${tutorialPacePronoun(player)} є час. У кожного свій темп; сон не жене, він чекає.`,
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

export async function tutorialWaitPaceComments(player: TutorialPlayerRef): Promise<TutorialVoiceComment[]> {
  return tutorialPaceComments(player, "wait");
}

export async function tutorialIdlePaceComments(player: TutorialIdlePlayerRef, now = new Date()): Promise<TutorialVoiceComment[]> {
  const lastActivity = [player.lastActionAt, player.updatedAt, player.createdAt]
    .filter((date): date is Date => Boolean(date))
    .reduce((latest, date) => (date.getTime() > latest.getTime() ? date : latest), player.createdAt);
  if (now.getTime() - lastActivity.getTime() < TUTORIAL_IDLE_PACE_DELAY_MS) return [];
  return tutorialPaceComments(player, "idle", TUTORIAL_IDLE_PACE_COOLDOWN_MS);
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

  if ((from.key === TUTORIAL_FORAGING_LOCATION_KEY || from.key === TUTORIAL_REST_LOCATION_KEY) && to.key === TUTORIAL_HUB_LOCATION_KEY) {
    return {
      speaker: "Сон",
      title: "Сон шепоче",
      text: "Добре. У Порубіжжі не треба знати все одразу; достатньо пам’ятати, куди можна повернутися.",
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
