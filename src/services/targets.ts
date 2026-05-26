import { prisma } from "../db";
import { BASE_HP, BASE_STAMINA } from "../gameConfig";
import { formatObservedPostureText, formatObservedVitalsText, formatPlayerStats, formatVitalsLine } from "../utils/playerText";
import { creatureForms, playerForms, type NameForms } from "./grammar";
import { lifetimeSummary } from "./itemLifetime";
import { playerShowsTechnicalDetails } from "./technicalDetails";
import { getPlayerTorchState } from "./fire";

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

function genderedPlayerState(player: { grammaticalGender?: string | null }) {
  if (player.grammaticalGender === "FEMININE") return "жива/активна";
  if (player.grammaticalGender === "PLURAL") return "живі/активні";
  return "живий/активний";
}

function genderedUnarmed(player: { grammaticalGender?: string | null }) {
  if (player.grammaticalGender === "FEMININE") return "Виглядає беззбройною.";
  if (player.grammaticalGender === "PLURAL") return "Виглядають беззбройними.";
  return "Виглядає беззбройним.";
}

function handsText(torchState: { isLit: boolean; litAmount?: number }) {
  if (!torchState.isLit) return "У руках нічого не тримає.";
  const count = torchState.litAmount ?? 1;
  if (count > 1) return `У руках горять запалені факели (${count}).`;
  return "У руках горить запалений факел.";
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
      handsText(torchState),
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
    const canFreshen = isCorpse && corpseLeft > Math.floor(target.species.corpseDecayTicks / 2);
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
        inspect: `Це труп ${forms.genitive}.\n\nВін розкладається.\nСтан: ${corpseLifetime}.\n${canFreshen ? "\nТруп ще відносно свіжий. Його можна спробувати освіжувати." : "\nТруп уже надто далеко розклався для освіжування."}`,
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
