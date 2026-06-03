import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { normalizeInput } from "../input/aliases";
import { normalizeCreatureActionText } from "../utils/creatureActionText";
import { creatureForms, playerForms } from "./grammar";
import { isFreshenedCorpse } from "./meat";
import { heldWeaponLine } from "./weapons";
import { isCampSpiritCatCreature } from "./campSpiritCat";
import { visibilityRulesForLocation, type VisibilityRules } from "./visibility";

export type TextTargetRef = {
  type: "player" | "creature";
  id: number;
  label: string;
  actionLabel?: string;
  canGreet: boolean;
  canAttack?: boolean;
  isCorpse?: boolean;
  searchKeys: string[];
};

export type TextTargetAction = "inspect" | "greet" | "attack" | "freshen";

export type TextTargetMatch =
  | { kind: "none" }
  | { kind: "one"; target: TextTargetRef }
  | { kind: "many"; targets: TextTargetRef[] };

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

export function selfTargetSearchKeysForPlayer(player: any) {
  const forms = playerForms(player);
  return uniqueKeys([
    ...Object.values(forms),
    player.nameNominative,
    player.nameGenitive,
    player.nameDative,
    player.nameAccusative,
    player.nameInstrumental,
    player.nameLocative,
    player.nameVocative,
    player.firstName,
    player.lastName,
    player.username,
  ]);
}

export function isSelfTargetQueryForPlayer(value: string, player: any) {
  if (isSelfTargetQuery(value)) return true;
  const target = normalizeTargetKey(value)
    .replace(/^(?:at|на|до)\s+/, "")
    .trim();
  return Boolean(target && selfTargetSearchKeysForPlayer(player).some((key) => key === target));
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

  if (isCampSpiritCatCreature(creature)) {
    return uniqueKeys([
      ...baseKeys,
      "cat",
      "camp cat",
      "spirit cat",
      "camp spirit cat",
      "кіт",
      "кота",
      "коту",
      "котові",
      "бережник",
      "бережника",
      "бережнику",
      "бережникові",
      "кіт-бережник",
      "кота-бережника",
      "коту-бережнику",
      "коту-бережникові",
      "котові-бережнику",
      "котові-бережникові",
      "кіт бережник",
      "кота бережника",
      "коту бережнику",
      "коту бережникові",
      "котові бережнику",
      "котові бережникові",
    ]);
  }

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

export function textTargetVisibleUnderRules(
  target: { type?: unknown; isCorpse?: boolean },
  rules: Pick<VisibilityRules, "showGroundObjects" | "showNearbyDetails">,
) {
  return target.isCorpse ? rules.showGroundObjects : rules.showNearbyDetails;
}

export async function visibleTextTargets(locationId: number, viewerPlayerId: number): Promise<TextTargetRef[]> {
  const [visibility, players, creatures] = await Promise.all([
    visibilityRulesForLocation(locationId, "details"),
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
    canAttack: false,
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
      canAttack: !isCorpse && creature.species.kind === "ANIMAL" && creature.species.diet !== "CARNIVORE",
      isCorpse,
      searchKeys: targetSearchKeysForCreature(creature),
    };
  });

  return [...playerTargets, ...creatureTargets].filter((target) => textTargetVisibleUnderRules(target, visibility));
}

export function targetListText(targets: TextTargetRef[]) {
  return targets.map((target, index) => `${index + 1}. ${targetDisplayLabel(target)}`).join("\n");
}

export function textTargetsForAction(action: TextTargetAction, targets: TextTargetRef[]) {
  if (action === "inspect") return targets;
  if (action === "greet") return targets.filter((target) => target.canGreet);
  if (action === "attack") return targets.filter((target) => target.canAttack);
  if (action === "freshen") return targets.filter((target) => target.isCorpse);
  return targets;
}

export function inspectMissingText(targetQuery: string, targets: TextTargetRef[] = []) {
  const target = targetQuery.trim();
  const intro = target ? `Не бачу цього тут: «${target}».` : "Не бачу цього тут.";
  if (!targets.length) return `${intro}\n\nМожна роздивитися саму місцину або її помітні особливості.`;
  return `${intro}\n\nПоруч можна роздивитися:\n${targetListText(targets)}`;
}

export function bestTargetMatch(query: string, targets: TextTargetRef[]): TextTargetMatch {
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

function splitTrailingVisibleIndex(query: string) {
  const target = normalizeTargetKey(query);
  const match = target.match(/^(.+?)\s+(\d+)$/u);
  if (!match) return null;
  const index = Number(match[2]);
  if (!Number.isSafeInteger(index) || index < 1) return null;
  return { prefix: match[1].trim(), index };
}

function targetMatchesPrefix(prefix: string, target: TextTargetRef) {
  if (!prefix) return true;
  return bestTargetMatch(prefix, [target]).kind === "one";
}

function collapseEquivalentAttackTargets(action: TextTargetAction, match: TextTargetMatch): TextTargetMatch {
  if (action !== "attack" || match.kind !== "many" || match.targets.length === 0) return match;
  const labels = new Set(match.targets.map((target) => normalizeTargetKey(target.label)));
  return labels.size === 1 ? { kind: "one", target: match.targets[0] } : match;
}

export function bestTargetActionMatch(action: TextTargetAction, query: string, visibleTargets: TextTargetRef[]): TextTargetMatch {
  const indexed = splitTrailingVisibleIndex(query);
  if (indexed) {
    const selected = visibleTargets[indexed.index - 1];
    if (selected && textTargetsForAction(action, [selected]).length && targetMatchesPrefix(indexed.prefix, selected)) {
      return { kind: "one", target: selected };
    }
  }

  const candidates = textTargetsForAction(action, visibleTargets);
  return collapseEquivalentAttackTargets(action, bestTargetMatch(query, candidates));
}
