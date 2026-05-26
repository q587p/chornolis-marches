import { prisma } from "../db";
import { BASE_HP } from "../gameConfig";
import { formatPlayerStats } from "../utils/playerText";
import { creatureForms, playerForms, type NameForms } from "./grammar";

export type ResolvedTarget = {
  kind: "player" | "creature";
  id: number;
  name: string;
  canGreet: boolean;
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

export async function resolveTarget(type: string, id: number, locationId: number): Promise<ResolvedTarget | null> {
  if (type === "player") {
    const target = await prisma.player.findFirst({ where: { id, currentLocationId: locationId } });
    if (!target) return null;
    const forms = playerForms(target);
    return {
      kind: "player",
      id: target.id,
      name: forms.nominative,
      forms,
      canGreet: true,
      isAnimal: false,
      isCorpse: false,
      canFreshen: false,
      inspect: `Ви бачите ${forms.accusative}.\n\nЖиття: ${target.hp}/${target.hpMax ?? BASE_HP}\nСнага: ${target.stamina}\nГолод: ${target.hunger}\n\nСтатистика:\n${formatPlayerStats(target)}`,
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
        isAnimal,
        isCorpse: true,
        canFreshen,
        inspect: `Це труп ${forms.genitive}.\n\nВін розкладається.\nДо зникнення лишилось приблизно: ${corpseLeft} тіків.\n${canFreshen ? "\nТруп ще відносно свіжий. Його можна спробувати освіжувати." : "\nТруп уже надто далеко розклався для освіжування."}`,
      };
    }

    return {
      kind: "creature",
      id: target.id,
      name: forms.nominative,
      forms,
      canGreet: !isAnimal,
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
