import { Direction } from "@prisma/client";
import { prisma } from "../db";
import {
  isTutorialLocation,
  TUTORIAL_GATE_LOCATION_KEY,
  TUTORIAL_HUB_LOCATION_KEY,
  TUTORIAL_SECOND_STEP_LOCATION_KEY,
  TUTORIAL_START_LOCATION_KEY,
} from "./tutorial";

export type TutorialVoiceComment = {
  speaker: "Сон" | "Дрімота";
  title: string;
  text: string;
};

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
      text: "Бачиш? Зачинене не завжди вороже. Іноді воно просто чекає правильного слова. Тут уже можна прокинутися, а потім повернутися до цього самого місця сну.",
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
