import { Bot } from "grammy";
import { Direction, WorldAction } from "@prisma/client";
import { prisma } from "../db";
import {
  BASE_HP,
  BASE_STAMINA,
  HEALTH_REGEN_PER_INTERVAL,
  REST_HEALTH_REGEN_INTERVAL_MS,
  REST_STAMINA_REGEN_PER_INTERVAL,
  STAMINA_REGEN_INTERVAL_MS,
  TRACK_TTL_MS,
  gatherConfig,
} from "../gameConfig";
import { directionLabels } from "../ui/labels";
import { buildTargetListKeyboard, buildTrackKeyboard } from "../ui/keyboards";
import { renderLocationBrief, renderLocationDetails } from "./locations";
import { notifyLocation } from "./notifications";
import { getPlayerRestStaminaCap } from "./locationFeatures";
import { getStartLocationId } from "./players";
import { summonLisovykIfResourceDepleted } from "./resources";
import { logEvent } from "./worldEvents";
import { resolveTarget, type ResolvedTarget } from "./targets";
import { actionCost, actionTitle } from "./actionRules";
import { fatigueStateFor, spendCreatureStamina, spendPlayerStamina } from "./actionRecovery";
import { actorWhere, interruptActorActions, type ActorRef } from "./actionLifecycle";

type MovePayload = { direction: Direction; reason?: string };
type GatherPayload = { resourceKey?: "berries" | "mushrooms" | "herbs" };
type SayPayload = { text: string };
type SocialPayload = { targetType: "player" | "creature"; targetId: number; mode?: "known" | "mystery" };

const FROM_DIRECTION_LABELS: Record<string, string> = {
  NORTH: "з півдня",
  EAST: "із заходу",
  SOUTH: "з півночі",
  WEST: "зі сходу",
  UP: "знизу",
  DOWN: "згори",
  INSIDE: "ззовні",
  OUTSIDE: "зсередини",
};

const GREETINGS = [
  "Вітаю тебе в тіні Чорнолісу.",
  "Хай стежка буде м’якою під ногами.",
  "Доброго здоров’я, подорожній.",
  "Ліс бачить нас обох.",
  "Мир тобі, поки мир тримається.",
  "Нехай коріння не плутає твої кроки.",
  "Слава добрій зустрічі.",
  "Хай вітер несе добрі вісті.",
  "Не бійся тіні, якщо вона твоя.",
  "Радий бачити живу душу тут.",
  "Вітаю, поки ніч не стала густішою.",
  "Хай Чорноліс сьогодні мовчить до тебе лагідно.",
];

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function chatIdFromAction(action: WorldAction) {
  if (!action.chatId) return undefined;
  const numeric = Number(action.chatId);
  return Number.isSafeInteger(numeric) ? numeric : action.chatId;
}

function msToSeconds(ms: number) {
  return Math.max(1, Math.ceil(ms / 1000));
}

function payloadOf<T>(action: WorldAction): T {
  return (action.payload ?? {}) as unknown as T;
}

async function setActionStatus(action: WorldAction, status: "DONE" | "FAILED") {
  await prisma.worldAction.updateMany({ where: { id: action.id }, data: { status } });
}

function targetIntro(target: ResolvedTarget, isMystery: boolean) {
  if (!isMystery) return `👁 Ви роздивляєтесь ${target.forms.accusative}.`;
  if (target.kind === "creature" && target.isCorpse) return "👁 Ви роздивляєтесь те, що лежить нерухомо.";
  if (target.kind === "creature" && target.isAnimal) return "👁 Ви роздивляєтесь цю істоту.";
  return "👁 Ви роздивляєтесь цю постать.";
}

export async function completeAction(bot: Bot, action: WorldAction) {
  const latest = await prisma.worldAction.findUnique({ where: { id: action.id } });
  if (!latest || latest.status !== "RUNNING") return;
  if (action.type === "MOVE") return completeMove(bot, action);
  if (action.type === "GATHER" || action.type === "GATHER_SPECIFIC") return completeGather(bot, action);
  if (action.type === "EAT") return completeEat(action);
  if (action.type === "LOOK") return completeLook(bot, action);
  if (action.type === "INSPECT") return completeInspect(bot, action);
  if (action.type === "GREET") return completeGreet(bot, action);
  if (action.type === "ATTACK") return completeAttack(bot, action);
  if (action.type === "FRESHEN") return completeFreshen(bot, action);
  if (action.type === "SAY") return completeSay(bot, action);
  if (action.type === "TRACK") return completeTrack(bot, action);
  if (action.type === "REST" || action.type === "WAIT" || action.type === "SET_TRAP") return completeSimple(action);
  await setActionStatus(action, "FAILED");
}

async function createTrack(actor: ActorRef, fromLocationId: number, toLocationId: number, direction: Direction, label: string) {
  if (fromLocationId === toLocationId) return;
  await prisma.worldTrack.create({
    data: {
      ...actorWhere(actor),
      fromLocationId,
      toLocationId,
      direction,
      label,
      strength: 3,
      expiresAt: new Date(Date.now() + TRACK_TTL_MS),
    },
  });
}

async function completeMove(bot: Bot, action: WorldAction) {
  const payload = payloadOf<MovePayload>(action);

  if (action.actorType === "PLAYER") {
    const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
    const chatId = chatIdFromAction(action);
    if (!player) return void (await setActionStatus(action, "FAILED"));

    const currentLocationId = player.currentLocationId ?? (await getStartLocationId());
    const exit = await prisma.locationExit.findUnique({ where: { fromLocationId_direction: { fromLocationId: currentLocationId, direction: payload.direction } } });
    if (!exit || exit.isHidden) {
      await setActionStatus(action, "FAILED");
      if (chatId) await bot.api.sendMessage(chatId, "Шлях, яким ви збиралися йти, більше не видно.");
      await logEvent("ERROR", "Queued player move failed", payload.direction, currentLocationId);
      return;
    }

    await notifyLocation(bot, currentLocationId, player.id, "Хтось пішов звідси.", buildTrackKeyboard());
    await createTrack({ actorType: "PLAYER", playerId: player.id }, currentLocationId, exit.toLocationId, payload.direction, "людський слід");
    await spendPlayerStamina(bot, player.id, "MOVE", chatId);
    await prisma.player.updateMany({ where: { id: player.id }, data: { currentLocationId: exit.toLocationId, steps: { increment: 1 } } });
    await notifyLocation(bot, exit.toLocationId, player.id, `Хтось зайшов сюди ${FROM_DIRECTION_LABELS[payload.direction] ?? "звідкись"}.`, buildTargetListKeyboard([{ type: "player", id: player.id, label: "Хтось", canGreet: true }]));
    await setActionStatus(action, "DONE");
    await logEvent("MOVE", "Player queued move completed", payload.direction, exit.toLocationId);

    if (chatId) {
      const view = await renderLocationBrief(exit.toLocationId, player.id);
      await bot.api.sendMessage(chatId, `Ви дійшли: ${directionLabels[payload.direction]}`);
      await bot.api.sendMessage(chatId, view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
    }
    return;
  }

  const creature = action.creatureId ? await prisma.creature.findUnique({ where: { id: action.creatureId }, include: { species: true } }) : null;
  if (!creature || !creature.isAlive || creature.isGone) return void (await setActionStatus(action, "FAILED"));

  const exit = await prisma.locationExit.findUnique({ where: { fromLocationId_direction: { fromLocationId: creature.locationId, direction: payload.direction } } });
  if (!exit || exit.isHidden) return void (await setActionStatus(action, "FAILED"));

  const isAnimal = creature.species.kind === "ANIMAL";
  const label = isAnimal ? "Щось" : "Хтось";
  const name = creature.name ?? creature.species.name;
  await notifyLocation(bot, creature.locationId, -1, isAnimal ? "Щось пішло звідси." : `${name} пішов звідси.`, buildTrackKeyboard());
  await createTrack({ actorType: "CREATURE", creatureId: creature.id }, creature.locationId, exit.toLocationId, payload.direction, isAnimal ? `сліди: ${creature.species.name}` : `слід: ${name}`);
  await spendCreatureStamina(creature, actionCost("MOVE"));
  await prisma.creature.updateMany({ where: { id: creature.id }, data: { locationId: exit.toLocationId, activity: "MOVING", currentAction: payload.reason ?? actionTitle(action), steps: { increment: 1 }, hunger: { increment: 1 } } });
  await notifyLocation(bot, exit.toLocationId, -1, `Хтось зайшов сюди ${FROM_DIRECTION_LABELS[payload.direction] ?? "звідкись"}.`, buildTargetListKeyboard([{ type: "creature", id: creature.id, label, canGreet: !isAnimal }]));
  await setActionStatus(action, "DONE");
  await logEvent("NPC_MOVE", "Creature queued move completed", `${creature.id}:${payload.direction}`, exit.toLocationId);
}

async function completeGather(bot: Bot, action: WorldAction) {
  const payload = payloadOf<GatherPayload>(action);
  const chatId = chatIdFromAction(action);
  const isPlayer = action.actorType === "PLAYER";
  const actor = isPlayer
    ? action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null
    : action.creatureId ? await prisma.creature.findUnique({ where: { id: action.creatureId }, include: { species: true } }) : null;

  if (!actor || (isPlayer && !(actor as any).currentLocationId)) {
    await setActionStatus(action, "FAILED");
    return;
  }

  const locationId = isPlayer ? (actor as any).currentLocationId : (actor as any).locationId;
  const durationSeconds = msToSeconds(action.durationMs);
  const resource = payload.resourceKey
    ? await prisma.resourceNode.findFirst({ where: { locationId, resourceType: { key: payload.resourceKey }, amount: { gt: 0 } }, include: { resourceType: true, location: true } })
    : pick(await prisma.resourceNode.findMany({ where: { locationId, amount: { gt: 0 }, resourceType: { key: { in: ["berries", "mushrooms", "herbs"] } } }, include: { resourceType: true, location: true } }));

  const resourceKey = resource?.resourceType.key as "berries" | "mushrooms" | "herbs" | undefined;
  const cfg = resourceKey ? gatherConfig[resourceKey] : undefined;

  if (isPlayer) {
    await spendPlayerStamina(bot, (actor as any).id, action.type, chatId);
    await prisma.player.updateMany({ where: { id: (actor as any).id }, data: { gatherAttempts: { increment: 1 } } });
  } else {
    await spendCreatureStamina(actor as any, actionCost(action.type));
    await prisma.creature.updateMany({ where: { id: (actor as any).id }, data: { gatherAttempts: { increment: 1 }, activity: "GATHERING", currentAction: resourceKey ? `збирає ${resourceKey}` : "шукає поживу" } });
  }

  if (!resource || !resourceKey || !cfg || Math.random() > cfg.chance) {
    await setActionStatus(action, "DONE");
    if (chatId) await bot.api.sendMessage(chatId, `Ви витратили час на пошуки (${durationSeconds} с), але нічого корисного не знайшли.`);
    await logEvent(isPlayer ? "GATHER" : "NPC_ACTION", "Queued gather failed", resourceKey ?? "random", locationId);
    return;
  }

  const found = Math.min(resource.amount, isPlayer ? Math.floor(Math.random() * 3) + 1 : 1);
  const nextAmount = resource.amount - found;
  await prisma.resourceNode.updateMany({ where: { id: resource.id }, data: { amount: nextAmount } });

  if (isPlayer) {
    const statFieldMap = { berries: "berriesGathered", mushrooms: "mushroomsGathered", herbs: "herbsGathered" } as const;
    await prisma.playerResource.upsert({
      where: { playerId_resourceTypeId: { playerId: (actor as any).id, resourceTypeId: resource.resourceTypeId } },
      update: { amount: { increment: found } },
      create: { playerId: (actor as any).id, resourceTypeId: resource.resourceTypeId, amount: found },
    });
    await prisma.player.updateMany({ where: { id: (actor as any).id }, data: { successfulGathers: { increment: 1 }, [statFieldMap[resourceKey]]: { increment: found } } });
    if (chatId) await bot.api.sendMessage(chatId, `Ви витратили час на пошуки (${durationSeconds} с) і знайшли: ${resource.resourceType.name} ×${found}.`);
  } else {
    await prisma.creature.updateMany({ where: { id: (actor as any).id }, data: { successfulGathers: { increment: 1 }, currentAction: `зібрав ${resource.resourceType.name} ×${found}` } });
  }

  await setActionStatus(action, "DONE");
  await logEvent(isPlayer ? "GATHER" : "NPC_ACTION", "Queued gather succeeded", `${resource.resourceType.name} ×${found}`, locationId);

  if (resource.amount > 0 && nextAmount <= 0) await summonLisovykIfResourceDepleted(bot, resource.resourceType.name, resource.location.regionId);
}

async function completeEat(action: WorldAction) {
  if (action.actorType !== "CREATURE" || !action.creatureId) return void (await setActionStatus(action, "FAILED"));
  const creature = await prisma.creature.findUnique({ where: { id: action.creatureId }, include: { species: true } });
  if (!creature || !creature.isAlive || creature.isGone) return void (await setActionStatus(action, "FAILED"));

  const resource = await prisma.resourceNode.findFirst({ where: { locationId: creature.locationId, amount: { gt: 0 }, resourceType: { key: { in: ["grass", "berries", "herbs", "mushrooms"] } } }, include: { resourceType: true } });
  if (resource && creature.species.diet !== "CARNIVORE") {
    await prisma.resourceNode.updateMany({ where: { id: resource.id }, data: { amount: { decrement: 1 } } });
    const staminaMax = creature.staminaMax ?? BASE_STAMINA;
    await prisma.creature.updateMany({ where: { id: creature.id }, data: { hunger: Math.max(0, creature.hunger - 3), stamina: Math.min(staminaMax, creature.stamina + 1), activity: "RESTING", currentAction: `їсть ${resource.resourceType.name}` } });
  } else {
    await prisma.creature.updateMany({ where: { id: creature.id }, data: { hunger: { increment: 1 }, activity: "LOOKING", currentAction: "шукає їжу" } });
  }
  await setActionStatus(action, "DONE");
}

async function completeLook(bot: Bot, action: WorldAction) {
  if (action.actorType === "PLAYER") {
    const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
    const chatId = chatIdFromAction(action);
    if (!player) return void (await setActionStatus(action, "FAILED"));
    const locationId = player.currentLocationId ?? (await getStartLocationId());
    await spendPlayerStamina(bot, player.id, "LOOK", chatId);
    await prisma.player.updateMany({ where: { id: player.id }, data: { currentLocationId: locationId, looks: { increment: 1 } } });
    await setActionStatus(action, "DONE");
    if (chatId) {
      const view = await renderLocationDetails(locationId, player.id);
      if (action.messageId && typeof chatId === "number") {
        try {
          await bot.api.editMessageText(chatId, action.messageId, view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
          return;
        } catch {
          // Fall back to a new message when Telegram cannot edit the source message.
        }
      }
      await bot.api.sendMessage(chatId, view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
    }
    return;
  }

  if (action.creatureId) await prisma.creature.updateMany({ where: { id: action.creatureId }, data: { looks: { increment: 1 }, activity: "LOOKING", currentAction: "озирається" } });
  await setActionStatus(action, "DONE");
}

async function completeInspect(bot: Bot, action: WorldAction) {
  const payload = payloadOf<SocialPayload>(action);
  const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
  const chatId = chatIdFromAction(action);
  if (!player || !player.currentLocationId || action.actorType !== "PLAYER") return void (await setActionStatus(action, "FAILED"));
  const target = await resolveTarget(payload.targetType, payload.targetId, player.currentLocationId);
  await setActionStatus(action, target ? "DONE" : "FAILED");
  if (!target) {
    if (chatId) await bot.api.sendMessage(chatId, "Цілі вже немає поруч. Можна спробувати відслідкувати слід.");
    return;
  }
  await spendPlayerStamina(bot, player.id, "INSPECT", chatId);
  await logEvent("INSPECT", "Player inspected target", `${target.kind}:${target.id}`, player.currentLocationId);
  if (chatId) await bot.api.sendMessage(chatId, `${targetIntro(target, payload.mode === "mystery")}\n\n${target.inspect}`);
}

async function completeGreet(bot: Bot, action: WorldAction) {
  const payload = payloadOf<SocialPayload>(action);
  const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
  const chatId = chatIdFromAction(action);
  if (!player || !player.currentLocationId || action.actorType !== "PLAYER") return void (await setActionStatus(action, "FAILED"));
  const target = await resolveTarget(payload.targetType, payload.targetId, player.currentLocationId);
  if (!target || !target.canGreet) {
    await setActionStatus(action, "FAILED");
    if (chatId) await bot.api.sendMessage(chatId, !target ? "Цілі вже немає поруч." : `${target.forms.nominative} не виглядає співрозмовником.`);
    return;
  }
  const greeting = pick(GREETINGS);
  await spendPlayerStamina(bot, player.id, "GREET", chatId);
  await prisma.player.updateMany({ where: { id: player.id }, data: { greetings: { increment: 1 } } });
  await notifyLocation(bot, player.currentLocationId, player.id, `Хтось звертається до ${target.forms.genitive}: «${greeting}»`);
  await setActionStatus(action, "DONE");
  await logEvent("GREET", "Player greeted target", `${target.kind}:${target.id}: ${greeting}`, player.currentLocationId);
  if (chatId) await bot.api.sendMessage(chatId, `Ви сказали ${target.forms.dative}: «${greeting}»`);
}

async function completeFreshen(bot: Bot, action: WorldAction) {
  const payload = payloadOf<SocialPayload>(action);
  const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
  const chatId = chatIdFromAction(action);
  if (!player || !player.currentLocationId || action.actorType !== "PLAYER") return void (await setActionStatus(action, "FAILED"));
  const target = await resolveTarget(payload.targetType, payload.targetId, player.currentLocationId);
  if (!target || !target.isCorpse || !target.canFreshen) {
    await setActionStatus(action, "FAILED");
    if (chatId) await bot.api.sendMessage(chatId, "Труп уже не підходить для освіжування.");
    return;
  }
  await spendPlayerStamina(bot, player.id, "FRESHEN", chatId);
  await setActionStatus(action, "DONE");
  await logEvent("PLAYER_ACTION", "Player freshened corpse", `${target.kind}:${target.id}`, player.currentLocationId);
  if (chatId) await bot.api.sendMessage(chatId, `🔪 Ви освіжували ${target.forms.accusative}.\n\nПоки що це debug-дія без здобичі; пізніше тут будуть шкіра, м’ясо, кістки тощо.`);
}

async function completeCreatureAttack(bot: Bot, action: WorldAction) {
  const payload = payloadOf<SocialPayload>(action);
  const attacker = action.creatureId ? await prisma.creature.findUnique({ where: { id: action.creatureId }, include: { species: true } }) : null;
  if (!attacker || !attacker.isAlive || attacker.isGone || payload.targetType !== "creature") return void (await setActionStatus(action, "FAILED"));

  const target = await prisma.creature.findFirst({ where: { id: payload.targetId, locationId: attacker.locationId, isAlive: true, isGone: false }, include: { species: true } });
  if (!target || target.id === attacker.id) return void (await setActionStatus(action, "FAILED"));

  const damage = Math.max(1, attacker.species.strength + Math.floor(Math.random() * 3));
  const nextHp = target.hp - damage;
  await spendCreatureStamina(attacker, actionCost("ATTACK"));

  if (nextHp <= 0) {
    await prisma.creature.updateMany({ where: { id: target.id }, data: { hp: 0, isAlive: false, age: "CORPSE", diedAtTick: null, corpseDecayTicksLeft: target.species.corpseDecayTicks, activity: "RESTING", currentAction: "лежить нерухомо" } });
    await interruptActorActions({ actorType: "CREATURE", creatureId: target.id }, "істоту вбито", true);
    await prisma.creature.updateMany({ where: { id: attacker.id }, data: { hunger: Math.max(0, attacker.hunger - 4), activity: "FIGHTING", currentAction: `убив ${target.species.name}` } });
    await notifyLocation(bot, attacker.locationId, -1, `Щось кидається на здобич. За мить ${target.species.name} падає нерухомо.`);
    await logEvent("NPC_ACTION", "Creature killed prey", `${attacker.id} -> ${target.id}`, attacker.locationId);
  } else {
    await prisma.creature.updateMany({ where: { id: target.id }, data: { hp: nextHp, currentAction: "поранено" } });
    await prisma.creature.updateMany({ where: { id: attacker.id }, data: { activity: "FIGHTING", currentAction: `атакує ${target.species.name}` } });
    await notifyLocation(bot, attacker.locationId, -1, `Щось нападає на ${target.species.name}.`);
    await logEvent("NPC_ACTION", "Creature attacked prey", `${attacker.id} -> ${target.id}; damage=${damage}`, attacker.locationId);
  }

  await setActionStatus(action, "DONE");
}

async function completeAttack(bot: Bot, action: WorldAction) {
  if (action.actorType === "CREATURE") return completeCreatureAttack(bot, action);

  const payload = payloadOf<SocialPayload>(action);
  const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
  const chatId = chatIdFromAction(action);
  if (!player || !player.currentLocationId || action.actorType !== "PLAYER") return void (await setActionStatus(action, "FAILED"));
  const target = await resolveTarget(payload.targetType, payload.targetId, player.currentLocationId);
  if (!target || target.kind !== "creature" || !target.isAnimal || target.isCorpse) {
    await setActionStatus(action, "FAILED");
    if (chatId) await bot.api.sendMessage(chatId, !target ? "Цілі вже немає поруч." : "⚔️ Поки що можна атакувати тільки живих тварин.");
    return;
  }

  const creature = await prisma.creature.findFirst({ where: { id: target.id, locationId: player.currentLocationId, isAlive: true, isGone: false }, include: { species: true } });
  if (!creature) {
    await setActionStatus(action, "FAILED");
    if (chatId) await bot.api.sendMessage(chatId, "Цілі вже немає поруч. Можна спробувати відслідкувати слід.");
    return;
  }

  await spendPlayerStamina(bot, player.id, "ATTACK", chatId);
  await prisma.creature.updateMany({ where: { id: creature.id }, data: { hp: 0, isAlive: false, age: "CORPSE", diedAtTick: null, corpseDecayTicksLeft: creature.species.corpseDecayTicks, activity: "RESTING", currentAction: "лежить нерухомо" } });
  await interruptActorActions({ actorType: "CREATURE", creatureId: creature.id }, "істоту вбито", true);
  await prisma.player.updateMany({ where: { id: player.id }, data: { animalsKilled: { increment: 1 } } });
  await notifyLocation(bot, player.currentLocationId, player.id, `Хтось атакує і вбиває ${target.forms.accusative}.`);
  await setActionStatus(action, "DONE");
  await logEvent("PLAYER_ACTION", "Player killed animal", `${target.kind}:${target.id}`, player.currentLocationId);
  if (chatId) await bot.api.sendMessage(chatId, `⚔️ Ви атакували і вбили ${target.forms.accusative}. Труп лишився на землі.`);
}

async function completeSay(bot: Bot, action: WorldAction) {
  const payload = payloadOf<SayPayload>(action);
  const text = String(payload.text ?? "").slice(0, 300);
  if (!text) return void (await setActionStatus(action, "FAILED"));

  if (action.actorType === "PLAYER") {
    const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
    const chatId = chatIdFromAction(action);
    if (!player || !player.currentLocationId) return void (await setActionStatus(action, "FAILED"));
    await spendPlayerStamina(bot, player.id, "SAY", chatId);
    await prisma.player.updateMany({ where: { id: player.id }, data: { says: { increment: 1 } } });
    await notifyLocation(bot, player.currentLocationId, player.id, `Хтось каже: «${text}»`);
    await setActionStatus(action, "DONE");
    await logEvent("SAY", "Player said something", text, player.currentLocationId);
    if (chatId) await bot.api.sendMessage(chatId, `Ви кажете: «${text}»`);
    return;
  }

  const creature = action.creatureId ? await prisma.creature.findUnique({ where: { id: action.creatureId }, include: { species: true } }) : null;
  if (!creature || !creature.isAlive || creature.isGone) return void (await setActionStatus(action, "FAILED"));
  await prisma.creature.updateMany({ where: { id: creature.id }, data: { says: { increment: 1 }, activity: "SPEAKING", currentAction: "говорить" } });
  await notifyLocation(bot, creature.locationId, -1, `${creature.name ?? creature.species.name} промовляє: «${text}»`);
  await setActionStatus(action, "DONE");
  await logEvent("NPC_SAY", "Creature said something", text, creature.locationId);
}

async function completeTrack(bot: Bot, action: WorldAction) {
  const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
  const chatId = chatIdFromAction(action);
  if (!player || !player.currentLocationId || action.actorType !== "PLAYER") return void (await setActionStatus(action, "FAILED"));

  const now = new Date();
  await prisma.worldTrack.deleteMany({ where: { expiresAt: { lt: now } } });
  await spendPlayerStamina(bot, player.id, "TRACK", chatId);

  const tracks = await prisma.worldTrack.findMany({
    where: {
      expiresAt: { gt: now },
      OR: [{ fromLocationId: player.currentLocationId }, { toLocationId: player.currentLocationId }],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 8,
  });

  await setActionStatus(action, "DONE");

  if (!chatId) return;
  if (!tracks.length) {
    await bot.api.sendMessage(chatId, "👣 Ви вдивляєтесь у землю й траву, але свіжих слідів не знаходите.");
    return;
  }

  const lines = tracks.map((track) => {
    const direction = track.fromLocationId === player.currentLocationId
      ? `пішло на ${directionLabels[track.direction].toLowerCase()}`
      : `прийшло ${FROM_DIRECTION_LABELS[track.direction] ?? "звідкись"}`;
    const freshness = track.strength >= 3 ? "свіжий" : track.strength === 2 ? "помітний" : "ледь помітний";
    return `- ${freshness} слід: ${track.label}; ${direction}`;
  });

  await bot.api.sendMessage(chatId, `👣 Ви знаходите сліди:\n${lines.join("\n")}`);
}

async function completeSimple(action: WorldAction) {
  if (action.type === "REST") {
    if (action.actorType === "PLAYER" && action.playerId) {
      const player = await prisma.player.findUnique({ where: { id: action.playerId } });
      if (player) {
        const max = await getPlayerRestStaminaCap(player.id);
        const hpMax = player.hpMax ?? BASE_HP;
        const payload = payloadOf<{ untilFull?: boolean }>(action);
        const next = payload.untilFull ? max : Math.min(max, player.stamina + REST_STAMINA_REGEN_PER_INTERVAL);
        const nextHp = payload.untilFull ? hpMax : Math.min(hpMax, player.hp + HEALTH_REGEN_PER_INTERVAL);
        await prisma.player.updateMany({
          where: { id: player.id },
          data: {
            stamina: next,
            hp: nextHp,
            fatigueState: fatigueStateFor(next, max),
            isResting: false,
            restFullRecoveries: next >= max && nextHp >= hpMax && (player.stamina < max || player.hp < hpMax) ? { increment: 1 } : undefined,
          },
        });
      }
    }
    if (action.actorType === "CREATURE" && action.creatureId) {
      const creature = await prisma.creature.findUnique({ where: { id: action.creatureId } });
      if (creature) {
        const max = creature.staminaMax ?? BASE_STAMINA;
        const next = Math.min(max, creature.stamina + REST_STAMINA_REGEN_PER_INTERVAL);
        await prisma.creature.updateMany({ where: { id: creature.id }, data: { stamina: next, fatigueState: fatigueStateFor(next, max), activity: "RESTING", currentAction: "відпочиває" } });
      }
    }
  } else if (action.actorType === "CREATURE" && action.creatureId) {
    await prisma.creature.updateMany({ where: { id: action.creatureId }, data: { activity: "RESTING", currentAction: actionTitle(action) } });
  }

  await setActionStatus(action, "DONE");
}
