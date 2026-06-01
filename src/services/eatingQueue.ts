import type { Bot } from "grammy";
import type { WorldAction } from "@prisma/client";
import { prisma } from "../db";
import { BASE_HP, BASE_STAMINA } from "../gameConfig";
import { actionDurationMs, performOrQueuePlayerAction } from "./actionQueue";
import { assertCanPerformPhysicalAction } from "./postureRules";
import type { UsableInventoryResource } from "./inventoryUse";
import { COOKED_MEAT_KEY } from "./meat";

type EatAllPlayer = {
  id: number;
  hp?: number | null;
  hpMax?: number | null;
  stamina: number;
  staminaMax?: number | null;
  hunger?: number | null;
  posture?: string | null;
  sleepState?: string | null;
  isResting?: boolean | null;
};

type UseVitals = {
  hp: number;
  hpMax?: number | null;
  stamina: number;
  staminaMax?: number | null;
  hunger: number;
};

const USE_EFFECTS = {
  berries: { stamina: 4, hunger: 1 },
  herbs: { hp: 2 },
  mushrooms: { hunger: 3 },
  [COOKED_MEAT_KEY]: { hunger: 5 },
} as const satisfies Record<UsableInventoryResource, Record<string, number>>;

function actionPayloadResourceKey(action: Pick<WorldAction, "payload">) {
  const payload = action.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const resourceKey = (payload as { resourceKey?: unknown }).resourceKey;
  return typeof resourceKey === "string" ? resourceKey : null;
}

function divideCeil(value: number, step: number) {
  return Math.ceil(Math.max(0, value) / Math.max(1, step));
}

export function usefulUseItemCountForVitals(resourceKey: UsableInventoryResource, vitals: UseVitals) {
  if (resourceKey === "berries") {
    const staminaMax = vitals.staminaMax ?? BASE_STAMINA;
    const staminaUses = divideCeil(staminaMax - vitals.stamina, USE_EFFECTS.berries.stamina);
    const hungerUses = divideCeil(vitals.hunger, USE_EFFECTS.berries.hunger);
    return Math.max(staminaUses, hungerUses);
  }

  if (resourceKey === "mushrooms") return divideCeil(vitals.hunger, USE_EFFECTS.mushrooms.hunger);
  if (resourceKey === COOKED_MEAT_KEY) return divideCeil(vitals.hunger, USE_EFFECTS[COOKED_MEAT_KEY].hunger);

  const hpMax = vitals.hpMax ?? BASE_HP;
  return divideCeil(hpMax - vitals.hp, USE_EFFECTS.herbs.hp);
}

async function playerVitals(playerId: number) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, hp: true, hpMax: true, stamina: true, staminaMax: true, hunger: true },
  });
  if (!player) throw new Error("Ти ще не увійшов у світ. Напиши /start");
  return player;
}

export async function playerInventoryResourceAmount(playerId: number, resourceKey: UsableInventoryResource) {
  const carried = await prisma.playerResource.findFirst({
    where: { playerId, resourceType: { key: resourceKey } },
    select: { amount: true },
  });
  return Math.max(0, carried?.amount ?? 0);
}

async function activeUseItemActions(playerId: number, resourceKey: UsableInventoryResource, statuses: Array<"QUEUED" | "RUNNING"> = ["QUEUED", "RUNNING"]) {
  const actions = await prisma.worldAction.findMany({
    where: {
      actorType: "PLAYER",
      playerId,
      type: "USE_ITEM",
      status: { in: statuses },
    },
    select: { id: true, payload: true },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });

  return actions.filter((action) => actionPayloadResourceKey(action) === resourceKey);
}

function saturatedText(resourceKey: UsableInventoryResource) {
  if (resourceKey === "berries") return "Снаги й так досить, і голод не дошкуляє. Ягоди краще лишити на потім.";
  if (resourceKey === "mushrooms") return "Ви не голодні. Гриби краще лишити на потім.";
  if (resourceKey === "herbs") return "Ви не поранені настільки, щоб витрачати лікарські трави.";
  return "Ви не голодні. Смажене м’ясо краще лишити на потім.";
}

export async function trimSatisfiedQueuedUseItems(playerId: number, resourceKey: UsableInventoryResource) {
  const vitals = await playerVitals(playerId);
  if (usefulUseItemCountForVitals(resourceKey, vitals) > 0) return 0;

  const queued = await activeUseItemActions(playerId, resourceKey, ["QUEUED"]);
  if (!queued.length) return 0;

  const result = await prisma.worldAction.updateMany({
    where: { id: { in: queued.map((action) => action.id) }, status: "QUEUED" },
    data: { status: "CANCELLED", note: "однотипну дію прибрано: показники вже насичені" },
  });
  return result.count;
}

export async function queueAllUsableInventoryResource(bot: Bot, player: EatAllPlayer, resourceKey: UsableInventoryResource, chatId?: number | string) {
  assertCanPerformPhysicalAction(player, "USE_ITEM");

  const [vitals, amount, activeSame] = await Promise.all([
    playerVitals(player.id),
    playerInventoryResourceAmount(player.id, resourceKey),
    activeUseItemActions(player.id, resourceKey),
  ]);

  if (amount <= 0) throw new Error("У ваших речах немає такого запасу.");

  const usefulCount = usefulUseItemCountForVitals(resourceKey, vitals);
  if (usefulCount <= 0) throw new Error(saturatedText(resourceKey));

  const alreadyPlanned = activeSame.length;
  const remainingUseful = Math.max(0, usefulCount - alreadyPlanned);
  const remainingAvailable = Math.max(0, amount - alreadyPlanned);
  const count = Math.min(remainingUseful, remainingAvailable);
  if (count <= 0) throw new Error("У черзі вже досить таких дій на поточний стан.");

  const durationMs = actionDurationMs("USE_ITEM", player.stamina);
  for (let i = 0; i < count; i += 1) {
    await performOrQueuePlayerAction(bot, {
      playerId: player.id,
      type: "USE_ITEM",
      payload: { resourceKey },
      durationMs,
      chatId,
    });
  }

  return { count, durationMs, resourceKey };
}

export function eatAllButtonLabel(resourceKey: UsableInventoryResource) {
  if (resourceKey === COOKED_MEAT_KEY) return "🥩 З’їсти все";
  if (resourceKey === "berries") return "🫐 З’їсти всі";
  if (resourceKey === "mushrooms") return "🍄 З’їсти всі";
  return "🌿 З’їсти всі";
}
