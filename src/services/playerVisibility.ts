import type { Bot } from "grammy";
import { prisma } from "../db";
import { notifyLocationExcept } from "./notifications";
import { playerForms } from "./grammar";

type PlayerVisibilityRef = {
  id: number;
  currentLocationId?: number | null;
  nameNominative?: string | null;
  nameGenitive?: string | null;
  nameDative?: string | null;
  nameAccusative?: string | null;
  nameInstrumental?: string | null;
  nameLocative?: string | null;
  nameVocative?: string | null;
  firstName?: string | null;
  username?: string | null;
  grammaticalGender?: string | null;
  pronoun?: string | null;
  animacy?: string | null;
};

type ObserverTextFactory = (player: PlayerVisibilityRef) => string;

const PLAYER_VISIBILITY_SELECT = {
  id: true,
  currentLocationId: true,
  nameNominative: true,
  nameGenitive: true,
  nameDative: true,
  nameAccusative: true,
  nameInstrumental: true,
  nameLocative: true,
  nameVocative: true,
  firstName: true,
  username: true,
  grammaticalGender: true,
  pronoun: true,
  animacy: true,
} as const;

function genderOf(player: PlayerVisibilityRef) {
  if (player.grammaticalGender === "FEMININE" || player.grammaticalGender === "NEUTER" || player.grammaticalGender === "PLURAL") {
    return player.grammaticalGender;
  }
  if (player.pronoun === "SHE") return "FEMININE";
  if (player.pronoun === "THEY") return "PLURAL";
  return "MASCULINE";
}

function word(player: PlayerVisibilityRef, singular: string, plural: string) {
  return genderOf(player) === "PLURAL" ? plural : singular;
}

function named(player: PlayerVisibilityRef, text: string) {
  return `${playerForms(player).nominative} ${text}`;
}

export function playerSitObserverText(player: PlayerVisibilityRef) {
  return named(player, word(player, "сідає.", "сідають."));
}

export function playerStandObserverText(player: PlayerVisibilityRef) {
  return named(player, word(player, "встає.", "встають."));
}

export function playerRestStartObserverText(player: PlayerVisibilityRef) {
  return named(player, word(player, "сідає й починає відпочивати.", "сідають і починають відпочивати."));
}

export function playerRestStopObserverText(player: PlayerVisibilityRef) {
  return named(player, word(player, "закінчує відпочинок і лишається сидіти.", "закінчують відпочинок і лишаються сидіти."));
}

export function playerTutorialSleepObserverText(player: PlayerVisibilityRef) {
  return named(player, word(player, "заплющує очі й провалюється в навчальний сон.", "заплющують очі й провалюються в навчальний сон."));
}

export function playerTutorialWakeObserverText(player: PlayerVisibilityRef) {
  return named(player, word(player, "повертається зі сну й розплющує очі.", "повертаються зі сну й розплющують очі."));
}

export async function notifyPlayerObservers(
  bot: Bot,
  input: {
    playerId: number;
    locationId?: number | null;
    observerText: ObserverTextFactory;
  },
) {
  const locationId = input.locationId ?? undefined;
  if (!locationId) return;

  const player = await prisma.player.findUnique({
    where: { id: input.playerId },
    select: PLAYER_VISIBILITY_SELECT,
  });
  if (!player) return;

  try {
    await notifyLocationExcept(bot, locationId, [player.id], input.observerText(player));
  } catch (error) {
    console.warn("[player-visibility] failed to notify location", error);
  }
}
