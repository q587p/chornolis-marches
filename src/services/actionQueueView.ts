import { FatigueState } from "@prisma/client";
import { prisma } from "../db";
import {
  BASE_HP,
  BASE_STAMINA,
  HEALTH_REGEN_PER_INTERVAL,
  LOW_HP_WARNING,
  REST_HEALTH_REGEN_INTERVAL_MS,
  REST_STAMINA_REGEN_INTERVAL_MS,
  REST_STAMINA_REGEN_PER_INTERVAL,
  VERY_TIRED_STAMINA,
} from "../gameConfig";
import { actionTitle } from "./actionRules";
import { getPlayerRestStaminaCap, getPlayerRestStaminaRegenMultiplier } from "./locationFeatures";
import { playerCanShowTechnicalDetails } from "./technicalDetails";
import { actionProgressSuffix } from "../utils/durationText";

function msToSeconds(ms: number) {
  return Math.max(1, Math.ceil(ms / 1000));
}

function msToMinutes(ms: number) {
  return Math.max(1, Math.ceil(ms / 60_000));
}

function recoveryMinutes(remaining: number, perInterval: number, intervalMs: number) {
  if (remaining <= 0) return 0;
  return msToMinutes(Math.ceil(remaining / Math.max(1, perInterval)) * intervalMs);
}

function fatigueStateFor(stamina: number, staminaMax = BASE_STAMINA): FatigueState {
  if (stamina <= VERY_TIRED_STAMINA) return "VERY_TIRED";
  if (stamina < 0) return "TIRED";
  if (stamina >= staminaMax) return "RESTED";
  return "RESTED";
}

function fatigueLabel(state: FatigueState, isResting = false) {
  if (isResting) return "Відпочиває";
  if (state === "VERY_TIRED") return "Дуже втомлений";
  if (state === "TIRED") return "Втомлений";
  return "Відпочивший";
}

function orderedPosition(index: number) {
  return index + 1;
}

export async function playerRestStatusText(playerId: number) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return "Персонажа не знайдено.";

  const max = await getPlayerRestStaminaCap(playerId);
  const hpMax = player.hpMax ?? BASE_HP;
  const staminaRemaining = Math.max(0, max - player.stamina);
  const hpRemaining = Math.max(0, hpMax - player.hp);
  const state = fatigueLabel(fatigueStateFor(player.stamina, max), player.isResting);
  const restStaminaRate = REST_STAMINA_REGEN_PER_INTERVAL * await getPlayerRestStaminaRegenMultiplier(playerId);

  if (staminaRemaining <= 0 && hpRemaining <= 0) {
    return `Ви вже відпочивші й готові до дій. Життя: ${player.hp}/${hpMax}. Снага: ${player.stamina}/${max}.`;
  }

  const lines = [
    "Ви відпочиваєте.",
    `Стан: ${state}.`,
    `Життя: ${player.hp}/${hpMax}.`,
    `Снага: ${player.stamina}/${max}${staminaRemaining <= 0 ? " — повністю відновлена" : ""}.`,
  ];

  if (player.hp <= 0) {
    lines.push(`До притомности: приблизно ${msToMinutes(REST_HEALTH_REGEN_INTERVAL_MS)} хв.`);
  }

  if (staminaRemaining > 0) {
    const staminaMinutes = recoveryMinutes(staminaRemaining, restStaminaRate, REST_STAMINA_REGEN_INTERVAL_MS);
    lines.push(`До повної снаги: приблизно ${staminaMinutes} хв.`);
  }

  if (hpRemaining > 0) {
    const hpMinutes = Math.ceil(hpRemaining / HEALTH_REGEN_PER_INTERVAL) * msToMinutes(REST_HEALTH_REGEN_INTERVAL_MS);
    lines.push(`До повного здоров’я: приблизно ${hpMinutes} хв.`);
  }

  if (player.hp > 0 && player.hp <= LOW_HP_WARNING) {
    lines.push("Ви вже можете діяти, але дуже слабі. Вам би ще відновитися.");
  }

  return lines.join("\n");
}

export async function renderPlayerActionQueue(playerId: number) {
  const actions = await prisma.worldAction.findMany({
    where: { actorType: "PLAYER", playerId, status: { in: ["QUEUED", "RUNNING"] } },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!actions.length && !player?.isResting) return "Черга дій порожня.";

  const now = Date.now();
  const lines: string[] = [];
  if (player?.isResting) lines.push("▶️ Відпочиваєте");

  lines.push(...actions.map((action, index) => {
    const queueIndex = player?.isResting ? index + 1 : index;
    if (action.status === "RUNNING") {
      const leftMs = action.executeAt ? Math.max(0, action.executeAt.getTime() - now) : action.durationMs;
      return `▶️ ${actionTitle(action)} — виконується${actionProgressSuffix(playerCanShowTechnicalDetails(player), leftMs)}`;
    }

    const prefix = queueIndex === 0 ? "⏳" : `⏳ ${orderedPosition(queueIndex)}.`;
    return `${prefix} Потім ${actionTitle(action)}`;
  }));

  return `План дій:\n${lines.join("\n")}`;
}
