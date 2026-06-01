import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { normalizeInput } from "../input/aliases";
import { normalizeCreatureActionText } from "../utils/creatureActionText";
import { creatureForms } from "./grammar";
import { isFreshenedCorpse } from "./meat";
import { heldWeaponLine } from "./weapons";
import { isCampSpiritCatCreature } from "./campSpiritCat";

export type TextTargetRef = {
  type: "player" | "creature";
  id: number;
  label: string;
  actionLabel?: string;
  canGreet: boolean;
  isCorpse?: boolean;
  searchKeys: string[];
};

export function normalizeTargetKey(value: string) {
  return normalizeInput(value)
    .replace(/^#/, "")
    .replace(/^ціль\s+/, "")
    .replace(/^target\s+/, "")
    .trim();
}

const SELF_TARGET_KEYS = new Set([
  "me",
  "myself",
  "self",
  "i",
  "я",
  "мене",
  "себе",
  "собі",
  "собою",
  "самого себе",
  "саму себе",
  "сам себе",
  "сама себе",
  "мій персонаж",
  "мого персонажа",
  "свій персонаж",
  "свого персонажа",
  "моя постать",
  "мою постать",
  "своя постать",
  "свою постать",
]);

export function isSelfTargetQuery(value: string) {
  const target = normalizeTargetKey(value)
    .replace(/^(?:at|на|до)\s+/, "")
    .trim();
  return SELF_TARGET_KEYS.has(target);
}

function uniqueKeys(keys: Array<string | null | undefined>) {
  return [...new Set(keys.filter(Boolean).map((key) => normalizeTargetKey(String(key))).filter(Boolean))];
}

function targetSearchKeysForPlayer(player: any) {
  return uniqueKeys([
    String(player.id),
    `#${player.id}`,
    player.nameNominative,
    player.firstName,
    player.lastName,
    player.username,
    "гравець",
    "персонаж",
    "мандрівник",
  ]);
}

function targetSearchKeysForCreature(creature: any) {
  const isCorpse = !creature.isAlive && creature.age === "CORPSE";
  const species = creature.species;
  const baseKeys = uniqueKeys([
    String(creature.id),
    `#${creature.id}`,
    creature.name,
    creature.nameGenitive,
    creature.nameDative,
    creature.nameAccusative,
    creature.nameInstrumental,
    creature.nameLocative,
    creature.nameVocative,
    species.name,
    species.nameGenitive,
    species.nameDative,
    species.nameAccusative,
    species.nameInstrumental,
    species.nameLocative,
    species.nameVocative,
  ]);

  if (!isCorpse) return baseKeys;
  return uniqueKeys([
    ...baseKeys,
    "труп",
    `труп ${species.name}`,
    `труп: ${species.name}`,
    species.nameGenitive ? `труп ${species.nameGenitive}` : undefined,
  ]);
}

export function targetDisplayLabel(target: TextTargetRef) {
  if (target.isCorpse) return target.label;
  return target.actionLabel ? `${target.label} — ${target.actionLabel}` : target.label;
}

export function visibleTextTargetCreatureWhere(locationId: number): Prisma.CreatureWhereInput {
  return {
    locationId,
    isGone: false,
    OR: [
      { isAlive: true, isHidden: false },
      {
        isAlive: false,
        age: "CORPSE",
        isHidden: false,
        NOT: [
          { currentAction: { startsWith: "freshened_by_player:" } },
          { currentAction: { contains: "; freshened_by_player:" } },
          { currentAction: { startsWith: "freshened_by_hunter:" } },
          { currentAction: { contains: "; freshened_by_hunter:" } },
        ],
      },
    ],
  };
}

export async function visibleTextTargets(locationId: number, viewerPlayerId: number): Promise<TextTargetRef[]> {
  const [players, creatures] = await Promise.all([
    prisma.player.findMany({ where: { currentLocationId: locationId, id: { not: viewerPlayerId } }, orderBy: { id: "asc" } }),
    prisma.creature.findMany({
      where: visibleTextTargetCreatureWhere(locationId),
      include: { species: true },
      orderBy: [{ isAlive: "desc" }, { id: "asc" }],
    }),
  ]);

  const playerTargets = players.map((player) => ({
    type: "player" as const,
    id: player.id,
    label: player.nameNominative ?? player.firstName ?? player.username ?? "мандрівник",
    actionLabel: heldWeaponLine(player.equippedWeaponKey)?.replace(/\.$/u, "").toLocaleLowerCase("uk-UA"),
    canGreet: true,
    searchKeys: targetSearchKeysForPlayer(player),
  }));

  const creatureTargets = creatures.map((creature) => {
    const isCorpse = !creature.isAlive && creature.age === "CORPSE";
    const wasFreshened = isCorpse && isFreshenedCorpse(creature.currentAction);
    return {
      type: "creature" as const,
      id: creature.id,
      label: isCorpse ? `${wasFreshened ? "рештки" : "труп"} ${creatureForms(creature).genitive}` : creature.name ?? creature.species.name,
      actionLabel: isCorpse
        ? undefined
        : [heldWeaponLine(creature.equippedWeaponKey)?.replace(/\.$/u, "").toLocaleLowerCase("uk-UA"), normalizeCreatureActionText(creature.currentAction)].filter(Boolean).join("; ") || undefined,
      canGreet: !isCorpse && creature.species.kind !== "ANIMAL" && !isCampSpiritCatCreature(creature),
      isCorpse,
      searchKeys: targetSearchKeysForCreature(creature),
    };
  });

  return [...playerTargets, ...creatureTargets];
}

export function targetListText(targets: TextTargetRef[]) {
  return targets.map((target, index) => `${index + 1}. ${targetDisplayLabel(target)}`).join("\n");
}

export function inspectMissingText(targetQuery: string, targets: TextTargetRef[] = []) {
  const target = targetQuery.trim();
  const intro = target ? `Не бачу цього тут: «${target}».` : "Не бачу цього тут.";
  if (!targets.length) return `${intro}\n\nМожна роздивитися саму місцину або її помітні особливості.`;
  return `${intro}\n\nПоруч можна роздивитися:\n${targetListText(targets)}`;
}

export function bestTargetMatch(query: string, targets: TextTargetRef[]) {
  const target = normalizeTargetKey(query);
  if (!target) return { kind: "none" as const };

  const asIndex = target.match(/^\d+$/) ? Number(target) : NaN;
  if (Number.isSafeInteger(asIndex) && asIndex >= 1 && asIndex <= targets.length) {
    return { kind: "one" as const, target: targets[asIndex - 1] };
  }

  const exact = targets.filter((candidate) => candidate.searchKeys.some((key) => key === target));
  if (exact.length === 1) return { kind: "one" as const, target: exact[0] };
  if (exact.length > 1) return { kind: "many" as const, targets: exact };

  const fuzzy = targets.filter((candidate) =>
    candidate.searchKeys.some((key) => key.length > 2 && (key.includes(target) || target.includes(key)))
  );
  if (fuzzy.length === 1) return { kind: "one" as const, target: fuzzy[0] };
  if (fuzzy.length > 1) return { kind: "many" as const, targets: fuzzy };

  return { kind: "none" as const };
}
