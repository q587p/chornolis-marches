import { Bot } from "grammy";
import { Direction, LocationExit, WorldAction } from "@prisma/client";
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
import { buildCorpseActionKeyboard, buildExamineLocationKeyboard, buildExamineTracksKeyboard, buildGatherRetryKeyboard, buildTargetListKeyboard, buildTrackKeyboard } from "../ui/keyboards";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { renderLocationBrief, renderLocationDetails } from "./locations";
import { notifyLocation, notifyLocationExcept, notifyRegionExcept } from "./notifications";
import { hasActiveLightAtLocation } from "./fire";
import { getPlayerRestStaminaCap, getPlayerRestStaminaRegenMultiplier } from "./locationFeatures";
import { getStartLocationId } from "./players";
import { summonLisovykIfResourceDepleted } from "./resources";
import { logEvent } from "./worldEvents";
import { resolveTarget, type ResolvedTarget } from "./targets";
import { playerForms } from "./grammar";
import { actionCost, actionTitle, movementDurationMs } from "./actionRules";
import { fatigueStateFor, spendCreatureStamina, spendPlayerStamina } from "./actionRecovery";
import { actorWhere, enqueueCreatureAction, interruptActorActions, type ActorRef } from "./actionLifecycle";
import { escapeHtml } from "../utils/text";
import { resourceAccusativeName } from "../utils/resourceText";
import { canEditKnownMessage, noteKnownMessage } from "../utils/messageTracker";
import { playerCanShowTechnicalDetails } from "./technicalDetails";
import { canOpenDreamGateWithSpeech, isLocationExitLocked, isTutorialFastRestLocationKey, openDreamGate, rememberTutorialCommandHintIfInTutorial, rememberTutorialForagingSuccess, TUTORIAL_FORAGING_LOCATION_KEY, TUTORIAL_REST_LOCATION_KEY } from "./tutorial";
import { tutorialGateSpeechComment, tutorialLookPaceComments, tutorialSpiritMoveComment, tutorialTrackComments, tutorialWaitPaceComments } from "./tutorialVoices";
import { chance, pick, shuffle } from "../utils/random";
import { freshenCorpseForMeat } from "./meat";
import { rememberPlayerReplyTarget } from "./replyTargets";
import { hunterClaimedCorpseAction, isHunterCreature } from "./npcHunter";
import { ATTACK_OBSERVATION_GROWTH_MESSAGE, ATTACK_PRACTICE_GROWTH_MESSAGE, isAttackPracticeMilestone, recordAttackKillSource, recordAttackObservation } from "./attackLearning";
import { GATHERING_OBSERVATION_GROWTH_MESSAGE, GATHERING_PRACTICE_GROWTH_MESSAGE, isGatheringPracticeMilestone, recordGatheringObservation, recordGatheringSource } from "./gatheringLearning";

type MovePayload = { direction: Direction; reason?: string };
type GatherPayload = { resourceKey?: "berries" | "mushrooms" | "herbs" };
type SayPayload = { text: string; mode?: "say" | "whisper" | "reply" | "shout"; targetType?: "player" | "creature"; targetId?: number; targetName?: string; targetDative?: string };
type SocialPayload = { targetType: "player" | "creature"; targetId: number; mode?: "known" | "mystery"; detail?: "brief" | "full" };

const RECENT_ATTACK_FEATURE_PREFIX = "recent_attack_";
const RECENT_ATTACK_DANGER_TICKS = Number(process.env.WORLD_RECENT_ATTACK_DANGER_TICKS || 20);
const RECENT_ATTACK_DANGER_MS = RECENT_ATTACK_DANGER_TICKS * Number(process.env.WORLD_TICK_INTERVAL_MS || 1500);
const PANIC_HERBIVORE_FLEE_CHANCE = Number(process.env.WORLD_PANIC_HERBIVORE_FLEE_CHANCE || 85);
const PANIC_HERBIVORE_MAX_FLEE = Number(process.env.WORLD_PANIC_HERBIVORE_MAX_FLEE || 18);
const PANIC_HERBIVORE_MOVE_PRIORITY = Number(process.env.WORLD_PANIC_HERBIVORE_MOVE_PRIORITY || 60);
const TUTORIAL_REST_ENTRY_EVENT_TITLE = "Tutorial rest entry stamina lesson";
const TUTORIAL_FORAGING_RESOURCE_KEYS = new Set(["berries", "herbs"]);
const TUTORIAL_FORAGING_SUCCESS_COMMENT = "Тут усе вдалося з першого разу, бо сон сам нахилив гілки до ваших рук. Не уві сні так буває не завжди: іноді доведеться спробувати ще раз, а з досвідом руки ставатимуть певніші й швидші.";
const TUTORIAL_REST_FAST_COMMENT = "У навчальному сні жар повертає снагу дуже швидко, майже за один подих. Наяву відпочинок триватиме довше.";
const TUTORIAL_REST_FULL_COMMENT = "Сон стиха каже: «Ось так виглядає короткий перепочинок у навчальному сні. Наяву до повної снаги шлях буде довший, і не кожне вогнище тримає вас так легко.»";
const TUTORIAL_REST_EXTRA_COMMENT = "Якщо на клавіатурі бачите «екстра», це не помилка. Сон на мить дає снаги більше, ніж тіло звикло тримати наяву: надлишок допомагає навчитися, але за межами сну таке буде рідкісним і недовгим.";

async function removeTutorialForagingDreamItems(playerId: number, fromLocationId: number) {
  const from = await prisma.cellLocation.findUnique({ where: { id: fromLocationId }, select: { key: true } });
  if (from?.key !== TUTORIAL_FORAGING_LOCATION_KEY) return false;

  const resourceTypes = await prisma.resourceType.findMany({
    where: { key: { in: ["berries", "herbs"] } },
    select: { id: true },
  });
  if (!resourceTypes.length) return false;

  const result = await prisma.playerResource.updateMany({
    where: {
      playerId,
      amount: { gt: 0 },
      resourceTypeId: { in: resourceTypes.map((type) => type.id) },
    },
    data: { amount: 0 },
  });
  return result.count > 0;
}

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

function chatIdFromAction(action: WorldAction) {
  if (!action.chatId) return undefined;
  const numeric = Number(action.chatId);
  return Number.isSafeInteger(numeric) ? numeric : action.chatId;
}

function msToSeconds(ms: number) {
  return Math.max(1, Math.ceil(ms / 1000));
}

function actionDurationPhrase(showTechnicalDetails: boolean, durationMs: number) {
  return showTechnicalDetails ? ` (${msToSeconds(durationMs)} с)` : "";
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

function quoteBlock(text: string) {
  return `<blockquote>${escapeHtml(text)}</blockquote>`;
}

function saidVerb(player: any) {
  const gender = player.grammaticalGender ?? (player.pronoun === "SHE" ? "FEMININE" : player.pronoun === "THEY" ? "PLURAL" : "MASCULINE");
  if (gender === "FEMININE") return "сказала";
  if (gender === "PLURAL") return "сказали";
  return "сказав";
}

function repliedVerb(player: any) {
  const gender = player.grammaticalGender ?? (player.pronoun === "SHE" ? "FEMININE" : player.pronoun === "THEY" ? "PLURAL" : "MASCULINE");
  if (gender === "FEMININE") return "відповіла";
  if (gender === "PLURAL") return "відповіли";
  return "відповів";
}

function shoutedVerb(player: any) {
  const gender = player.grammaticalGender ?? (player.pronoun === "SHE" ? "FEMININE" : player.pronoun === "THEY" ? "PLURAL" : "MASCULINE");
  if (gender === "FEMININE") return "гукнула";
  if (gender === "PLURAL") return "гукнули";
  return "гукнув";
}

function trackAgeText(createdAt: Date, now = new Date()) {
  const seconds = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 1000));
  if (seconds < 20) return "щойно";
  if (seconds < 60) return "менше хвилини тому";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 2) return "близько хвилини тому";
  if (minutes < 5) return "кілька хвилин тому";
  if (minutes < 15) return `${minutes} хв тому`;
  return "давніше";
}

async function visibleMoverLabel(locationId: number, fallback: string, visibleName: string) {
  return (await hasActiveLightAtLocation(locationId)) ? visibleName : fallback;
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
  if (action.type === "REST" || action.type === "WAIT" || action.type === "SET_TRAP") return completeSimple(bot, action);
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

async function markRecentAttackDanger(locationId: number) {
  const expiresAt = new Date(Date.now() + RECENT_ATTACK_DANGER_MS).toISOString();
  await prisma.locationFeature.upsert({
    where: { key: `${RECENT_ATTACK_FEATURE_PREFIX}${locationId}` },
    update: {
      isActive: true,
      data: { ecology: "recent_attack", expiresAt, ticks: RECENT_ATTACK_DANGER_TICKS },
    },
    create: {
      key: `${RECENT_ATTACK_FEATURE_PREFIX}${locationId}`,
      locationId,
      type: "BRIDGE",
      name: "Свіжий напад",
      description: "Нещодавній напад тривожить тварин у цій місцині.",
      isActive: true,
      data: { ecology: "recent_attack", expiresAt, ticks: RECENT_ATTACK_DANGER_TICKS },
    },
  });
}

async function applyTutorialRestEntryStaminaLesson(playerId: number, locationId: number) {
  const location = await prisma.cellLocation.findUnique({ where: { id: locationId }, select: { key: true } });
  if (location?.key !== TUTORIAL_REST_LOCATION_KEY) return null;

  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { id: true, stamina: true, staminaMax: true } });
  if (!player) return null;

  const max = player.staminaMax ?? BASE_STAMINA;
  const next = Math.max(1, Math.ceil(max / 3));
  await prisma.player.updateMany({
    where: { id: player.id },
    data: {
      stamina: next,
      fatigueState: fatigueStateFor(next, max),
      lastStaminaRegenAt: new Date(),
    },
  });
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: TUTORIAL_REST_ENTRY_EVENT_TITLE,
      description: `stamina ${player.stamina}/${max} -> ${next}/${max}`,
      playerId: player.id,
      locationId,
    },
  });

  return "Тепло сну раптом робить тіло важчим, ніби дорога згадала всі попередні кроки. Снаги лишається приблизно на третину. Тут саме час натиснути «Відпочити» або написати /rest.";
}

async function triggerHerbivorePanic(locationId: number, victimCreatureId: number, reason = "лякається крові й різкого руху") {
  const maxFlee = Math.max(0, Math.floor(PANIC_HERBIVORE_MAX_FLEE));
  if (maxFlee <= 0) return 0;

  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: { exitsFrom: true },
  });
  if (!location || location.exitsFrom.length === 0) return 0;

  const herbivores = await prisma.creature.findMany({
    where: {
      locationId,
      isAlive: true,
      isGone: false,
      id: { not: victimCreatureId },
      species: { diet: "HERBIVORE" },
    },
    include: { species: true },
    take: Math.max(maxFlee * 4, maxFlee),
  });

  const fleeing = shuffle(herbivores)
    .filter(() => chance(PANIC_HERBIVORE_FLEE_CHANCE))
    .slice(0, maxFlee);

  for (const creature of fleeing) {
    const exit = pick(location.exitsFrom) as LocationExit | undefined;
    if (!exit) continue;
    await interruptActorActions({ actorType: "CREATURE", creatureId: creature.id }, "злякалося нападу", true);
    await enqueueCreatureAction({
      creatureId: creature.id,
      type: "MOVE",
      payload: { direction: exit.direction as Direction, reason },
      durationMs: movementDurationMs(exit.travelCost, creature.stamina),
      priority: PANIC_HERBIVORE_MOVE_PRIORITY,
      interruptQueued: true,
    });
  }

  if (fleeing.length > 0) {
    await logEvent("NPC_ACTION", "Herbivores panicked after attack", `location=${locationId}; fleeing=${fleeing.length}; victim=${victimCreatureId}`, locationId);
  }

  return fleeing.length;
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
      if (chatId) await bot.api.sendMessage(chatId, "Шлях, яким ви збиралися йти, більше не видно.", { reply_markup: await buildMainReplyKeyboardForTelegramId(Number(player.telegramId), false) });
      await logEvent("ERROR", "Queued player move failed", payload.direction, currentLocationId);
      return;
    }
    const lockedMessage = await isLocationExitLocked(currentLocationId, payload.direction);
    if (lockedMessage) {
      await setActionStatus(action, "FAILED");
      if (chatId) await bot.api.sendMessage(chatId, lockedMessage, { reply_markup: await buildMainReplyKeyboardForTelegramId(Number(player.telegramId), false) });
      await logEvent("ERROR", "Queued player move blocked", payload.direction, currentLocationId);
      return;
    }

    const playerName = playerForms(player).nominative;
    const departureLabel = await visibleMoverLabel(currentLocationId, "Хтось", playerName);
    await notifyLocation(bot, currentLocationId, player.id, `${departureLabel} пішов звідси.`, buildTrackKeyboard());
    await createTrack({ actorType: "PLAYER", playerId: player.id }, currentLocationId, exit.toLocationId, payload.direction, "людський слід");
    await spendPlayerStamina(bot, player.id, "MOVE", chatId);
    const dreamItemsStolen = await removeTutorialForagingDreamItems(player.id, currentLocationId);
    await prisma.player.updateMany({ where: { id: player.id }, data: { currentLocationId: exit.toLocationId, steps: { increment: 1 } } });
    const tutorialRestEntryText = await applyTutorialRestEntryStaminaLesson(player.id, exit.toLocationId);
    const arrivalLabel = await visibleMoverLabel(exit.toLocationId, "Хтось", playerName);
    await notifyLocation(bot, exit.toLocationId, player.id, `${arrivalLabel} зайшов сюди ${FROM_DIRECTION_LABELS[payload.direction] ?? "звідкись"}.`, buildTargetListKeyboard([{ type: "player", id: player.id, label: arrivalLabel, canGreet: true }]));
    await setActionStatus(action, "DONE");
    await logEvent("MOVE", "Player queued move completed", payload.direction, exit.toLocationId);
    const spiritComment = await tutorialSpiritMoveComment(currentLocationId, exit.toLocationId, payload.direction);

    if (chatId) {
      const view = await renderLocationBrief(exit.toLocationId, player.id);
      noteKnownMessage(await bot.api.sendMessage(chatId, `Ви дійшли: ${directionLabels[payload.direction]}`, { reply_markup: await buildMainReplyKeyboardForTelegramId(Number(player.telegramId), false) }));
      if (spiritComment) noteKnownMessage(await bot.api.sendMessage(chatId, `${spiritComment.title}:\n${quoteBlock(spiritComment.text)}`, { parse_mode: "HTML" }));
      if (dreamItemsStolen) noteKnownMessage(await bot.api.sendMessage(chatId, `Мара сміється десь між листям:\n${quoteBlock("Сонні ягоди й трави лишаються в просвіті. Варто винести їх за край — і вони розсипаються туманом.")}`, { parse_mode: "HTML" }));
      if (tutorialRestEntryText) noteKnownMessage(await bot.api.sendMessage(chatId, tutorialRestEntryText, { reply_markup: await buildMainReplyKeyboardForTelegramId(Number(player.telegramId), false) }));
      noteKnownMessage(await bot.api.sendMessage(chatId, view.text, { parse_mode: "HTML", reply_markup: view.keyboard }));
    }
    return;
  }

  const creature = action.creatureId ? await prisma.creature.findUnique({ where: { id: action.creatureId }, include: { species: true } }) : null;
  if (!creature || !creature.isAlive || creature.isGone) return void (await setActionStatus(action, "FAILED"));

  const exit = await prisma.locationExit.findUnique({ where: { fromLocationId_direction: { fromLocationId: creature.locationId, direction: payload.direction } } });
  if (!exit || exit.isHidden) return void (await setActionStatus(action, "FAILED"));
  if (await isLocationExitLocked(creature.locationId, payload.direction)) return void (await setActionStatus(action, "FAILED"));

  const isAnimal = creature.species.kind === "ANIMAL";
  const name = creature.name ?? creature.species.name;
  if (!isAnimal) {
    const departureLabel = await visibleMoverLabel(creature.locationId, "Хтось", name);
    await notifyLocation(bot, creature.locationId, -1, `${departureLabel} пішов звідси.`, buildTrackKeyboard());
  }
  await createTrack({ actorType: "CREATURE", creatureId: creature.id }, creature.locationId, exit.toLocationId, payload.direction, isAnimal ? `сліди: ${creature.species.name}` : `слід: ${name}`);
  await spendCreatureStamina(creature, actionCost("MOVE"));
  await prisma.creature.updateMany({ where: { id: creature.id }, data: { locationId: exit.toLocationId, activity: "MOVING", currentAction: payload.reason ?? actionTitle(action), steps: { increment: 1 }, hunger: { increment: 1 } } });
  if (!isAnimal) {
    const arrivalLabel = await visibleMoverLabel(exit.toLocationId, "Хтось", name);
    await notifyLocation(bot, exit.toLocationId, -1, `${arrivalLabel} зайшов сюди ${FROM_DIRECTION_LABELS[payload.direction] ?? "звідкись"}.`, buildTargetListKeyboard([{ type: "creature", id: creature.id, label: arrivalLabel, canGreet: true }]));
  }
  await setActionStatus(action, "DONE");
  if (!isAnimal) await logEvent("NPC_MOVE", "Creature queued move completed", `${creature.id}:${payload.direction}`, exit.toLocationId);
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
  const durationText = actionDurationPhrase(isPlayer && playerCanShowTechnicalDetails(actor as any), action.durationMs);
  const resource = payload.resourceKey
    ? await prisma.resourceNode.findFirst({ where: { locationId, resourceType: { key: payload.resourceKey }, amount: { gt: 0 } }, include: { resourceType: true, location: true } })
    : pick(await prisma.resourceNode.findMany({ where: { locationId, amount: { gt: 0 }, resourceType: { key: { in: ["berries", "mushrooms", "herbs"] } } }, include: { resourceType: true, location: true } }));

  const resourceKey = resource?.resourceType.key as "berries" | "mushrooms" | "herbs" | undefined;
  const cfg = resourceKey ? gatherConfig[resourceKey] : undefined;
  const isTutorialForagingSuccess =
    isPlayer
    && resource?.location.key === TUTORIAL_FORAGING_LOCATION_KEY
    && Boolean(resourceKey && TUTORIAL_FORAGING_RESOURCE_KEYS.has(resourceKey));

  let gatherAttemptsAfterAttempt: number | null = null;
  if (isPlayer) {
    await spendPlayerStamina(bot, (actor as any).id, action.type, chatId);
    const updatedPlayer = await prisma.player.update({
      where: { id: (actor as any).id },
      data: { gatherAttempts: { increment: 1 } },
      select: { gatherAttempts: true },
    });
    gatherAttemptsAfterAttempt = updatedPlayer.gatherAttempts;
  } else {
    await spendCreatureStamina(actor as any, actionCost(action.type));
    await prisma.creature.updateMany({ where: { id: (actor as any).id }, data: { gatherAttempts: { increment: 1 }, activity: "GATHERING", currentAction: resourceKey ? `збирає ${resourceKey}` : "шукає поживу" } });
  }

  const recordGatheringAttemptSource = (success: boolean) => recordGatheringSource({
    locationId,
    actorPlayerId: isPlayer ? (actor as any).id : undefined,
    actorCreatureId: isPlayer ? undefined : (actor as any).id,
    resourceKey,
    success,
  });

  const sendGatheringPracticeMessage = async () => {
    if (!chatId || !gatherAttemptsAfterAttempt || !isGatheringPracticeMilestone(gatherAttemptsAfterAttempt)) return;
    noteKnownMessage(await bot.api.sendMessage(chatId, GATHERING_PRACTICE_GROWTH_MESSAGE, { parse_mode: "HTML" }));
  };

  if (!resource || !resourceKey || !cfg || (!isTutorialForagingSuccess && Math.random() > cfg.chance)) {
    await setActionStatus(action, "DONE");
    if (chatId) {
      if (resource && resourceKey && cfg) {
        await bot.api.sendMessage(
          chatId,
          `Ви витратили час і снагу на пошуки${durationText}, але нічого корисного не знайшли.\n\nМожете спробувати пошукати ще.`,
          { reply_markup: buildGatherRetryKeyboard(resourceKey) },
        );
      } else {
        await bot.api.sendMessage(
          chatId,
          `Ви витратили час і снагу на пошуки${durationText}, але нічого корисного не знайшли.\n\nБільше ви тут цього не знайдете найближчий час. Спробуйте пізніше або в іншій місцині.`,
        );
      }
    }
    await recordGatheringAttemptSource(false);
    await sendGatheringPracticeMessage();
    if (isPlayer) await logEvent("GATHER", "Queued gather failed", resourceKey ?? "random", locationId);
    return;
  }

  const found = Math.min(resource.amount, isPlayer ? Math.floor(Math.random() * 3) + 1 : 1);
  const nextAmount = isTutorialForagingSuccess ? resource.amount : resource.amount - found;
  if (!isTutorialForagingSuccess) {
    await prisma.resourceNode.updateMany({ where: { id: resource.id }, data: { amount: nextAmount } });
  }

  if (isPlayer) {
    const statFieldMap = { berries: "berriesGathered", mushrooms: "mushroomsGathered", herbs: "herbsGathered" } as const;
    await prisma.playerResource.upsert({
      where: { playerId_resourceTypeId: { playerId: (actor as any).id, resourceTypeId: resource.resourceTypeId } },
      update: { amount: { increment: found } },
      create: { playerId: (actor as any).id, resourceTypeId: resource.resourceTypeId, amount: found },
    });
    await prisma.player.updateMany({
      where: { id: (actor as any).id },
      data: {
        successfulGathers: { increment: 1 },
        ...(resourceKey in statFieldMap ? { [statFieldMap[resourceKey as keyof typeof statFieldMap]]: { increment: found } } : {}),
      },
    });
    const firstTutorialGather = isTutorialForagingSuccess
      ? await rememberTutorialForagingSuccess((actor as any).id, locationId, resourceKey)
      : false;
    if (chatId) {
      await bot.api.sendMessage(
        chatId,
        `Ви витратили час і снагу на пошуки${durationText} і знайшли: ${resource.resourceType.name} ×${found}.`,
        isTutorialForagingSuccess
          ? { reply_markup: await buildMainReplyKeyboardForTelegramId(Number((actor as any).telegramId), false) }
          : undefined,
      );
    }
    if (isTutorialForagingSuccess) {
      if (firstTutorialGather) {
        if (chatId) await bot.api.sendMessage(chatId, `Сон усміхається:\n${quoteBlock(TUTORIAL_FORAGING_SUCCESS_COMMENT)}`, { parse_mode: "HTML" });
      }
    }
  } else {
    await prisma.creature.updateMany({ where: { id: (actor as any).id }, data: { successfulGathers: { increment: 1 }, currentAction: `зібрав ${resource.resourceType.name} ×${found}` } });
  }

  await setActionStatus(action, "DONE");
  await recordGatheringAttemptSource(true);
  await sendGatheringPracticeMessage();
  if (isPlayer) await logEvent("GATHER", "Queued gather succeeded", `${resource.resourceType.name} ×${found}`, locationId);

  if (!isTutorialForagingSuccess && resource.amount > 0 && nextAmount <= 0) await summonLisovykIfResourceDepleted(bot, resource.resourceType.name, resource.location.regionId);
}

async function completeEat(action: WorldAction) {
  if (action.actorType !== "CREATURE" || !action.creatureId) return void (await setActionStatus(action, "FAILED"));
  const creature = await prisma.creature.findUnique({ where: { id: action.creatureId }, include: { species: true } });
  if (!creature || !creature.isAlive || creature.isGone) return void (await setActionStatus(action, "FAILED"));

  const resource = await prisma.resourceNode.findFirst({ where: { locationId: creature.locationId, amount: { gt: 0 }, resourceType: { key: { in: ["grass", "berries", "herbs", "mushrooms"] } } }, include: { resourceType: true } });
  if (resource && creature.species.diet !== "CARNIVORE") {
    await prisma.resourceNode.updateMany({ where: { id: resource.id }, data: { amount: { decrement: 1 } } });
    const staminaMax = creature.staminaMax ?? BASE_STAMINA;
    await prisma.creature.updateMany({ where: { id: creature.id }, data: { hunger: Math.max(0, creature.hunger - 3), stamina: Math.min(staminaMax, creature.stamina + 1), activity: "RESTING", currentAction: `їсть ${resourceAccusativeName(resource.resourceType)}` } });
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
    await rememberTutorialCommandHintIfInTutorial(player.id, "examine", locationId);
    await setActionStatus(action, "DONE");
    if (chatId) {
      const view = await renderLocationDetails(locationId, player.id);
      const voiceComments = await tutorialLookPaceComments({ ...player, currentLocationId: locationId });
      const sendAttackObservationMessage = async () => {
        const observation = await recordAttackObservation({ playerId: player.id, locationId });
        if (observation.milestone) noteKnownMessage(await bot.api.sendMessage(chatId, ATTACK_OBSERVATION_GROWTH_MESSAGE, { parse_mode: "HTML" }));
      };
      const sendGatheringObservationMessage = async () => {
        const observation = await recordGatheringObservation({ playerId: player.id, locationId });
        if (observation.milestone) noteKnownMessage(await bot.api.sendMessage(chatId, GATHERING_OBSERVATION_GROWTH_MESSAGE, { parse_mode: "HTML" }));
      };
      if (action.messageId && typeof chatId === "number" && canEditKnownMessage(chatId, action.messageId)) {
        try {
          await bot.api.editMessageText(chatId, action.messageId, view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
          for (const comment of voiceComments) {
            noteKnownMessage(await bot.api.sendMessage(chatId, `${comment.title}:\n${quoteBlock(comment.text)}`, { parse_mode: "HTML" }));
          }
          await sendAttackObservationMessage();
          await sendGatheringObservationMessage();
          return;
        } catch {
          // Fall back to a new message when Telegram cannot edit the source message.
        }
      }
      noteKnownMessage(await bot.api.sendMessage(chatId, view.text, { parse_mode: "HTML", reply_markup: view.keyboard }));
      for (const comment of voiceComments) {
        noteKnownMessage(await bot.api.sendMessage(chatId, `${comment.title}:\n${quoteBlock(comment.text)}`, { parse_mode: "HTML" }));
      }
      await sendAttackObservationMessage();
      await sendGatheringObservationMessage();
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
  const target = await resolveTarget(payload.targetType, payload.targetId, player.currentLocationId, {
    viewerPlayerId: player.id,
    detail: payload.detail === "brief" ? "brief" : "full",
  });
  await setActionStatus(action, target ? "DONE" : "FAILED");
  if (!target) {
    if (chatId) await bot.api.sendMessage(chatId, "Цілі вже немає поруч. Можна роздивитися місцину ще раз.", { reply_markup: buildExamineLocationKeyboard() });
    return;
  }
  await spendPlayerStamina(bot, player.id, "INSPECT", chatId);
  await logEvent("INSPECT", "Player inspected target", `${target.kind}:${target.id}`, player.currentLocationId);
  if (chatId) {
    await bot.api.sendMessage(chatId, `${targetIntro(target, payload.mode === "mystery")}\n\n${target.inspect}`);
    const observation = await recordAttackObservation({ playerId: player.id, locationId: player.currentLocationId });
    if (observation.milestone) noteKnownMessage(await bot.api.sendMessage(chatId, ATTACK_OBSERVATION_GROWTH_MESSAGE, { parse_mode: "HTML" }));
    if (target.kind === "player" || (!target.isAnimal && !target.isCorpse)) {
      const gatheringObservation = await recordGatheringObservation({ playerId: player.id, locationId: player.currentLocationId });
      if (gatheringObservation.milestone) noteKnownMessage(await bot.api.sendMessage(chatId, GATHERING_OBSERVATION_GROWTH_MESSAGE, { parse_mode: "HTML" }));
    }
  }
}

async function completeGreet(bot: Bot, action: WorldAction) {
  const payload = payloadOf<SocialPayload>(action);
  const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
  const chatId = chatIdFromAction(action);
  if (!player || !player.currentLocationId || action.actorType !== "PLAYER") return void (await setActionStatus(action, "FAILED"));
  const target = await resolveTarget(payload.targetType, payload.targetId, player.currentLocationId);
  if (!target || !target.canGreet) {
    await setActionStatus(action, "FAILED");
    if (chatId) {
      if (!target) {
        await bot.api.sendMessage(chatId, "Цілі вже немає поруч. Можна роздивитися місцину ще раз.", { reply_markup: buildExamineLocationKeyboard() });
      } else {
        await bot.api.sendMessage(chatId, `${target.forms.nominative} не виглядає співрозмовником.`);
      }
    }
    return;
  }
  const greeting = pick(GREETINGS);
  const actorForms = playerForms(player);
  const verb = saidVerb(player);
  const targetPlayer = target.kind === "player" ? await prisma.player.findUnique({ where: { id: target.id } }) : null;
  await spendPlayerStamina(bot, player.id, "GREET", chatId);
  await prisma.player.updateMany({ where: { id: player.id }, data: { greetings: { increment: 1 } } });
  if (targetPlayer) {
    await bot.api.sendMessage(
      targetPlayer.telegramId,
      `${escapeHtml(actorForms.nominative)} ${verb} вам:\n${quoteBlock(greeting)}`,
      { parse_mode: "HTML" },
    );
    await rememberPlayerReplyTarget({ playerId: targetPlayer.id, speakerName: actorForms.nominative, speakerPlayerId: player.id, locationId: player.currentLocationId });
  }
  await notifyLocationExcept(
    bot,
    player.currentLocationId,
    [player.id, targetPlayer?.id].filter((id): id is number => Boolean(id)),
    `${escapeHtml(actorForms.nominative)} ${verb} ${escapeHtml(target.forms.dative)}:\n${quoteBlock(greeting)}`,
    { parseMode: "HTML" },
  );
  await setActionStatus(action, "DONE");
  await logEvent("GREET", `${actorForms.nominative} ${verb} ${target.forms.dative}`, greeting, player.currentLocationId);
  if (chatId) await bot.api.sendMessage(chatId, `Ви сказали ${escapeHtml(target.forms.dative)}:\n${quoteBlock(greeting)}`, { parse_mode: "HTML" });
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
  const creature = await prisma.creature.findFirst({
    where: { id: target.id, locationId: player.currentLocationId, isAlive: false, isGone: false, isHidden: false, age: "CORPSE" },
    include: { species: true },
  });
  if (!creature) {
    await setActionStatus(action, "FAILED");
    if (chatId) await bot.api.sendMessage(chatId, "Труп уже не підходить для освіжування.");
    return;
  }
  await spendPlayerStamina(bot, player.id, "FRESHEN", chatId);
  let meat: Awaited<ReturnType<typeof freshenCorpseForMeat>>;
  try {
    meat = await freshenCorpseForMeat({
      playerId: player.id,
      creatureId: creature.id,
      locationId: player.currentLocationId,
      speciesKey: creature.species.key,
    });
  } catch (error) {
    await setActionStatus(action, "FAILED");
    if (chatId) await bot.api.sendMessage(chatId, error instanceof Error ? error.message : "Труп уже не підходить для освіжування.");
    return;
  }
  await setActionStatus(action, "DONE");
  await logEvent("PLAYER_ACTION", "Player freshened corpse", `${target.kind}:${target.id}; meat=${meat.amount}`, player.currentLocationId);
  if (chatId) await bot.api.sendMessage(chatId, `🔪 Ви освіжували ${target.forms.accusative} й отримали ${meat.resourceName} ×${meat.amount}.`);
}

async function completeCreatureAttack(bot: Bot, action: WorldAction) {
  const payload = payloadOf<SocialPayload>(action);
  const attacker = action.creatureId ? await prisma.creature.findUnique({ where: { id: action.creatureId }, include: { species: true } }) : null;
  if (!attacker || !attacker.isAlive || attacker.isGone || payload.targetType !== "creature") return void (await setActionStatus(action, "FAILED"));

  const target = await prisma.creature.findFirst({ where: { id: payload.targetId, locationId: attacker.locationId, isAlive: true, isGone: false }, include: { species: true } });
  if (!target || target.id === attacker.id) return void (await setActionStatus(action, "FAILED"));

  const damage = Math.max(1, attacker.species.strength + Math.floor(Math.random() * 3));
  const nextHp = target.hp - damage;
  const foodValue = preyFoodValue(target);
  await spendCreatureStamina(attacker, actionCost("ATTACK"));
  await markRecentAttackDanger(attacker.locationId);
  await prisma.creature.updateMany({ where: { id: attacker.id }, data: { attackAttempts: { increment: 1 } } });

  if (nextHp <= 0) {
    const hunter = isHunterCreature(attacker);
    await prisma.creature.updateMany({
      where: { id: target.id },
      data: {
        hp: 0,
        isAlive: false,
        age: "CORPSE",
        diedAtTick: null,
        corpseDecayTicksLeft: target.species.corpseDecayTicks,
        activity: "RESTING",
        isHidden: hunter ? true : undefined,
        currentAction: hunter ? hunterClaimedCorpseAction(attacker.id) : `убито хижаком: ${attacker.species.key}`,
      },
    });
    await interruptActorActions({ actorType: "CREATURE", creatureId: target.id }, "істоту вбито", true);
    await prisma.creature.updateMany({
      where: { id: attacker.id },
      data: {
        hunger: hunter ? attacker.hunger : Math.max(0, attacker.hunger - foodValue),
        activity: "FIGHTING",
        currentAction: hunter ? `вполював ${target.species.name} і несе здобич` : `убив ${target.species.name}`,
        successfulAttacks: { increment: 1 },
        kills: { increment: 1 },
      },
    });
    await triggerHerbivorePanic(attacker.locationId, target.id, "лякається хижака й крові");
    if (hunter) {
      await notifyLocation(bot, attacker.locationId, -1, `${attacker.name ?? "Мисливець"} збиває ${target.species.name} і підбирає здобич для падального рову.`);
      await logEvent("NPC_ACTION", "Hunter claimed prey", `${attacker.id} -> ${target.species.key} #${target.id}`, attacker.locationId);
    } else {
      await notifyLocation(bot, attacker.locationId, -1, `Щось кидається на здобич. За мить ${target.species.name} падає нерухомо.`);
      await logEvent("NPC_ACTION", "Creature killed prey", `${attacker.species.key} #${attacker.id} -> ${target.species.key} #${target.id}; food=${foodValue}`, attacker.locationId);
    }
    await recordAttackKillSource({ locationId: attacker.locationId, attackerCreatureId: attacker.id, victimCreatureId: target.id });
  } else {
    await prisma.creature.updateMany({ where: { id: target.id }, data: { hp: nextHp, currentAction: "поранено" } });
    await prisma.creature.updateMany({ where: { id: attacker.id }, data: { activity: "FIGHTING", currentAction: `атакує ${target.species.name}`, successfulAttacks: { increment: 1 } } });
    await notifyLocation(bot, attacker.locationId, -1, `Щось нападає на ${target.species.name}.`);
    await logEvent("NPC_ACTION", "Creature attacked prey", `${attacker.id} -> ${target.id}; damage=${damage}`, attacker.locationId);
  }

  await setActionStatus(action, "DONE");
}

function preyFoodValue(target: any) {
  if (target.species.key === "mouse") return 1;
  if (target.species.key === "rabbit") {
    if (target.age === "CHILD") return 2;
    if (target.age === "OLD") return 3;
    return 4;
  }
  return Math.max(1, Math.round((target.species.baseHp ?? target.maxHp ?? 1) / 3));
}

async function completeAttack(bot: Bot, action: WorldAction) {
  if (action.actorType === "CREATURE") return completeCreatureAttack(bot, action);

  const payload = payloadOf<SocialPayload>(action);
  const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
  const chatId = chatIdFromAction(action);
  if (!player || !player.currentLocationId || action.actorType !== "PLAYER") return void (await setActionStatus(action, "FAILED"));
  const target = await resolveTarget(payload.targetType, payload.targetId, player.currentLocationId);
  if (!target || !target.canAttack) {
    await setActionStatus(action, "FAILED");
    if (chatId) {
      const message = !target
        ? "Цілі вже немає поруч. Можна роздивитися місцину ще раз."
        : target.isCorpse
          ? "Це вже труп."
          : "Бій із хижаками й іншими персонажами ще не реалізований.";
      await bot.api.sendMessage(chatId, message, !target ? { reply_markup: buildExamineLocationKeyboard() } : undefined);
    }
    return;
  }

  const creature = await prisma.creature.findFirst({ where: { id: target.id, locationId: player.currentLocationId, isAlive: true, isGone: false }, include: { species: true } });
  if (!creature) {
    await setActionStatus(action, "FAILED");
    if (chatId) await bot.api.sendMessage(chatId, "Цілі вже немає поруч. Можна роздивитися місцину ще раз.", { reply_markup: buildExamineLocationKeyboard() });
    return;
  }

  await spendPlayerStamina(bot, player.id, "ATTACK", chatId);
  await markRecentAttackDanger(player.currentLocationId);
  await prisma.creature.updateMany({ where: { id: creature.id }, data: { hp: 0, isAlive: false, age: "CORPSE", diedAtTick: null, corpseDecayTicksLeft: creature.species.corpseDecayTicks, activity: "RESTING", currentAction: "лежить нерухомо" } });
  await interruptActorActions({ actorType: "CREATURE", creatureId: creature.id }, "істоту вбито", true);
  const updatedPlayer = await prisma.player.update({ where: { id: player.id }, data: { animalsKilled: { increment: 1 } }, select: { animalsKilled: true } });
  await triggerHerbivorePanic(player.currentLocationId, creature.id, "лякається нападу й людського запаху");
  await notifyLocation(bot, player.currentLocationId, player.id, `Хтось затоптує ${target.forms.accusative}. Труп лишається на землі.`);
  await setActionStatus(action, "DONE");
  await logEvent("PLAYER_ACTION", "Player killed animal", `${target.kind}:${target.id}`, player.currentLocationId);
  await recordAttackKillSource({ locationId: player.currentLocationId, attackerPlayerId: player.id, victimCreatureId: creature.id });
  if (chatId) {
    const corpseTarget = await resolveTarget("creature", creature.id, player.currentLocationId);
    await bot.api.sendMessage(
      chatId,
      `⚔️ Ви затоптали ${target.forms.accusative}. Труп лишився на землі.`,
      corpseTarget?.isCorpse ? { reply_markup: buildCorpseActionKeyboard(corpseTarget) } : undefined,
    );
    if (isAttackPracticeMilestone(updatedPlayer.animalsKilled)) noteKnownMessage(await bot.api.sendMessage(chatId, ATTACK_PRACTICE_GROWTH_MESSAGE, { parse_mode: "HTML" }));
  }
}

async function completeSay(bot: Bot, action: WorldAction) {
  const payload = payloadOf<SayPayload>(action);
  const text = String(payload.text ?? "").slice(0, 300);
  if (!text) return void (await setActionStatus(action, "FAILED"));

  if (action.actorType === "PLAYER") {
    const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
    const chatId = chatIdFromAction(action);
    if (!player || !player.currentLocationId) return void (await setActionStatus(action, "FAILED"));
    const targetDative = payload.targetDative || payload.targetName;
    const actorForms = playerForms(player);
    const verb = saidVerb(player);
    if (payload.mode === "whisper") {
      if (payload.targetType !== "player" || !payload.targetId) {
        if (chatId) await bot.api.sendMessage(chatId, "Шепіт зараз можна спрямувати тільки персонажу поруч.");
        await setActionStatus(action, "FAILED");
        return;
      }

      const targetPlayer = await prisma.player.findFirst({ where: { id: payload.targetId, currentLocationId: player.currentLocationId } });
      if (!targetPlayer) {
        if (chatId) await bot.api.sendMessage(chatId, "Того, кому ви шепотіли, вже немає поруч.");
        await setActionStatus(action, "FAILED");
        return;
      }

      const targetForms = playerForms(targetPlayer);
      await spendPlayerStamina(bot, player.id, "SAY", chatId);
      await prisma.player.updateMany({ where: { id: player.id }, data: { says: { increment: 1 } } });
      await notifyLocationExcept(
        bot,
        player.currentLocationId,
        [player.id, targetPlayer.id],
        `${escapeHtml(actorForms.nominative)} шепоче ${escapeHtml(targetForms.dative)}.`,
        { parseMode: "HTML" },
      );
      await bot.api.sendMessage(
        targetPlayer.telegramId,
        `${escapeHtml(actorForms.nominative)} шепоче вам:\n${quoteBlock(text)}`,
        { parse_mode: "HTML", reply_markup: await buildMainReplyKeyboardForTelegramId(Number(targetPlayer.telegramId), false) },
      );
      await rememberPlayerReplyTarget({ playerId: targetPlayer.id, speakerName: actorForms.nominative, speakerPlayerId: player.id, locationId: player.currentLocationId });
      if (chatId) await bot.api.sendMessage(chatId, `Ви шепнули ${escapeHtml(targetForms.dative)}:\n${quoteBlock(text)}`, { parse_mode: "HTML" });
      await setActionStatus(action, "DONE");
      await logEvent("SAY", `${actorForms.nominative} шепоче ${targetForms.dative}`, "приватний шепіт", player.currentLocationId);
      return;
    }

    if (payload.mode === "shout") {
      await spendPlayerStamina(bot, player.id, "SAY", chatId);
      await spendPlayerStamina(bot, player.id, "TRACK", chatId);
      await prisma.player.updateMany({ where: { id: player.id }, data: { says: { increment: 1 } } });
      const location = await prisma.cellLocation.findUnique({ where: { id: player.currentLocationId }, select: { regionId: true } });
      const shoutVerb = shoutedVerb(player);
      if (location?.regionId) {
        await notifyRegionExcept(
          bot,
          location.regionId,
          [player.id],
          `${escapeHtml(actorForms.nominative)} ${shoutVerb} так, що голос котиться стежками:\n${quoteBlock(text)}`,
          { parseMode: "HTML" },
        );
      }
      await setActionStatus(action, "DONE");
      await logEvent("SAY", `${actorForms.nominative} ${shoutVerb}`, text, player.currentLocationId);
      if (chatId) await bot.api.sendMessage(chatId, `Ви гукнули:\n${quoteBlock(text)}`, { parse_mode: "HTML" });
      return;
    }

    if (payload.mode === "reply") {
      await spendPlayerStamina(bot, player.id, "SAY", chatId);
      await prisma.player.updateMany({ where: { id: player.id }, data: { says: { increment: 1 } } });
      const replyVerb = repliedVerb(player);
      const replyTargetPlayer = payload.targetType === "player" && payload.targetId
        ? await prisma.player.findUnique({ where: { id: payload.targetId } })
        : null;
      const replyTargetForms = replyTargetPlayer ? playerForms(replyTargetPlayer) : null;
      const replyTargetDative = replyTargetForms?.dative ?? targetDative;
      if (replyTargetPlayer && replyTargetPlayer.currentLocationId !== player.currentLocationId) {
        await bot.api.sendMessage(
          replyTargetPlayer.telegramId,
          `${escapeHtml(actorForms.nominative)} ${replyVerb} вам:\n${quoteBlock(text)}`,
          { parse_mode: "HTML", reply_markup: await buildMainReplyKeyboardForTelegramId(Number(replyTargetPlayer.telegramId), false) },
        );
      } else {
        await notifyLocationExcept(
          bot,
          player.currentLocationId,
          [player.id],
          replyTargetDative ? `${escapeHtml(actorForms.nominative)} ${replyVerb} ${escapeHtml(replyTargetDative)}:\n${quoteBlock(text)}` : `${escapeHtml(actorForms.nominative)} ${replyVerb}:\n${quoteBlock(text)}`,
          { parseMode: "HTML" },
        );
      }
      await setActionStatus(action, "DONE");
      await logEvent("SAY", `${actorForms.nominative} ${replyVerb}${replyTargetDative ? ` ${replyTargetDative}` : ""}`, text, player.currentLocationId);
      if (chatId) await bot.api.sendMessage(chatId, replyTargetDative ? `Ви відповіли ${escapeHtml(replyTargetDative)}:\n${quoteBlock(text)}` : `Ви відповіли:\n${quoteBlock(text)}`, { parse_mode: "HTML" });
      return;
    }

    await spendPlayerStamina(bot, player.id, "SAY", chatId);
    await prisma.player.updateMany({ where: { id: player.id }, data: { says: { increment: 1 } } });
    await notifyLocationExcept(
      bot,
      player.currentLocationId,
      [player.id],
      targetDative ? `${escapeHtml(actorForms.nominative)} ${verb} ${escapeHtml(targetDative)}:\n${quoteBlock(text)}` : `${escapeHtml(actorForms.nominative)} ${verb}:\n${quoteBlock(text)}`,
      { parseMode: "HTML" },
    );
    if (payload.targetType === "player" && payload.targetId) {
      const addressedPlayer = await prisma.player.findFirst({ where: { id: payload.targetId, currentLocationId: player.currentLocationId } });
      if (addressedPlayer) {
        await rememberPlayerReplyTarget({ playerId: addressedPlayer.id, speakerName: actorForms.nominative, speakerPlayerId: player.id, locationId: player.currentLocationId });
      }
    }
    await setActionStatus(action, "DONE");
    await logEvent("SAY", `${actorForms.nominative} ${verb}${targetDative ? ` ${targetDative}` : ""}`, text, player.currentLocationId);
    const dreamGateText = await canOpenDreamGateWithSpeech(player.id, text)
      ? await openDreamGate(player.id)
      : null;
    if (chatId) {
      await bot.api.sendMessage(chatId, targetDative ? `Ви сказали ${escapeHtml(targetDative)}:\n${quoteBlock(text)}` : `Ви сказали:\n${quoteBlock(text)}`, { parse_mode: "HTML" });
      if (dreamGateText) {
        await bot.api.sendMessage(chatId, dreamGateText, {
          reply_markup: await buildMainReplyKeyboardForTelegramId(Number(player.telegramId), false),
        });
        const comment = await tutorialGateSpeechComment(player);
        if (comment) await bot.api.sendMessage(chatId, `${comment.title}:\n${quoteBlock(comment.text)}`, { parse_mode: "HTML" });
      }
    }
    return;
  }

  const creature = action.creatureId ? await prisma.creature.findUnique({ where: { id: action.creatureId }, include: { species: true } }) : null;
  if (!creature || !creature.isAlive || creature.isGone) return void (await setActionStatus(action, "FAILED"));
  await prisma.creature.updateMany({ where: { id: creature.id }, data: { says: { increment: 1 }, activity: "SPEAKING", currentAction: "говорить" } });
  await notifyLocationExcept(
    bot,
    creature.locationId,
    [],
    `${escapeHtml(creature.name ?? creature.species.name)} промовляє:\n${quoteBlock(text)}`,
    { parseMode: "HTML" },
  );
  await setActionStatus(action, "DONE");
  await logEvent(creature.species.kind === "HUMAN" ? "SAY" : "NPC_SAY", `${creature.name ?? creature.species.name} промовляє`, text, creature.locationId);
}

async function completeTrack(bot: Bot, action: WorldAction) {
  const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
  const chatId = chatIdFromAction(action);
  if (!player || !player.currentLocationId || action.actorType !== "PLAYER") return void (await setActionStatus(action, "FAILED"));
  const detail = Boolean(payloadOf<{ detail?: boolean }>(action).detail);

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

  const cleanTrackLabel = (label: string) =>
    label
      .replace(/^сліди:\s*/i, "")
      .replace(/^слід:\s*/i, "")
      .replace(/^свіжий слід:\s*/i, "")
      .trim();
  const trackVerb = (label: string, verb: "arrived" | "left") => {
    const normalized = label.toLowerCase();
    const feminine = /[ая]$/.test(normalized) && !/(дитинча|звіря|лоша|щеня)$/.test(normalized);
    if (verb === "arrived") return feminine ? "прийшла" : "прийшов";
    return feminine ? "пішла" : "пішов";
  };

  const lines = tracks.map((track) => {
    const label = cleanTrackLabel(String(track.label ?? "хтось"));
    const direction = track.fromLocationId === player.currentLocationId
      ? `${trackVerb(label, "left")} на ${directionLabels[track.direction].toLowerCase()}`
      : `${trackVerb(label, "arrived")} ${FROM_DIRECTION_LABELS[track.direction] ?? "звідкись"}`;
    const age = detail ? ` — ${trackAgeText(track.createdAt, now)}` : "";
    return `- ${label} ${direction}${age}`;
  });

  const header = detail ? "👣 Ви уважніше роздивляєтеся сліди:" : "👣 Ви знаходите сліди:";
  await bot.api.sendMessage(chatId, `${header}\n${lines.join("\n")}`, detail ? undefined : { reply_markup: buildExamineTracksKeyboard() });
  const voiceComments = await tutorialTrackComments(player.currentLocationId, detail);
  for (const comment of voiceComments) {
    await bot.api.sendMessage(chatId, `${comment.title}:\n${quoteBlock(comment.text)}`, { parse_mode: "HTML" });
  }
}

async function completeSimple(bot: Bot, action: WorldAction) {
  if (action.type === "REST") {
    if (action.actorType === "PLAYER" && action.playerId) {
      const player = await prisma.player.findUnique({ where: { id: action.playerId } });
      const chatId = chatIdFromAction(action);
      if (player) {
        const location = player.currentLocationId
          ? await prisma.cellLocation.findUnique({ where: { id: player.currentLocationId }, select: { key: true } })
          : null;
        const isTutorialRestRoom = isTutorialFastRestLocationKey(location?.key);
        const max = await getPlayerRestStaminaCap(player.id);
        const hpMax = player.hpMax ?? BASE_HP;
        const payload = payloadOf<{ untilFull?: boolean }>(action);
        const staminaRegen = REST_STAMINA_REGEN_PER_INTERVAL * await getPlayerRestStaminaRegenMultiplier(player.id);
        const next = payload.untilFull ? max : Math.min(max, player.stamina + staminaRegen);
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
        if (isTutorialRestRoom && chatId) {
          const commentParts = [next >= max && player.stamina < max ? TUTORIAL_REST_FULL_COMMENT : TUTORIAL_REST_FAST_COMMENT];
          if (next > (player.staminaMax ?? BASE_STAMINA)) commentParts.push(TUTORIAL_REST_EXTRA_COMMENT);
          const comment = commentParts.join("\n\n");
          await logEvent("NPC_SAY", "Сонний жар потріскує", comment, player.currentLocationId ?? undefined);
          await bot.api.sendMessage(chatId, `Сонний жар потріскує:\n${quoteBlock(comment)}`, {
            parse_mode: "HTML",
            reply_markup: await buildMainReplyKeyboardForTelegramId(Number(player.telegramId), false),
          });
        }
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
  } else if (action.type === "WAIT" && action.actorType === "PLAYER" && action.playerId) {
    const player = await prisma.player.findUnique({ where: { id: action.playerId } });
    const chatId = chatIdFromAction(action);
    if (player?.currentLocationId && chatId) {
      const voiceComments = await tutorialWaitPaceComments(player);
      for (const comment of voiceComments) {
        await bot.api.sendMessage(chatId, `${comment.title}:\n${quoteBlock(comment.text)}`, { parse_mode: "HTML" });
      }
    }
  } else if (action.actorType === "CREATURE" && action.creatureId) {
    await prisma.creature.updateMany({ where: { id: action.creatureId }, data: { activity: "RESTING", currentAction: actionTitle(action) } });
  }

  await setActionStatus(action, "DONE");
}
