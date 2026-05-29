import { prisma } from "../db";
import { BASE_HP, BASE_STAMINA } from "../gameConfig";
import type { Prisma } from "@prisma/client";
import { ensureTorchResourceTypes, TORCH_DURATION_MS, TORCH_FADING_MS } from "./fire";
import { resourceTypeDisplayName } from "./corpses";
import { COOKED_MEAT_KEY, eatCookedMeat } from "./meat";

export type UsableInventoryResource = "berries" | "herbs" | "mushrooms" | "cooked_meat";

const USE_CONFIG = {
  berries: { stamina: 4, hunger: 1 },
  herbs: { amount: 2 },
  mushrooms: { amount: 3 },
} as const;

const RESOURCE_ALIASES: Record<string, string> = {
  berries: "berries",
  berry: "berries",
  ягоди: "berries",
  ягоду: "berries",
  ягід: "berries",
  herbs: "herbs",
  herb: "herbs",
  трави: "herbs",
  траву: "herbs",
  "лікарські трави": "herbs",
  "лікарських трав": "herbs",
  mushrooms: "mushrooms",
  mushroom: "mushrooms",
  гриби: "mushrooms",
  гриб: "mushrooms",
  cooked_meat: COOKED_MEAT_KEY,
  "cooked meat": COOKED_MEAT_KEY,
  meat: COOKED_MEAT_KEY,
  "смажене м'ясо": COOKED_MEAT_KEY,
  "смажене м’ясо": COOKED_MEAT_KEY,
  "смаженого м'яса": COOKED_MEAT_KEY,
  "м'ясо": COOKED_MEAT_KEY,
  "м’ясо": COOKED_MEAT_KEY,
  torch: "torch",
  torches: "torch",
  факел: "torch",
  факели: "torch",
  факела: "torch",
  "сухий факел": "torch",
  lit_torch: "lit_torch",
  "lit torch": "lit_torch",
  "запалений факел": "lit_torch",
  "запалені факели": "lit_torch",
  doused_torch: "doused_torch",
  "doused torch": "doused_torch",
  "притушений факел": "doused_torch",
  "притушені факели": "doused_torch",
  twigs: "twigs",
  хмиз: "twigs",
};

function normalizeResourceQuery(query: string) {
  return query.trim().toLocaleLowerCase("uk-UA").replace(/^#/, "").replace(/\s+/g, " ");
}

export function inventoryResourceKeyFromText(query: string) {
  const normalized = normalizeResourceQuery(query);
  return RESOURCE_ALIASES[normalized] ?? normalized;
}

async function consumeOneResource(tx: Prisma.TransactionClient, playerResourceId: number, amount: number) {
  if (amount > 1) {
    await tx.playerResource.update({ where: { id: playerResourceId }, data: { amount: { decrement: 1 } } });
    return;
  }

  await tx.playerResource.delete({ where: { id: playerResourceId } });
}

export async function useInventoryResource(playerId: number, resourceKey: UsableInventoryResource) {
  if (resourceKey === COOKED_MEAT_KEY) return eatCookedMeat(playerId);

  return prisma.$transaction(async (tx) => {
    const [player, resourceType] = await Promise.all([
      tx.player.findUnique({ where: { id: playerId }, select: { id: true, hp: true, hpMax: true, hunger: true, stamina: true, staminaMax: true } }),
      tx.resourceType.findUnique({ where: { key: resourceKey } }),
    ]);

    if (!player) throw new Error("Ти ще не увійшов у світ. Напиши /start");
    if (!resourceType) throw new Error("У ваших речах немає такого запасу.");

    const carried = await tx.playerResource.findUnique({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: resourceType.id } },
    });

    if (!carried || carried.amount <= 0) {
      const missing = resourceKey === "berries" ? "ягід" : resourceKey === "mushrooms" ? "грибів" : "лікарських трав";
      throw new Error(`У ваших речах немає ${missing}.`);
    }

    if (resourceKey === "berries") {
      const staminaMax = player.staminaMax ?? BASE_STAMINA;
      if (player.stamina >= staminaMax && player.hunger <= 0) throw new Error("Снаги й так досить, і голод не дошкуляє. Ягоди краще лишити на потім.");

      const nextStamina = Math.min(staminaMax, player.stamina + USE_CONFIG.berries.stamina);
      const nextHunger = Math.max(0, player.hunger - USE_CONFIG.berries.hunger);
      await consumeOneResource(tx, carried.id, carried.amount);
      await tx.player.update({ where: { id: playerId }, data: { stamina: nextStamina, hunger: nextHunger } });

      const staminaChanged = nextStamina > player.stamina;
      const hungerChanged = nextHunger < player.hunger;
      if (staminaChanged && hungerChanged) return "Ви з'їли жменю ягід. Снаги трохи побільшало, а голод ледь відступив.";
      if (hungerChanged) return "Ви з'їли жменю ягід. Голод ледь відступив.";
      return nextStamina >= staminaMax
        ? "Ви з'їли жменю ягід. Снага повернулась."
        : "Ви з'їли жменю ягід. Снаги трохи побільшало.";
    }

    if (resourceKey === "mushrooms") {
      if (player.hunger <= 0) throw new Error("Ви не голодні. Гриби краще лишити на потім.");

      const nextHunger = Math.max(0, player.hunger - USE_CONFIG.mushrooms.amount);
      await consumeOneResource(tx, carried.id, carried.amount);
      await tx.player.update({ where: { id: playerId }, data: { hunger: nextHunger } });

      return nextHunger <= 0
        ? "Ви з'їли кілька грибів. Голод відступив."
        : "Ви з'їли кілька грибів. Голод трохи відступає.";
    }

    const hpMax = player.hpMax ?? BASE_HP;
    if (player.hp >= hpMax) throw new Error("Ви не поранені настільки, щоб витрачати лікарські трави.");

    const nextHp = Math.min(hpMax, player.hp + USE_CONFIG.herbs.amount);
    await consumeOneResource(tx, carried.id, carried.amount);
    await tx.player.update({ where: { id: playerId }, data: { hp: nextHp } });

    return nextHp >= hpMax
      ? "Ви використали лікарські трави. Стан помітно кращає."
      : "Ви використали лікарські трави. Біль трохи відступає.";
  });
}

function approximateDuration(ms: number) {
  const safeMs = Math.max(0, ms);
  const minutesLeft = Math.ceil(safeMs / 60_000);
  if (minutesLeft <= 0) return "менш ніж хвилину";
  if (minutesLeft === 1) return "приблизно 1 хвилину";
  if (minutesLeft >= 5) return `приблизно ${minutesLeft} хвилин`;
  return `приблизно ${minutesLeft} хвилини`;
}

export async function inspectInventoryResource(playerId: number, resourceQuery: string) {
  const key = inventoryResourceKeyFromText(resourceQuery);
  const carried = await prisma.playerResource.findFirst({
    where: { playerId, resourceType: { key } },
    include: { resourceType: true },
  });

  if (!carried || carried.amount <= 0) throw new Error("У ваших речах цього немає.");

  const name = resourceTypeDisplayName(carried.resourceType);
  const amount = carried.amount > 1 ? `\nКількість: ${carried.amount}` : "";
  const description = carried.resourceType.description ? `\n\n${carried.resourceType.description}` : "";
  const torchDetails =
    carried.resourceType.key === "lit_torch"
      ? `\nГорітиме ще ${approximateDuration(carried.updatedAt.getTime() + TORCH_DURATION_MS - Date.now())}${carried.updatedAt.getTime() + TORCH_DURATION_MS - Date.now() <= TORCH_FADING_MS ? "; скоро погасне" : ""}.`
      : carried.resourceType.key === "doused_torch"
        ? "\nПолум'я притушене. Якщо знову підпалити цей факел, він продовжить горіти з того місця, де його загасили."
      : "";

  return `🎒 ${name}${amount}${description}${torchDetails}`;
}

export async function dropInventoryResourceDetailed(playerId: number, resourceQuery: string) {
  const key = inventoryResourceKeyFromText(resourceQuery);
  await ensureTorchResourceTypes();
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");

  return prisma.$transaction(async (tx) => {
    const carried = await tx.playerResource.findFirst({
      where: { playerId, resourceType: { key } },
      include: { resourceType: true },
    });
    if (!carried || carried.amount <= 0) throw new Error("У ваших речах цього немає.");

    await consumeOneResource(tx, carried.id, carried.amount);

    const droppedResourceType = carried.resourceType;
    const litTorchData = carried.resourceType.key === "lit_torch" ? { updatedAt: carried.updatedAt } : {};
    await tx.resourceNode.upsert({
      where: { locationId_resourceTypeId: { locationId: player.currentLocationId!, resourceTypeId: droppedResourceType.id } },
      update: { amount: { increment: 1 }, ...litTorchData },
      create: { locationId: player.currentLocationId!, resourceTypeId: droppedResourceType.id, amount: 1, maxAmount: 1, ...litTorchData },
    });

    if (carried.resourceType.key === "lit_torch") {
      const remainingMs = Math.max(0, carried.updatedAt.getTime() + TORCH_DURATION_MS - Date.now());
      return {
        text: `Ви викинули запалений факел. Він ще горить на землі${remainingMs > 0 ? `, приблизно ${approximateDuration(remainingMs)}` : ""}.`,
        locationId: player.currentLocationId!,
        droppedName: resourceTypeDisplayName(carried.resourceType),
        carriedName: resourceTypeDisplayName(carried.resourceType),
        resourceKey: droppedResourceType.key,
      };
    }

    const name = resourceTypeDisplayName(carried.resourceType);
    return {
      text: `Ви викинули ${name}.`,
      locationId: player.currentLocationId!,
      droppedName: name,
      carriedName: name,
      resourceKey: droppedResourceType.key,
    };
  });
}

export async function dropInventoryResource(playerId: number, resourceQuery: string) {
  return (await dropInventoryResourceDetailed(playerId, resourceQuery)).text;
}
