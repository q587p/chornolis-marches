import { prisma } from "../db";
import { normalizeInput } from "../input/aliases";
import { creatureForms, playerForms } from "./grammar";

type SpeechTargetRef = {
  type: "player" | "creature";
  id: number;
  name: string;
  dative: string;
  searchKeys: string[];
};

export type ParsedSpeech = {
  text: string;
  targetType?: "player" | "creature";
  targetId?: number;
  targetName?: string;
  targetDative?: string;
};

function normalizeTargetKey(value: string) {
  return normalizeInput(value).replace(/^#/, "").trim();
}

function uniqueKeys(keys: Array<string | null | undefined>) {
  return [...new Set(keys.filter(Boolean).map((key) => normalizeTargetKey(String(key))).filter(Boolean))];
}

async function visibleSpeechTargets(locationId: number, viewerPlayerId: number): Promise<SpeechTargetRef[]> {
  const [players, creatures] = await Promise.all([
    prisma.player.findMany({ where: { currentLocationId: locationId, id: { not: viewerPlayerId } }, orderBy: { id: "asc" } }),
    prisma.creature.findMany({
      where: {
        locationId,
        isAlive: true,
        isGone: false,
        isHidden: false,
        species: { kind: { not: "ANIMAL" } },
      },
      include: { species: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const playerTargets = players.map((player) => {
    const forms = playerForms(player);
    return {
      type: "player" as const,
      id: player.id,
      name: forms.nominative,
      dative: forms.dative,
      searchKeys: uniqueKeys([
        String(player.id),
        `#${player.id}`,
        player.nameNominative,
        player.firstName,
        player.lastName,
        player.username,
        forms.nominative,
        forms.dative,
      ]),
    };
  });

  const creatureTargets = creatures.map((creature) => {
    const forms = creatureForms(creature);
    return {
      type: "creature" as const,
      id: creature.id,
      name: forms.nominative,
      dative: forms.dative,
      searchKeys: uniqueKeys([
        String(creature.id),
        `#${creature.id}`,
        creature.name,
        creature.nameDative,
        forms.nominative,
        forms.dative,
        creature.species.name,
        creature.species.nameDative,
      ]),
    };
  });

  return [...playerTargets, ...creatureTargets];
}

async function knownSpeechTargets(viewerPlayerId: number): Promise<SpeechTargetRef[]> {
  const [players, creatures] = await Promise.all([
    prisma.player.findMany({ where: { id: { not: viewerPlayerId } }, orderBy: { id: "asc" } }),
    prisma.creature.findMany({
      where: {
        isAlive: true,
        isGone: false,
        species: { kind: { not: "ANIMAL" } },
      },
      include: { species: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const playerTargets = players.map((player) => {
    const forms = playerForms(player);
    return {
      type: "player" as const,
      id: player.id,
      name: forms.nominative,
      dative: forms.dative,
      searchKeys: uniqueKeys([
        String(player.id),
        `#${player.id}`,
        player.nameNominative,
        player.firstName,
        player.lastName,
        player.username,
        forms.nominative,
        forms.dative,
      ]),
    };
  });

  const creatureTargets = creatures.map((creature) => {
    const forms = creatureForms(creature);
    return {
      type: "creature" as const,
      id: creature.id,
      name: forms.nominative,
      dative: forms.dative,
      searchKeys: uniqueKeys([
        String(creature.id),
        `#${creature.id}`,
        creature.name,
        creature.nameDative,
        forms.nominative,
        forms.dative,
        creature.species.name,
        creature.species.nameDative,
      ]),
    };
  });

  return [...playerTargets, ...creatureTargets];
}

function exactTargetMatch(query: string, targets: SpeechTargetRef[]) {
  const normalized = normalizeTargetKey(query);
  if (!normalized) return null;

  const matches = targets.filter((candidate) => candidate.searchKeys.some((key) => key === normalized));
  return matches.length === 1 ? matches[0] : null;
}

export function missingSpeechTargetText(target: Pick<SpeechTargetRef, "dative">) {
  return `${target.dative} зараз не видно поруч. Може, співрозмовник просто не на видноті, а може вже відійшов.\n\nМожна гукнути поруч (/yell), крикнути в регіон (/shout) або уважніше роздивитися сліди.`;
}

export async function parseSpeechTarget(text: string, locationId: number, viewerPlayerId: number): Promise<ParsedSpeech> {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return { text };

  const targets = await visibleSpeechTargets(locationId, viewerPlayerId);
  const maxPrefix = Math.min(4, words.length - 1);
  for (let wordCount = maxPrefix; wordCount >= 1; wordCount -= 1) {
    const prefix = words.slice(0, wordCount).join(" ");
    const target = exactTargetMatch(prefix, targets);
    if (!target) continue;

    const speechText = words.slice(wordCount).join(" ").trim();
    if (!speechText) break;

    return {
      text: speechText,
      targetType: target.type,
      targetId: target.id,
      targetName: target.name,
      targetDative: target.dative,
    };
  }

  const knownTargets = await knownSpeechTargets(viewerPlayerId);
  for (let wordCount = maxPrefix; wordCount >= 1; wordCount -= 1) {
    const prefix = words.slice(0, wordCount).join(" ");
    const target = exactTargetMatch(prefix, knownTargets);
    if (!target) continue;

    const speechText = words.slice(wordCount).join(" ").trim();
    if (!speechText) break;

    throw new Error(missingSpeechTargetText(target));
  }

  return { text };
}
