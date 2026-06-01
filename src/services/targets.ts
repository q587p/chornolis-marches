import { prisma } from "../db";
import { BASE_HP, BASE_STAMINA } from "../gameConfig";
import { formatObservedPostureText, formatObservedVitalsText, formatPlayerStats, formatVitalsLine } from "../utils/playerText";
import { visibleHeldTorchText } from "../utils/torchText";
import { normalizeCreatureActionText } from "../utils/creatureActionText";
import { creatureForms, playerForms, type NameForms } from "./grammar";
import { lifetimeSummary } from "./itemLifetime";
import { playerShowsTechnicalDetails } from "./technicalDetails";
import { creatureCarriedTorchCount, getCreatureTorchState, getPlayerTorchState } from "./fire";
import { isFreshenedCorpse } from "./meat";
import { resourceTypeDisplayName, resourceTypeGrammaticalGender, type ResourceDisplayGender } from "./corpses";
import {
  claimedCorpsesForHunter,
  groupHunterClaimedCorpses,
  hunterCarriedTorchCount,
  hunterIsReturningForTorches,
  isHunterCreature,
} from "./npcHunter";
import { heldWeaponLine } from "./weapons";

export type ResolvedTarget = {
  kind: "player" | "creature";
  id: number;
  name: string;
  canGreet: boolean;
  canAttack: boolean;
  isAnimal: boolean;
  isCorpse: boolean;
  canFreshen: boolean;
  inspect: string;
  forms: NameForms;
};

export type TargetInspectDetail = "brief" | "full";

function formatSex(sex: string | null | undefined) {
  if (sex === "MALE") return "самець";
  if (sex === "FEMALE") return "самиця";
  return "невідомо";
}

function formatCreatureStats(target: {
  steps: number;
  looks: number;
  says: number;
  gatherAttempts: number;
  successfulGathers: number;
  attackAttempts: number;
  successfulAttacks: number;
  kills: number;
}) {
  return [
    `Переходів між місцинами: ${target.steps}`,
    `Оглядів: ${target.looks}`,
    `Сказано фраз: ${target.says}`,
    `Спроб збору: ${target.gatherAttempts}`,
    `Вдалого збору: ${target.successfulGathers}`,
    `Атак: ${target.attackAttempts}`,
    `Влучних атак: ${target.successfulAttacks}`,
    `Убивств: ${target.kills}`,
  ].join("\n");
}

type CreatureGender = "MASCULINE" | "FEMININE" | "NEUTER" | "PLURAL";

function creatureGender(target: { sex?: string | null; species: { grammaticalGender?: string | null } }): CreatureGender {
  if (target.sex === "MALE") return "MASCULINE";
  if (target.sex === "FEMALE") return "FEMININE";
  if (target.species.grammaticalGender === "FEMININE" || target.species.grammaticalGender === "NEUTER" || target.species.grammaticalGender === "PLURAL") return target.species.grammaticalGender;
  return "MASCULINE";
}

function creatureWord(target: { sex?: string | null; species: { grammaticalGender?: string | null } }, words: Record<CreatureGender, string>) {
  return words[creatureGender(target)];
}

function stripSentenceEnd(text: string) {
  return text.trim().replace(/[.!?…]+$/u, "");
}

export function formatCreatureStatusLine(target: { isAlive: boolean; sex?: string | null; species: { grammaticalGender?: string | null } }, visibleAction?: string | null) {
  const state = target.isAlive
    ? creatureWord(target, { MASCULINE: "живий", FEMININE: "жива", NEUTER: "живе", PLURAL: "живі" })
    : creatureWord(target, { MASCULINE: "мертвий", FEMININE: "мертва", NEUTER: "мертве", PLURAL: "мертві" });
  const action = visibleAction ? stripSentenceEnd(visibleAction) : "";
  return `Стан: ${state}${action ? `, ${action}` : ""}.`;
}

export function formatCreatureLifeState(target: { hp: number; maxHp?: number | null; species: { baseHp: number; grammaticalGender?: string | null }; sex?: string | null }) {
  const maxHp = target.maxHp ?? target.species.baseHp;
  const ratio = maxHp > 0 ? target.hp / maxHp : 0;
  if (target.hp <= 0) return "Життя: не подає ознак життя.";
  if (ratio >= 0.85) return "Життя: виглядає міцно.";
  if (ratio >= 0.45) return "Життя: має рани, але тримається.";
  return `Життя: ${creatureWord(target, { MASCULINE: "тяжко поранений", FEMININE: "тяжко поранена", NEUTER: "тяжко поранене", PLURAL: "тяжко поранені" })}.`;
}

function formatCreatureAge(age: string, target: { sex?: string | null; species: { grammaticalGender?: string | null } }) {
  if (age === "CHILD") return creatureWord(target, { MASCULINE: "дитинча", FEMININE: "дитинча", NEUTER: "дитинча", PLURAL: "дитинчата" });
  if (age === "YOUNG") return creatureWord(target, { MASCULINE: "молодий", FEMININE: "молода", NEUTER: "молоде", PLURAL: "молоді" });
  if (age === "OLD") return creatureWord(target, { MASCULINE: "старий", FEMININE: "стара", NEUTER: "старе", PLURAL: "старі" });
  return creatureWord(target, { MASCULINE: "дорослий", FEMININE: "доросла", NEUTER: "доросле", PLURAL: "дорослі" });
}

function playerGender(player: { grammaticalGender?: string | null; pronoun?: string | null }) {
  if (player.grammaticalGender === "FEMININE" || player.grammaticalGender === "NEUTER" || player.grammaticalGender === "PLURAL") return player.grammaticalGender;
  if (player.pronoun === "SHE") return "FEMININE";
  if (player.pronoun === "THEY") return "PLURAL";
  return "MASCULINE";
}

function genderedPlayerState(player: { grammaticalGender?: string | null; pronoun?: string | null }) {
  const gender = playerGender(player);
  if (gender === "FEMININE") return "жива й активна";
  if (gender === "NEUTER") return "живе й активне";
  if (gender === "PLURAL") return "живі й активні";
  return "живий і активний";
}

function genderedUnarmed(player: { grammaticalGender?: string | null; pronoun?: string | null }) {
  const looks = playerGender(player) === "PLURAL" ? "Виглядають" : "Виглядає";
  if (playerGender(player) === "FEMININE") return `${looks} беззбройною.`;
  if (playerGender(player) === "NEUTER") return `${looks} беззбройним.`;
  if (playerGender(player) === "PLURAL") return `${looks} беззбройними.`;
  return `${looks} беззбройним.`;
}

function qualitativeAmount(amount: number, gender: ResourceDisplayGender = "MASCULINE") {
  if (amount <= 0) return "немає";
  if (amount === 1) {
    if (gender === "FEMININE") return "лише одна";
    if (gender === "NEUTER") return "лише одне";
    return "лише один";
  }
  if (amount <= 3) return "трохи";
  if (amount <= 8) return "чимало";
  return "багато";
}

function inventoryResourceLines(resources: Array<{ amount: number; resourceType: { key: string; name: string } }>, options: { exact?: boolean } = {}) {
  return resources
    .filter((resource) => resource.amount > 0)
    .map((resource) => options.exact
      ? `- ${resourceTypeDisplayName(resource.resourceType)} ×${resource.amount}`
      : `- ${resourceTypeDisplayName(resource.resourceType)}: ${qualitativeAmount(resource.amount, resourceTypeGrammaticalGender(resource.resourceType))}`);
}

export function inventoryResourceSummary(resources: Array<{ amount: number; resourceType: { key: string; name: string } }>, options: { exact?: boolean } = {}) {
  const lines = inventoryResourceLines(resources, options);
  return lines.length ? lines.join("\n") : "- нічого помітного";
}

async function playerInventorySummary(playerId: number, options: { exact?: boolean } = {}) {
  const resources = await prisma.playerResource.findMany({
    where: { playerId, amount: { gt: 0 } },
    include: { resourceType: true },
    orderBy: { resourceType: { key: "asc" } },
  });
  return inventoryResourceSummary(resources, options);
}

function visibleCreatureHeldTorchText(torchState: { isLit: boolean; litAmount: number }) {
  if (!torchState.isLit) return "";
  return torchState.litAmount > 1 ? "Тримає запалені факели." : "Тримає запалений факел.";
}

async function hunterTorchSummary(creature: { id: number; currentAction?: string | null }, options: { exact?: boolean } = {}) {
  const realCount = await creatureCarriedTorchCount(creature.id);
  const count = realCount || hunterCarriedTorchCount(creature.currentAction);
  if (count <= 0) return null;
  const returning = hunterIsReturningForTorches(creature.currentAction);
  if (options.exact) return returning
    ? `- факели ×${count}; один із них горить або щойно горів у дорозі`
    : `- факели ×${count}`;
  return returning
    ? `- факели: ${qualitativeAmount(count)}; один із них горить або щойно горів у дорозі`
    : `- факели: ${qualitativeAmount(count)}`;
}

export async function hunterFieldInventorySummary(creature: { id: number; currentAction?: string | null; professionKey?: string | null }, options: { exact?: boolean } = {}) {
  if (!isHunterCreature(creature)) return null;

  const lines: string[] = [];
  const torchLine = await hunterTorchSummary(creature, options);
  if (torchLine) lines.push(torchLine);

  const claimed = await claimedCorpsesForHunter(creature.id);
  const groups = groupHunterClaimedCorpses(claimed);
  if (groups.length) {
    const resourceTypes = await prisma.resourceType.findMany({
      where: { key: { in: groups.map((group) => group.resourceTypeKey) } },
    });
    const resourceByKey = new Map(resourceTypes.map((resource) => [resource.key, resource]));
    for (const group of groups) {
      const resource = resourceByKey.get(group.resourceTypeKey) ?? { key: group.resourceTypeKey, name: group.resourceTypeKey };
      lines.push(options.exact
        ? `- здобич: ${resourceTypeDisplayName(resource)} ×${group.amount}`
        : `- здобич: ${resourceTypeDisplayName(resource)} — ${qualitativeAmount(group.amount)}`);
    }
  }

  return lines.length ? lines.join("\n") : "- мисливський набір не видно або він порожній";
}

export async function resolveTarget(type: string, id: number, locationId: number, options: { viewerPlayerId?: number; detail?: TargetInspectDetail } = {}): Promise<ResolvedTarget | null> {
  const showTechnicalDetails = await playerShowsTechnicalDetails(options.viewerPlayerId);
  const detail = options.detail ?? "full";

  if (type === "player") {
    const target = await prisma.player.findFirst({ where: { id, currentLocationId: locationId } });
    if (!target) return null;
    const forms = playerForms(target);
    const torchState = await getPlayerTorchState(target.id);
    const weaponText = heldWeaponLine(target.equippedWeaponKey) ?? genderedUnarmed(target);
    const visibleLines = [
      `Ви бачите ${forms.accusative}.`,
      "",
      formatObservedPostureText(target),
      `Стан: ${genderedPlayerState(target)}`,
      formatObservedVitalsText(target, { hpFallback: BASE_HP, staminaFallback: BASE_STAMINA }),
      weaponText,
      visibleHeldTorchText(torchState),
    ];
    if (detail === "full") {
      visibleLines.push("", "Поклажа:", await playerInventorySummary(target.id, { exact: showTechnicalDetails }));
    }
    if (showTechnicalDetails) {
      visibleLines.push("", "Технічні деталі:", ...formatVitalsLine(target, { showTechnicalDetails: true, hpFallback: BASE_HP, staminaFallback: BASE_STAMINA }), "", "Статистика:", formatPlayerStats(target));
    }
    return {
      kind: "player",
      id: target.id,
      name: forms.nominative,
      forms,
      canGreet: true,
      canAttack: false,
      isAnimal: false,
      isCorpse: false,
      canFreshen: false,
      inspect: visibleLines.join("\n"),
    };
  }

  if (type === "creature") {
    const target = await prisma.creature.findFirst({ where: { id, locationId, isGone: false, isHidden: false }, include: { species: true } });
    if (!target) return null;
    const forms = creatureForms(target);
    const isAnimal = target.species.kind === "ANIMAL";
    const isCorpse = !target.isAlive && target.age === "CORPSE";
    const corpseLeft = target.corpseDecayTicksLeft ?? target.species.corpseDecayTicks;
    const wasFreshened = isFreshenedCorpse(target.currentAction);
    if (isCorpse && wasFreshened) return null;
    const canFreshen = isCorpse && !wasFreshened && corpseLeft > Math.floor(target.species.corpseDecayTicks / 2);
    const corpseLifetime = lifetimeSummary(corpseLeft, target.species.corpseDecayTicks, { showTechnicalDetails });
    const torchState = isCorpse ? null : await getCreatureTorchState(target.id);
    const torchText = torchState ? visibleCreatureHeldTorchText(torchState) : "";
    const weaponText = heldWeaponLine(target.equippedWeaponKey);

    if (isCorpse) {
      const corpseLabel = wasFreshened ? "рештки" : "труп";
      const corpseIntro = wasFreshened ? `Це рештки ${forms.genitive}.` : `Це труп ${forms.genitive}.`;
      const corpseName = `${corpseLabel} ${forms.genitive}`;
      return {
        kind: "creature",
        id: target.id,
        name: corpseName,
        forms: {
          nominative: corpseName,
          genitive: `${corpseLabel === "рештки" ? "решток" : "трупа"} ${forms.genitive}`,
          dative: `${corpseLabel === "рештки" ? "решткам" : "трупу"} ${forms.genitive}`,
          accusative: `${corpseLabel} ${forms.genitive}`,
          instrumental: `${corpseLabel === "рештки" ? "рештками" : "трупом"} ${forms.genitive}`,
          locative: `${corpseLabel === "рештки" ? "рештках" : "трупі"} ${forms.genitive}`,
          vocative: `${corpseLabel} ${forms.genitive}`,
        },
        canGreet: false,
        canAttack: false,
        isAnimal,
        isCorpse: true,
        canFreshen,
        inspect: `${corpseIntro}\n\nВін розкладається.\nСтан: ${corpseLifetime}.\n${canFreshen ? "\nТруп ще відносно свіжий. Його можна спробувати освіжувати." : wasFreshened ? "\nЗ нього вже зняли придатне м'ясо; лишилося те, що світ ще має розкласти або забрати." : "\nТруп уже надто далеко розклався для освіжування."}`,
      };
    }

    const visibleAction = normalizeCreatureActionText(target.currentAction, "придивляється довкола");
    const hunterInventory = await hunterFieldInventorySummary(target, { exact: showTechnicalDetails });
    const hunterSection = hunterInventory
      ? `\n\nМисливський набір:\n${hunterInventory}`
      : "";

    if (detail === "brief" && !showTechnicalDetails) {
      return {
        kind: "creature",
        id: target.id,
        name: forms.nominative,
        forms,
        canGreet: !isAnimal,
        canAttack: isAnimal && target.species.diet !== "CARNIVORE",
        isAnimal,
        isCorpse: false,
        canFreshen: false,
        inspect: isAnimal
          ? `Це ${forms.nominative}.\n\n${formatCreatureStatusLine(target, visibleAction)}${weaponText ? `\n${weaponText}` : ""}${torchText ? `\n${torchText}` : ""}`
          : `${forms.nominative}\n\n${formatCreatureStatusLine(target, visibleAction)}${weaponText ? `\n${weaponText}` : ""}${torchText ? `\n${torchText}` : ""}`,
      };
    }

    const publicCreatureDetails = isAnimal
      ? [
        `Це ${forms.nominative}.`,
        "",
        formatCreatureStatusLine(target, visibleAction),
        formatCreatureLifeState(target),
        `Стать: ${formatSex(target.sex)}.`,
        `Вік: ${formatCreatureAge(target.age, target)}.`,
        weaponText,
        torchText,
      ].filter(Boolean).join("\n")
      : [
        forms.nominative,
        "",
        formatCreatureStatusLine(target, visibleAction),
        formatCreatureLifeState(target),
        weaponText,
        torchText,
        hunterSection,
      ].filter(Boolean).join("\n");

    if (!showTechnicalDetails) {
      return {
        kind: "creature",
        id: target.id,
        name: forms.nominative,
        forms,
        canGreet: !isAnimal,
        canAttack: isAnimal && target.species.diet !== "CARNIVORE",
        isAnimal,
        isCorpse: false,
        canFreshen: false,
        inspect: publicCreatureDetails,
      };
    }

    return {
      kind: "creature",
      id: target.id,
      name: forms.nominative,
      forms,
      canGreet: !isAnimal,
      canAttack: isAnimal && target.species.diet !== "CARNIVORE",
      isAnimal,
      isCorpse: false,
      canFreshen: false,
      inspect: isAnimal
        ? `Це ${forms.nominative}.\n\n${formatCreatureStatusLine(target, visibleAction)}\nЖиття: ${target.hp}/${target.maxHp ?? target.species.baseHp}\nСтать: ${formatSex(target.sex)}\nВік: ${target.age}\nТіків віку: ${target.ageTicks}${weaponText ? `\n${weaponText}` : ""}${torchText ? `\n${torchText}` : ""}\n\nСтатистика:\n${formatCreatureStats(target)}`
        : `${forms.nominative}\n\n${formatCreatureStatusLine(target, visibleAction)}\nЖиття: ${target.hp}/${target.maxHp ?? target.species.baseHp}${weaponText ? `\n${weaponText}` : ""}${torchText ? `\n${torchText}` : ""}${hunterSection}\n\nСтатистика:\n${formatCreatureStats(target)}`,
    };
  }

  return null;
}
