import { prisma } from "../db";
import { BASE_HP, BASE_STAMINA } from "../gameConfig";
import { formatObservedPostureText, formatObservedVitalsText, formatPlayerStats, formatVitalsLine } from "../utils/playerText";
import { visibleHeldTorchText } from "../utils/torchText";
import { creatureForms, playerForms, type NameForms } from "./grammar";
import { lifetimeSummary } from "./itemLifetime";
import { playerShowsTechnicalDetails } from "./technicalDetails";
import { getPlayerTorchState } from "./fire";
import { isFreshenedCorpse } from "./meat";

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

export async function resolveTarget(type: string, id: number, locationId: number, options: { viewerPlayerId?: number } = {}): Promise<ResolvedTarget | null> {
  const showTechnicalDetails = await playerShowsTechnicalDetails(options.viewerPlayerId);

  if (type === "player") {
    const target = await prisma.player.findFirst({ where: { id, currentLocationId: locationId } });
    if (!target) return null;
    const forms = playerForms(target);
    const torchState = await getPlayerTorchState(target.id);
    const visibleLines = [
      `Ви бачите ${forms.accusative}.`,
      "",
      formatObservedPostureText(target),
      `Стан: ${genderedPlayerState(target)}`,
      formatObservedVitalsText(target, { hpFallback: BASE_HP, staminaFallback: BASE_STAMINA }),
      genderedUnarmed(target),
      visibleHeldTorchText(torchState),
    ];
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
    const canFreshen = isCorpse && !wasFreshened && corpseLeft > Math.floor(target.species.corpseDecayTicks / 2);
    const corpseLifetime = lifetimeSummary(corpseLeft, target.species.corpseDecayTicks, { showTechnicalDetails });

    if (isCorpse) {
      return {
        kind: "creature",
        id: target.id,
        name: `труп: ${forms.genitive}`,
        forms: {
          nominative: `труп: ${forms.genitive}`,
          genitive: `трупа ${forms.genitive}`,
          dative: `трупу ${forms.genitive}`,
          accusative: `труп ${forms.genitive}`,
          instrumental: `трупом ${forms.genitive}`,
          locative: `трупі ${forms.genitive}`,
          vocative: `трупе ${forms.genitive}`,
        },
        canGreet: false,
        canAttack: false,
        isAnimal,
        isCorpse: true,
        canFreshen,
        inspect: `Це труп ${forms.genitive}.\n\nВін розкладається.\nСтан: ${corpseLifetime}.\n${canFreshen ? "\nТруп ще відносно свіжий. Його можна спробувати освіжувати." : wasFreshened ? "\nЗ цього трупа вже зняли придатне м'ясо." : "\nТруп уже надто далеко розклався для освіжування."}`,
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
        ? `Це ${forms.nominative}.\n\nСтан: ${target.isAlive ? "жива" : "мертва"}\nЖиття: ${target.hp}\nСтать: ${formatSex(target.sex)}\nВік: ${target.age}\nТіків віку: ${target.ageTicks}\nДія: ${target.currentAction ?? "невідомо"}\n\nСтатистика:\n${formatCreatureStats(target)}`
        : `${forms.nominative}\n\nСтан: ${target.isAlive ? "живий/активний" : "неактивний"}\nЖиття: ${target.hp}\nДія: ${target.currentAction ?? "невідомо"}\n\nСтатистика:\n${formatCreatureStats(target)}`,
    };
  }

  return null;
}
