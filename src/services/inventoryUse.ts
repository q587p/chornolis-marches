import { prisma } from "../db";
import { BASE_HP, BASE_STAMINA } from "../gameConfig";
import type { Prisma } from "@prisma/client";
import { ensureTorchResourceTypes, TORCH_DURATION_MS, TORCH_FADING_MS } from "./fire";
import { dropCarriedCorpseResource, isCorpseQuery, isCorpseResourceKey, resourceTypeDisplayName } from "./corpses";
import { COOKED_MEAT_KEY, RAW_MEAT_KEY, eatCookedMeat } from "./meat";
import { getPlayerEquippedWeapon, isWeaponResourceKey } from "./weapons";

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
  raw_meat: RAW_MEAT_KEY,
  "raw meat": RAW_MEAT_KEY,
  "сире м'ясо": RAW_MEAT_KEY,
  "сире м’ясо": RAW_MEAT_KEY,
  "сирого м'яса": RAW_MEAT_KEY,
  "сирого м’яса": RAW_MEAT_KEY,
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
  knife: "knife",
  knives: "knife",
  "простий ніж": "knife",
  "простого ножа": "knife",
  ніж: "knife",
  ножа: "knife",
  hunting_spear: "hunting_spear",
  "hunting spear": "hunting_spear",
  spear: "hunting_spear",
  "мисливський спис": "hunting_spear",
  "мисливського списа": "hunting_spear",
  спис: "hunting_spear",
  sickle: "sickle",
  серп: "sickle",
  серпа: "sickle",
  hand_axe: "hand_axe",
  "hand axe": "hand_axe",
  axe: "hand_axe",
  "мала сокира": "hand_axe",
  "малу сокиру": "hand_axe",
  сокира: "hand_axe",
  short_sword: "short_sword",
  "short sword": "short_sword",
  sword: "short_sword",
  "короткий меч": "short_sword",
  "короткого меча": "short_sword",
  меч: "short_sword",
  corpse: "corpse",
  corpses: "corpse",
  body: "corpse",
  bodies: "corpse",
  carcass: "corpse",
  carcasses: "corpse",
  "труп": "corpse",
  "трупи": "corpse",
  "туша": "corpse",
  "туші": "corpse",
  "рештки": "corpse",
  "труп миша": "corpse_mouse_male",
  "труп миші": "corpse_mouse_female",
  "труп зайця": "corpse_rabbit_male",
  "труп зайчихи": "corpse_rabbit_female",
  "труп лиса": "corpse_fox_male",
  "труп лисиці": "corpse_fox_female",
  "труп вовка": "corpse_wolf_male",
  "труп вовчиці": "corpse_wolf_female",
};

function normalizeResourceQuery(query: string) {
  return query.trim().toLocaleLowerCase("uk-UA").replace(/^#/, "").replace(/\s+/g, " ");
}

export function inventoryResourceKeyFromText(query: string) {
  const normalized = normalizeResourceQuery(query);
  return RESOURCE_ALIASES[normalized] ?? normalized;
}

function isHeldResourceKey(key: string) {
  return key === "lit_torch";
}

function inventoryResourceMatchesQuery(resourceKey: string, resourceName: string, query?: string | null) {
  if (!query) return true;
  if (isCorpseQuery(query)) return isCorpseResourceKey(resourceKey);

  const key = inventoryResourceKeyFromText(query);
  if (resourceKey === key) return true;

  const normalized = normalizeResourceQuery(query);
  const resourceNameNormalized = normalizeResourceQuery(resourceName);
  if (isCorpseResourceKey(resourceKey)) {
    const corpseQuery = normalized
      .replace(/^(?:corpse|corpses|body|bodies|carcass|carcasses|труп|трупи|туша|туші|рештки)\s*/u, "")
      .replace(/\s+(?:corpse|corpses|body|bodies|carcass|carcasses|труп|трупи|туша|туші|рештки)$/u, "")
      .trim();
    if (corpseQuery && (resourceKey.includes(corpseQuery) || resourceNameNormalized.includes(corpseQuery))) return true;
  }

  return resourceKey === normalized || resourceNameNormalized === normalized;
}

async function consumeOneResource(tx: Prisma.TransactionClient, playerResourceId: number, amount: number) {
  if (amount > 1) {
    await tx.playerResource.update({ where: { id: playerResourceId }, data: { amount: { decrement: 1 } } });
    return;
  }

  await tx.playerResource.delete({ where: { id: playerResourceId } });
}

async function addGroundResource(
  tx: Prisma.TransactionClient,
  locationId: number,
  resourceType: { id: number },
  amount: number,
  extraData: { updatedAt?: Date } = {},
) {
  if (amount <= 0) return;
  await tx.resourceNode.upsert({
    where: { locationId_resourceTypeId: { locationId, resourceTypeId: resourceType.id } },
    update: { amount: { increment: amount }, ...extraData },
    create: { locationId, resourceTypeId: resourceType.id, amount, maxAmount: amount, ...extraData },
  });
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
      ? "Ви з'їли лікарські трави. Стан помітно кращає."
      : "Ви з'їли лікарські трави. Біль трохи відступає.";
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
  const equippedWeapon = isWeaponResourceKey(carried.resourceType.key) ? await getPlayerEquippedWeapon(playerId) : null;
  const weaponDetails = isWeaponResourceKey(carried.resourceType.key)
    ? equippedWeapon?.key === carried.resourceType.key
      ? "\n\nВи тримаєте це в руці."
      : "\n\nЦе можна взяти в руку."
    : "";
  const torchDetails =
    carried.resourceType.key === "lit_torch"
      ? `\nГорітиме ще ${approximateDuration(carried.updatedAt.getTime() + TORCH_DURATION_MS - Date.now())}${carried.updatedAt.getTime() + TORCH_DURATION_MS - Date.now() <= TORCH_FADING_MS ? "; скоро погасне" : ""}.`
      : carried.resourceType.key === "doused_torch"
        ? "\nПолум'я притушене. Якщо знову підпалити цей факел, він продовжить горіти з того місця, де його загасили."
      : "";

  return `🎒 ${name}${amount}${description}${weaponDetails}${torchDetails}`;
}

export async function dropInventoryResourceDetailed(playerId: number, resourceQuery: string) {
  const key = inventoryResourceKeyFromText(resourceQuery);
  await ensureTorchResourceTypes();
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");

  return prisma.$transaction(async (tx) => {
    const carried = await tx.playerResource.findFirst({
      where: {
        playerId,
        resourceType: key === "corpse" || isCorpseQuery(resourceQuery)
          ? { key: { startsWith: "corpse_" } }
          : { key },
      },
      include: { resourceType: true },
      orderBy: { id: "asc" },
    });
    if (!carried || carried.amount <= 0) throw new Error("У ваших речах цього немає.");

    const droppedResourceType = carried.resourceType;
    if (isCorpseResourceKey(droppedResourceType.key)) {
      const droppedCorpse = await dropCarriedCorpseResource(tx, playerId, player.currentLocationId!, droppedResourceType);
      if (!droppedCorpse) await addGroundResource(tx, player.currentLocationId!, droppedResourceType, 1);
      await consumeOneResource(tx, carried.id, carried.amount);
      const name = droppedCorpse?.name ?? resourceTypeDisplayName(droppedResourceType);
      return {
        text: `Ви поклали ${name} на землю.`,
        locationId: player.currentLocationId!,
        droppedName: name,
        carriedName: name,
        resourceKey: droppedResourceType.key,
      };
    }

    await consumeOneResource(tx, carried.id, carried.amount);
    if (isWeaponResourceKey(droppedResourceType.key)) {
      await tx.player.updateMany({ where: { id: playerId, equippedWeaponKey: droppedResourceType.key }, data: { equippedWeaponKey: null } });
    }

    const litTorchData = carried.resourceType.key === "lit_torch" ? { updatedAt: carried.updatedAt } : {};
    await addGroundResource(tx, player.currentLocationId!, droppedResourceType, 1, litTorchData);

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

export async function dropInventoryResourcesDetailed(playerId: number, resourceQuery?: string | null) {
  await ensureTorchResourceTypes();
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");

  return prisma.$transaction(async (tx) => {
    const carried = await tx.playerResource.findMany({
      where: { playerId, amount: { gt: 0 } },
      include: { resourceType: true },
      orderBy: { id: "asc" },
    });

    const matched = carried.filter((resource) => {
      if (!resourceQuery && isHeldResourceKey(resource.resourceType.key)) return false;
      return inventoryResourceMatchesQuery(resource.resourceType.key, resourceTypeDisplayName(resource.resourceType), resourceQuery);
    });
    if (!matched.length) {
      throw new Error(resourceQuery
        ? "У ваших речах немає такого, що можна викинути."
        : "У ваших речах немає нічого зайвого для /drop all; те, що в руках, лишається при вас.");
    }

    const dropped: Array<{ key: string; name: string; amount: number }> = [];
    for (const resource of matched) {
      const amount = Math.max(0, resource.amount);
      if (amount <= 0) continue;

      if (isCorpseResourceKey(resource.resourceType.key)) {
        let droppedAmount = 0;
        for (let i = 0; i < amount; i += 1) {
          const droppedCorpse = await dropCarriedCorpseResource(tx, playerId, player.currentLocationId!, resource.resourceType);
          if (!droppedCorpse) break;
          droppedAmount += 1;
        }
        const fallbackAmount = amount - droppedAmount;
        await addGroundResource(tx, player.currentLocationId!, resource.resourceType, fallbackAmount);
        if (amount >= resource.amount) await tx.playerResource.delete({ where: { id: resource.id } });
        else await tx.playerResource.update({ where: { id: resource.id }, data: { amount: { decrement: amount } } });
        dropped.push({ key: resource.resourceType.key, name: resourceTypeDisplayName(resource.resourceType), amount });
        continue;
      }

      await tx.playerResource.delete({ where: { id: resource.id } });
      if (isWeaponResourceKey(resource.resourceType.key)) {
        await tx.player.updateMany({ where: { id: playerId, equippedWeaponKey: resource.resourceType.key }, data: { equippedWeaponKey: null } });
      }
      const litTorchData = resource.resourceType.key === "lit_torch" ? { updatedAt: resource.updatedAt } : {};
      await addGroundResource(tx, player.currentLocationId!, resource.resourceType, amount, litTorchData);
      dropped.push({ key: resource.resourceType.key, name: resourceTypeDisplayName(resource.resourceType), amount });
    }

    if (!dropped.length) throw new Error("У ваших речах цього вже немає.");
    const names = dropped.map((item) => `${item.name}${item.amount > 1 ? ` ×${item.amount}` : ""}`).join(", ");
    return {
      text: `Ви виклали на землю: ${names}.`,
      locationId: player.currentLocationId!,
      items: dropped,
      droppedName: names,
      resourceKey: dropped.map((item) => `${item.key}:${item.amount}`).join(","),
    };
  });
}

export async function dropInventoryResource(playerId: number, resourceQuery: string) {
  return (await dropInventoryResourceDetailed(playerId, resourceQuery)).text;
}
