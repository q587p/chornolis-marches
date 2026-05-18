import { Bot } from "grammy";
import { Direction, FatigueState, Prisma, WorldAction, WorldActionType, WorldActorType } from "@prisma/client";
import { prisma } from "../db";
import {
  ACTION_QUEUE_POLL_MS,
  ACTION_BASE_DURATION_MS,
  BASE_STAMINA,
  MAX_QUEUED_ACTIONS_PER_ACTOR,
  MIN_ACTION_DURATION_MS,
  PASSIVE_STAMINA_REGEN_PER_INTERVAL,
  REST_STAMINA_REGEN_PER_INTERVAL,
  STAMINA_REGEN_INTERVAL_MS,
  TRACK_TTL_MS,
  VERY_TIRED_STAMINA,
  actionPriorityConfig,
  gatherConfig,
  playerStaminaCostConfig,
} from "../gameConfig";
import { setLastRuntimeError } from "../runtimeState";
import { directionLabels } from "../ui/labels";
import { buildActionQueueKeyboard, buildFatigueRestKeyboard, buildTargetListKeyboard, buildTrackKeyboard } from "../ui/keyboards";
import { creatureForms, playerForms, type NameForms } from "./grammar";
import { renderLocationBrief, renderLocationDetails } from "./locations";
import { notifyLocation } from "./notifications";
import { getStartLocationId } from "./players";
import { summonLisovykIfResourceDepleted } from "./resources";
import { logEvent } from "./worldEvents";

type ActorRef =
  | { actorType: "PLAYER"; playerId: number; creatureId?: never }
  | { actorType: "CREATURE"; creatureId: number; playerId?: never };

type MovePayload = { direction: Direction; reason?: string };
type GatherPayload = { resourceKey: "berries" | "mushrooms" | "herbs" };
type EatPayload = { resourceKey?: string };
type SayPayload = { text: string };
type SocialPayload = { targetType: "player" | "creature"; targetId: number; mode?: "known" | "mystery" };
type ActionPayload = Prisma.InputJsonObject;

type EnqueueInput = ActorRef & {
  type: WorldActionType;
  payload?: ActionPayload;
  durationMs: number;
  priority?: number;
  interruptCurrent?: boolean;
  interruptQueued?: boolean;
  interruptible?: boolean;
  note?: string;
  chatId?: number | string;
  messageId?: number;
};

type ResolvedTarget = {
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

function actorWhere(ref: ActorRef) {
  return ref.actorType === "PLAYER"
    ? { actorType: "PLAYER" as WorldActorType, playerId: ref.playerId }
    : { actorType: "CREATURE" as WorldActorType, creatureId: ref.creatureId };
}

function actorWhereFromAction(action: WorldAction) {
  return action.actorType === "PLAYER"
    ? { actorType: action.actorType, playerId: action.playerId }
    : { actorType: action.actorType, creatureId: action.creatureId };
}

function actorKey(action: Pick<WorldAction, "actorType" | "playerId" | "creatureId">) {
  return action.actorType === "PLAYER" ? `PLAYER:${action.playerId}` : `CREATURE:${action.creatureId}`;
}

function msToSeconds(ms: number) {
  return Math.max(1, Math.ceil(ms / 1000));
}

function payloadOf<T>(action: WorldAction): T {
  return (action.payload ?? {}) as unknown as T;
}

function formatSex(sex: string | null | undefined) {
  if (sex === "MALE") return "самець";
  if (sex === "FEMALE") return "самиця";
  return "невідомо";
}

function formatPercent(success: number, attempts: number) {
  if (!attempts) return "0%";
  return `${Math.round((success / attempts) * 100)}%`;
}

function actionPriority(type: WorldActionType) {
  return actionPriorityConfig[type] ?? 0;
}

function actionCost(type: WorldActionType) {
  return playerStaminaCostConfig[type] ?? 1;
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

function thresholdMessages(before: number, after: number, max: number, tookHp = false) {
  const messages: string[] = [];

  if (before >= 0 && after < 0) {
    messages.push("Ви відчуваєте втому. Наступні дії все ще можна планувати, але відновлення вже буде важливим.");
  }
  if (before > VERY_TIRED_STAMINA && after <= VERY_TIRED_STAMINA) {
    messages.push("Ви дуже втомлені. Вам дуже варто відпочити, інакше подальші дії забиратимуть здоров’я.");
  }
  if (tookHp) {
    messages.push("Виснаження боляче б’є по тілу: ви втрачаєте 1 здоров’я.");
  }
  if (before <= VERY_TIRED_STAMINA && after > VERY_TIRED_STAMINA) {
    messages.push("Ви трохи відновилися, але все ще втомлені.");
  }
  if (before < 0 && after >= 0) {
    messages.push("Ви відновилися, але ще трохи втомлені.");
  }
  if (before < max && after >= max) {
    messages.push("Ви відпочили і готові діяти далі!");
  }

  return messages;
}

function actionTitle(action: Pick<WorldAction, "type" | "payload" | "durationMs">) {
  if (action.type === "MOVE") {
    const payload = action.payload as unknown as MovePayload;
    const direction = payload.direction ? directionLabels[payload.direction].toLowerCase() : "невідомий напрямок";
    return `йдемо на ${direction}`;
  }

  if (action.type === "GATHER" || action.type === "GATHER_SPECIFIC") {
    const payload = action.payload as unknown as GatherPayload;
    const names: Record<GatherPayload["resourceKey"], string> = {
      berries: "ягоди",
      mushrooms: "гриби",
      herbs: "трави",
    };
    return `збираємо ${names[payload.resourceKey] ?? payload.resourceKey}`;
  }

  if (action.type === "EAT") return "їмо";
  if (action.type === "LOOK") return "придивляємось";
  if (action.type === "INSPECT") return "оглядаємо ціль";
  if (action.type === "GREET") return "вітаємось";
  if (action.type === "ATTACK") return "атакуємо";
  if (action.type === "FRESHEN") return "освіжуємо труп";
  if (action.type === "SAY") return "говоримо";
  if (action.type === "TRACK") return "вистежуємо";
  if (action.type === "REST") return "відпочиваємо";
  if (action.type === "SET_TRAP") return "ставимо пастку";
  if (action.type === "WAIT") return "чекаємо";

  return String(action.type).toLowerCase();
}

function formatPlayerStats(target: any) {
  return [
    `Пройдено локацій: ${target.steps}`,
    `Оглядів: ${target.looks}`,
    `Сказано фраз: ${target.says}`,
    `Привітань: ${target.greetings}`,
    `Спроб збору: ${target.gatherAttempts}`,
    `Вдалого збору: ${target.successfulGathers} (${formatPercent(target.successfulGathers, target.gatherAttempts)})`,
    `Зібрано ягід: ${target.berriesGathered}`,
    `Зібрано грибів: ${target.mushroomsGathered}`,
    `Зібрано трав: ${target.herbsGathered}`,
    `Убито тварин: ${target.animalsKilled}`,
  ].join("\n");
}

function orderedPosition(index: number) {
  return index + 1;
}

function targetIntro(target: ResolvedTarget, isMystery: boolean) {
  if (!isMystery) return `👁 Ви придивляєтесь до ${target.forms.genitive}.`;
  if (target.kind === "creature" && target.isCorpse) return "👁 Ви придивляєтесь до того, що лежить нерухомо.";
  if (target.kind === "creature" && target.isAnimal) return "👁 Ви придивляєтесь до цієї істоти.";
  return "👁 Ви придивляєтесь до цієї постаті.";
}

export function movementDurationMs(travelCost = 1, _stamina = BASE_STAMINA) {
  return Math.max(MIN_ACTION_DURATION_MS, actionCost("MOVE") * ACTION_BASE_DURATION_MS * Math.max(1, travelCost));
}

export function gatherDurationMs(_resourceKey: keyof typeof gatherConfig, _stamina = BASE_STAMINA) {
  return actionDurationMs("GATHER_SPECIFIC");
}

export function actionDurationMs(type: WorldActionType, _stamina = BASE_STAMINA) {
  return Math.max(MIN_ACTION_DURATION_MS, actionCost(type) * ACTION_BASE_DURATION_MS);
}

export function actionStaminaCost(type: WorldActionType) {
  return actionCost(type);
}

export async function interruptActorActions(ref: ActorRef, reason = "перервано", includeQueued = true) {
  const where = actorWhere(ref);
  return prisma.worldAction.updateMany({
    where: {
      ...where,
      status: includeQueued ? { in: ["QUEUED", "RUNNING"] } : "RUNNING",
      interruptible: true,
    },
    data: { status: "CANCELLED", note: reason },
  });
}

export async function enqueueWorldAction(input: EnqueueInput) {
  const where = actorWhere(input);
  const priority = input.priority ?? actionPriority(input.type);

  if (input.interruptCurrent) await interruptActorActions(input, `перервано дією ${input.type}`, Boolean(input.interruptQueued));
  else if (input.interruptQueued) {
    await prisma.worldAction.updateMany({
      where: { ...where, status: "QUEUED", priority: { lt: priority }, interruptible: true },
      data: { status: "CANCELLED", note: `витіснено дією ${input.type}` },
    });
  }

  const activeCount = await prisma.worldAction.count({ where: { ...where, status: { in: ["QUEUED", "RUNNING"] } } });

  if (activeCount >= MAX_QUEUED_ACTIONS_PER_ACTOR) {
    throw new Error(`У черзі вже ${MAX_QUEUED_ACTIONS_PER_ACTOR} дій. Спершу дочекайся виконання або очисти чергу.`);
  }

  const last = await prisma.worldAction.findFirst({
    where: { ...where, status: { in: ["QUEUED", "RUNNING"] } },
    orderBy: { position: "desc" },
  });

  return prisma.worldAction.create({
    data: {
      ...where,
      type: input.type,
      priority,
      interruptible: input.interruptible ?? true,
      note: input.note,
      payload: (input.payload ?? {}) as Prisma.InputJsonValue,
      durationMs: input.durationMs,
      position: (last?.position ?? 0) + 1,
      chatId: input.chatId === undefined ? undefined : String(input.chatId),
      messageId: input.messageId,
    },
  });
}

type PlayerActionRequest = {
  playerId: number;
  type: WorldActionType;
  payload?: ActionPayload;
  durationMs: number;
  priority?: number;
  interruptCurrent?: boolean;
  interruptQueued?: boolean;
  interruptible?: boolean;
  note?: string;
  chatId?: number | string;
  messageId?: number;
};

type PlayerActionSubmitResult = {
  action: WorldAction;
  mode: "queued" | "immediate";
  wasResting: boolean;
  shouldPromptRestChoice: boolean;
  remainingToMax: number;
};

export async function enqueuePlayerAction(input: PlayerActionRequest): Promise<PlayerActionSubmitResult> {
  const player = await prisma.player.findUnique({ where: { id: input.playerId } });
  const queuedBefore = await prisma.worldAction.count({
    where: { actorType: "PLAYER", playerId: input.playerId, status: { in: ["QUEUED", "RUNNING"] } },
  });
  const wasResting = Boolean(player?.isResting);
  const action = await enqueueWorldAction({ ...input, actorType: "PLAYER" });

  return {
    action,
    mode: "queued",
    wasResting,
    shouldPromptRestChoice: wasResting && queuedBefore === 0,
    remainingToMax: player ? Math.max(0, (player.staminaMax ?? BASE_STAMINA) - player.stamina) : 0,
  };
}

export async function performOrQueuePlayerAction(bot: Bot, input: PlayerActionRequest): Promise<PlayerActionSubmitResult> {
  const player = await prisma.player.findUnique({ where: { id: input.playerId } });
  if (!player) throw new Error("Персонажа не знайдено.");

  const wasResting = Boolean(player.isResting);
  const remainingToMax = Math.max(0, (player.staminaMax ?? BASE_STAMINA) - player.stamina);
  const normalizedInput = { ...input };

  if (normalizedInput.interruptCurrent) {
    await interruptActorActions({ actorType: "PLAYER", playerId: input.playerId }, `перервано дією ${input.type}`, Boolean(input.interruptQueued));
    normalizedInput.interruptCurrent = false;
    normalizedInput.interruptQueued = false;
  }

  const activeCount = await prisma.worldAction.count({
    where: { actorType: "PLAYER", playerId: input.playerId, status: { in: ["QUEUED", "RUNNING"] } },
  });

  if (!player.isResting && player.stamina >= 0 && activeCount === 0) {
    const priority = normalizedInput.priority ?? actionPriority(normalizedInput.type);
    const action = await prisma.worldAction.create({
      data: {
        actorType: "PLAYER",
        playerId: input.playerId,
        type: normalizedInput.type,
        status: "RUNNING",
        priority,
        interruptible: normalizedInput.interruptible ?? true,
        note: normalizedInput.note,
        payload: (normalizedInput.payload ?? {}) as Prisma.InputJsonValue,
        durationMs: 0,
        position: 1,
        startedAt: new Date(),
        executeAt: null,
        chatId: normalizedInput.chatId === undefined ? undefined : String(normalizedInput.chatId),
        messageId: normalizedInput.messageId,
      },
    });

    await completeAction(bot, action);

    return {
      action,
      mode: "immediate",
      wasResting,
      shouldPromptRestChoice: false,
      remainingToMax,
    };
  }

  const result = await enqueuePlayerAction(normalizedInput);
  return { ...result, wasResting, shouldPromptRestChoice: wasResting && activeCount === 0, remainingToMax };
}

export async function queuePlayerRest(playerId: number, chatId?: number | string) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return null;
  const max = player.staminaMax ?? BASE_STAMINA;
  const remaining = Math.max(0, max - player.stamina);
  const intervals = Math.max(1, Math.ceil(remaining / REST_STAMINA_REGEN_PER_INTERVAL));
  return enqueuePlayerAction({
    playerId,
    type: "REST",
    payload: { untilFull: true },
    durationMs: intervals * STAMINA_REGEN_INTERVAL_MS,
    chatId,
    interruptible: true,
    note: "відпочинок у черзі",
  });
}

export async function startPlayerRest(playerId: number) {
  await prisma.worldAction.updateMany({
    where: { actorType: "PLAYER", playerId, status: { in: ["QUEUED", "RUNNING"] } },
    data: { status: "CANCELLED", note: "перервано відпочинком" },
  });
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return null;
  const max = player.staminaMax ?? BASE_STAMINA;
  if (player.stamina >= max && !player.isResting) return player;
  return prisma.player.update({
    where: { id: playerId },
    data: {
      isResting: true,
      fatigueState: fatigueStateFor(player.stamina, max),
      lastStaminaRegenAt: new Date(),
    },
  });
}

export async function stopPlayerRest(playerId: number) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return null;
  return prisma.player.update({
    where: { id: playerId },
    data: {
      isResting: false,
      fatigueState: fatigueStateFor(player.stamina, player.staminaMax ?? BASE_STAMINA),
      lastStaminaRegenAt: new Date(),
    },
  });
}

export async function playerRestStatusText(playerId: number) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return "Персонажа не знайдено.";
  const max = player.staminaMax ?? BASE_STAMINA;
  const remaining = Math.max(0, max - player.stamina);
  const state = fatigueLabel(fatigueStateFor(player.stamina, max), player.isResting);
  if (remaining <= 0) return `Ви вже відпочивші й готові до дій. Витривалість: ${player.stamina}/${max}.`;
  const minutes = Math.ceil(remaining / REST_STAMINA_REGEN_PER_INTERVAL);
  return `Ви відпочиваєте. Стан: ${state}. Витривалість: ${player.stamina}/${max}. До повного відновлення приблизно: ${minutes} хв.`;
}

export async function enqueueCreatureAction(input: {
  creatureId: number;
  type: WorldActionType;
  payload?: ActionPayload;
  durationMs: number;
  priority?: number;
  interruptCurrent?: boolean;
  interruptQueued?: boolean;
  interruptible?: boolean;
  note?: string;
  chatId?: number | string;
  messageId?: number;
}) {
  return enqueueWorldAction({ ...input, actorType: "CREATURE" });
}

export async function hasActiveCreatureActions(creatureId: number) {
  const count = await prisma.worldAction.count({
    where: { actorType: "CREATURE", creatureId, status: { in: ["QUEUED", "RUNNING"] } },
  });
  return count > 0;
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
      return `▶️ ${actionTitle(action)} — виконується, ${msToSeconds(leftMs)} с`;
    }

    const prefix = queueIndex === 0 ? "⏳" : `⏳ ${orderedPosition(queueIndex)}.`;
    return `${prefix} Потім ${actionTitle(action)}`;
  }));

  return `План дій:\n${lines.join("\n")}`;
}


export async function accelerateFirstQueuedPlayerAction(playerId: number) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player || player.stamina < 0) return false;

  const first = await prisma.worldAction.findFirst({
    where: { actorType: "PLAYER", playerId, status: "QUEUED" },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });
  if (!first) return false;

  await prisma.worldAction.update({
    where: { id: first.id },
    data: { status: "RUNNING", durationMs: 0, startedAt: new Date(), executeAt: new Date() },
  });

  return true;
}

export async function hasPlayerActionQueueControls(playerId: number) {
  const count = await prisma.worldAction.count({
    where: { actorType: "PLAYER", playerId, status: { in: ["QUEUED", "RUNNING"] } },
  });
  return count > 0;
}

export async function clearQueuedPlayerActions(playerId: number) {
  return prisma.worldAction.updateMany({
    where: { actorType: "PLAYER", playerId, status: { in: ["QUEUED", "RUNNING"] } },
    data: { status: "CANCELLED", note: "очищено гравцем" },
  });
}

export async function cancelCurrentPlayerAction(playerId: number) {
  return prisma.worldAction.updateMany({
    where: { actorType: "PLAYER", playerId, status: "RUNNING", interruptible: true },
    data: { status: "CANCELLED", note: "скасовано гравцем" },
  });
}

async function resolveTarget(type: string, id: number, locationId: number): Promise<ResolvedTarget | null> {
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
      inspect: `Ви бачите ${forms.accusative}.\n\nHP: ${target.hp}\nВитривалість: ${target.stamina}\nГолод: ${target.hunger}\n\nСтатистика:\n${formatPlayerStats(target)}`,
    };
  }

  if (type === "creature") {
    const target = await prisma.creature.findFirst({ where: { id, locationId, isGone: false }, include: { species: true } });
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
        ? `Це ${forms.nominative}.\n\nСтан: ${target.isAlive ? "жива" : "мертва"}\nHP: ${target.hp}\nСтать: ${formatSex(target.sex)}\nВік: ${target.age}\nТіків віку: ${target.ageTicks}\nДія: ${target.currentAction ?? "невідомо"}`
        : `${forms.nominative}\n\nСтан: ${target.isAlive ? "живий/активний" : "неактивний"}\nHP: ${target.hp}\nДія: ${target.currentAction ?? "невідомо"}\n\nСтатистика:\nПройдено локацій: ${target.steps}\nОглядів: ${target.looks}\nСказано фраз: ${target.says}\nСпроб збору: ${target.gatherAttempts}\nВдалого збору: ${target.successfulGathers}`,
    };
  }

  return null;
}

async function startNextQueuedAction(action: WorldAction) {
  await prisma.worldAction.update({
    where: { id: action.id },
    data: { status: "RUNNING", startedAt: new Date(), executeAt: new Date(Date.now() + action.durationMs) },
  });

  if (action.actorType === "PLAYER" && action.playerId && action.type === "REST") {
    await prisma.player.update({
      where: { id: action.playerId },
      data: { isResting: true, lastStaminaRegenAt: new Date() },
    });
  }

  if (action.actorType === "CREATURE" && action.creatureId) {
    const activity = action.type === "MOVE" ? "MOVING" : action.type === "GATHER" || action.type === "GATHER_SPECIFIC" ? "GATHERING" : action.type === "LOOK" || action.type === "INSPECT" || action.type === "TRACK" ? "LOOKING" : action.type === "ATTACK" ? "FIGHTING" : action.type === "SAY" || action.type === "GREET" ? "SPEAKING" : action.type === "REST" ? "RESTING" : undefined;
    await prisma.creature.update({ where: { id: action.creatureId }, data: { activity, currentAction: actionTitle(action) } });
  }
}

async function completeAction(bot: Bot, action: WorldAction) {
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
  await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } });
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

async function spendPlayerStamina(bot: Bot, playerId: number, type: WorldActionType, chatId?: number | string) {
  const cost = playerStaminaCostConfig[type] ?? 0;
  if (cost <= 0) return;
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return;

  const max = player.staminaMax ?? BASE_STAMINA;
  const before = player.stamina;
  const after = before - cost;
  const tookHp = before <= VERY_TIRED_STAMINA;
  const nextHp = tookHp ? Math.max(0, player.hp - 1) : player.hp;
  const nextState = fatigueStateFor(after, max);

  await prisma.player.update({
    where: { id: playerId },
    data: {
      stamina: after,
      hp: nextHp,
      fatigueState: nextState,
      isResting: false,
      lastActionAt: new Date(),
      lastStaminaRegenAt: new Date(),
      hunger: { increment: cost > 1 ? 1 : 0 },
    },
  });

  const messages = thresholdMessages(before, after, max, tookHp);
  if (chatId && messages.length) {
    for (const message of messages) {
      const shouldSuggestRest = message.includes("втом") || message.includes("Виснаження");
      await bot.api.sendMessage(chatId, message, shouldSuggestRest ? { reply_markup: buildFatigueRestKeyboard() } : undefined);
    }
  }
}

async function spendCreatureStamina(creature: { id: number; hp?: number; stamina: number; staminaMax?: number | null }, cost = 1) {
  const max = creature.staminaMax ?? BASE_STAMINA;
  const after = creature.stamina - cost;
  const tookHp = creature.stamina <= VERY_TIRED_STAMINA;
  const nextHp = tookHp && creature.hp !== undefined ? Math.max(0, creature.hp - 1) : creature.hp;
  await prisma.creature.update({
    where: { id: creature.id },
    data: {
      stamina: after,
      hp: nextHp,
      fatigueState: fatigueStateFor(after, max),
      lastStaminaRegenAt: new Date(),
      currentAction: tookHp ? "виснажується" : undefined,
    },
  });
}

async function completeMove(bot: Bot, action: WorldAction) {
  const payload = payloadOf<MovePayload>(action);

  if (action.actorType === "PLAYER") {
    const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
    const chatId = chatIdFromAction(action);
    if (!player) return void (await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } }));

    const currentLocationId = player.currentLocationId ?? (await getStartLocationId());
    const exit = await prisma.locationExit.findUnique({ where: { fromLocationId_direction: { fromLocationId: currentLocationId, direction: payload.direction } } });
    if (!exit || exit.isHidden) {
      await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } });
      if (chatId) await bot.api.sendMessage(chatId, "Шлях, яким ви збиралися йти, більше не видно.");
      await logEvent("ERROR", "Queued player move failed", payload.direction, currentLocationId);
      return;
    }

    await notifyLocation(bot, currentLocationId, player.id, "Хтось пішов звідси.", buildTrackKeyboard());
    await createTrack({ actorType: "PLAYER", playerId: player.id }, currentLocationId, exit.toLocationId, payload.direction, "людський слід");
    await spendPlayerStamina(bot, player.id, "MOVE", chatId);
    await prisma.player.update({ where: { id: player.id }, data: { currentLocationId: exit.toLocationId, steps: { increment: 1 } } });
    await notifyLocation(bot, exit.toLocationId, player.id, `Хтось зайшов сюди ${FROM_DIRECTION_LABELS[payload.direction] ?? "звідкись"}.`, buildTargetListKeyboard([{ type: "player", id: player.id, label: "Хтось", canGreet: true }]));
    await prisma.worldAction.update({ where: { id: action.id }, data: { status: "DONE" } });
    await logEvent("MOVE", "Player queued move completed", payload.direction, exit.toLocationId);

    if (chatId) {
      const view = await renderLocationBrief(exit.toLocationId, player.id);
      await bot.api.sendMessage(chatId, `Ви дійшли: ${directionLabels[payload.direction]}`);
      await bot.api.sendMessage(chatId, view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
    }
    return;
  }

  const creature = action.creatureId ? await prisma.creature.findUnique({ where: { id: action.creatureId }, include: { species: true } }) : null;
  if (!creature || !creature.isAlive || creature.isGone) return void (await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } }));

  const exit = await prisma.locationExit.findUnique({ where: { fromLocationId_direction: { fromLocationId: creature.locationId, direction: payload.direction } } });
  if (!exit || exit.isHidden) return void (await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } }));

  const isAnimal = creature.species.kind === "ANIMAL";
  const label = isAnimal ? "Щось" : "Хтось";
  const name = creature.name ?? creature.species.name;
  await notifyLocation(bot, creature.locationId, -1, isAnimal ? "Щось пішло звідси." : `${name} пішов звідси.`, buildTrackKeyboard());
  await createTrack({ actorType: "CREATURE", creatureId: creature.id }, creature.locationId, exit.toLocationId, payload.direction, isAnimal ? `сліди: ${creature.species.name}` : `слід: ${name}`);
  await spendCreatureStamina(creature, actionCost("MOVE"));
  await prisma.creature.update({ where: { id: creature.id }, data: { locationId: exit.toLocationId, activity: "MOVING", currentAction: payload.reason ?? actionTitle(action), steps: { increment: 1 }, hunger: { increment: 1 } } });
  await notifyLocation(bot, exit.toLocationId, -1, `Хтось зайшов сюди ${FROM_DIRECTION_LABELS[payload.direction] ?? "звідкись"}.`, buildTargetListKeyboard([{ type: "creature", id: creature.id, label, canGreet: !isAnimal }]));
  await prisma.worldAction.update({ where: { id: action.id }, data: { status: "DONE" } });
  await logEvent("NPC_MOVE", "Creature queued move completed", `${creature.id}:${payload.direction}`, exit.toLocationId);
}

async function completeGather(bot: Bot, action: WorldAction) {
  const payload = payloadOf<GatherPayload>(action);
  const cfg = gatherConfig[payload.resourceKey];
  const chatId = chatIdFromAction(action);
  const isPlayer = action.actorType === "PLAYER";
  const actor = isPlayer
    ? action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null
    : action.creatureId ? await prisma.creature.findUnique({ where: { id: action.creatureId }, include: { species: true } }) : null;

  if (!actor || (isPlayer && !(actor as any).currentLocationId) || !cfg) {
    await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } });
    return;
  }

  const locationId = isPlayer ? (actor as any).currentLocationId : (actor as any).locationId;
  const durationSeconds = msToSeconds(action.durationMs);
  const resource = await prisma.resourceNode.findFirst({ where: { locationId, resourceType: { key: payload.resourceKey }, amount: { gt: 0 } }, include: { resourceType: true, location: true } });

  if (isPlayer) {
    await spendPlayerStamina(bot, (actor as any).id, action.type, chatId);
    await prisma.player.update({ where: { id: (actor as any).id }, data: { gatherAttempts: { increment: 1 } } });
  } else {
    await spendCreatureStamina(actor as any, actionCost(action.type));
    await prisma.creature.update({ where: { id: (actor as any).id }, data: { gatherAttempts: { increment: 1 }, activity: "GATHERING", currentAction: `збирає ${payload.resourceKey}` } });
  }

  if (!resource || Math.random() > cfg.chance) {
    await prisma.worldAction.update({ where: { id: action.id }, data: { status: "DONE" } });
    if (chatId) await bot.api.sendMessage(chatId, `Ви витратили час на пошуки (${durationSeconds} с), але нічого корисного не знайшли.`);
    await logEvent(isPlayer ? "GATHER" : "NPC_ACTION", "Queued gather failed", payload.resourceKey, locationId);
    return;
  }

  const found = Math.min(resource.amount, isPlayer ? Math.floor(Math.random() * 3) + 1 : 1);
  const nextAmount = resource.amount - found;
  await prisma.resourceNode.update({ where: { id: resource.id }, data: { amount: nextAmount } });

  if (isPlayer) {
    const statFieldMap = { berries: "berriesGathered", mushrooms: "mushroomsGathered", herbs: "herbsGathered" } as const;
    await prisma.playerResource.upsert({
      where: { playerId_resourceTypeId: { playerId: (actor as any).id, resourceTypeId: resource.resourceTypeId } },
      update: { amount: { increment: found } },
      create: { playerId: (actor as any).id, resourceTypeId: resource.resourceTypeId, amount: found },
    });
    await prisma.player.update({ where: { id: (actor as any).id }, data: { successfulGathers: { increment: 1 }, [statFieldMap[payload.resourceKey]]: { increment: found } } });
    if (chatId) await bot.api.sendMessage(chatId, `Ви витратили час на пошуки (${durationSeconds} с) і знайшли: ${resource.resourceType.name} ×${found}.`);
  } else {
    await prisma.creature.update({ where: { id: (actor as any).id }, data: { successfulGathers: { increment: 1 }, currentAction: `зібрав ${resource.resourceType.name} ×${found}` } });
  }

  await prisma.worldAction.update({ where: { id: action.id }, data: { status: "DONE" } });
  await logEvent(isPlayer ? "GATHER" : "NPC_ACTION", "Queued gather succeeded", `${resource.resourceType.name} ×${found}`, locationId);

  if (resource.amount > 0 && nextAmount <= 0) await summonLisovykIfResourceDepleted(bot, resource.resourceType.name, resource.location.regionId);
}

async function completeEat(action: WorldAction) {
  if (action.actorType !== "CREATURE" || !action.creatureId) return void (await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } }));
  const creature = await prisma.creature.findUnique({ where: { id: action.creatureId }, include: { species: true } });
  if (!creature || !creature.isAlive || creature.isGone) return void (await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } }));

  const resource = await prisma.resourceNode.findFirst({ where: { locationId: creature.locationId, amount: { gt: 0 }, resourceType: { key: { in: ["berries", "herbs", "mushrooms"] } } }, include: { resourceType: true } });
  if (resource && creature.species.diet !== "CARNIVORE") {
    await prisma.resourceNode.update({ where: { id: resource.id }, data: { amount: { decrement: 1 } } });
    await prisma.creature.update({ where: { id: creature.id }, data: { hunger: Math.max(0, creature.hunger - 3), stamina: Math.min(20, creature.stamina + 1), activity: "RESTING", currentAction: `їсть ${resource.resourceType.name}` } });
  } else {
    await prisma.creature.update({ where: { id: creature.id }, data: { hunger: { increment: 1 }, activity: "LOOKING", currentAction: "шукає їжу" } });
  }
  await prisma.worldAction.update({ where: { id: action.id }, data: { status: "DONE" } });
}

async function completeLook(bot: Bot, action: WorldAction) {
  if (action.actorType === "PLAYER") {
    const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
    const chatId = chatIdFromAction(action);
    if (!player) return void (await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } }));
    const locationId = player.currentLocationId ?? (await getStartLocationId());
    await spendPlayerStamina(bot, player.id, "LOOK", chatId);
    await prisma.player.update({ where: { id: player.id }, data: { currentLocationId: locationId, looks: { increment: 1 } } });
    await prisma.worldAction.update({ where: { id: action.id }, data: { status: "DONE" } });
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

  if (action.creatureId) await prisma.creature.update({ where: { id: action.creatureId }, data: { looks: { increment: 1 }, activity: "LOOKING", currentAction: "придивляється" } });
  await prisma.worldAction.update({ where: { id: action.id }, data: { status: "DONE" } });
}

async function completeInspect(bot: Bot, action: WorldAction) {
  const payload = payloadOf<SocialPayload>(action);
  const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
  const chatId = chatIdFromAction(action);
  if (!player || !player.currentLocationId || action.actorType !== "PLAYER") return void (await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } }));
  const target = await resolveTarget(payload.targetType, payload.targetId, player.currentLocationId);
  await prisma.worldAction.update({ where: { id: action.id }, data: { status: target ? "DONE" : "FAILED" } });
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
  if (!player || !player.currentLocationId || action.actorType !== "PLAYER") return void (await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } }));
  const target = await resolveTarget(payload.targetType, payload.targetId, player.currentLocationId);
  if (!target || !target.canGreet) {
    await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } });
    if (chatId) await bot.api.sendMessage(chatId, !target ? "Цілі вже немає поруч." : `${target.forms.nominative} не виглядає співрозмовником.`);
    return;
  }
  const greeting = pick(GREETINGS);
  await spendPlayerStamina(bot, player.id, "GREET", chatId);
  await prisma.player.update({ where: { id: player.id }, data: { greetings: { increment: 1 } } });
  await notifyLocation(bot, player.currentLocationId, player.id, `Хтось звертається до ${target.forms.genitive}: «${greeting}»`);
  await prisma.worldAction.update({ where: { id: action.id }, data: { status: "DONE" } });
  await logEvent("GREET", "Player greeted target", `${target.kind}:${target.id}: ${greeting}`, player.currentLocationId);
  if (chatId) await bot.api.sendMessage(chatId, `Ви сказали ${target.forms.dative}: «${greeting}»`);
}

async function completeFreshen(bot: Bot, action: WorldAction) {
  const payload = payloadOf<SocialPayload>(action);
  const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
  const chatId = chatIdFromAction(action);
  if (!player || !player.currentLocationId || action.actorType !== "PLAYER") return void (await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } }));
  const target = await resolveTarget(payload.targetType, payload.targetId, player.currentLocationId);
  if (!target || !target.isCorpse || !target.canFreshen) {
    await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } });
    if (chatId) await bot.api.sendMessage(chatId, "Труп уже не підходить для освіжування.");
    return;
  }
  await spendPlayerStamina(bot, player.id, "FRESHEN", chatId);
  await prisma.worldAction.update({ where: { id: action.id }, data: { status: "DONE" } });
  await logEvent("PLAYER_ACTION", "Player freshened corpse", `${target.kind}:${target.id}`, player.currentLocationId);
  if (chatId) await bot.api.sendMessage(chatId, `🔪 Ви освіжували ${target.forms.accusative}.\n\nПоки що це debug-дія без здобичі; пізніше тут будуть шкіра, м’ясо, кістки тощо.`);
}

async function completeCreatureAttack(bot: Bot, action: WorldAction) {
  const payload = payloadOf<SocialPayload>(action);
  const attacker = action.creatureId ? await prisma.creature.findUnique({ where: { id: action.creatureId }, include: { species: true } }) : null;
  if (!attacker || !attacker.isAlive || attacker.isGone || payload.targetType !== "creature") return void (await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } }));

  const target = await prisma.creature.findFirst({ where: { id: payload.targetId, locationId: attacker.locationId, isAlive: true, isGone: false }, include: { species: true } });
  if (!target || target.id === attacker.id) return void (await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } }));

  const damage = Math.max(1, attacker.species.strength + Math.floor(Math.random() * 3));
  const nextHp = target.hp - damage;
  await spendCreatureStamina(attacker, actionCost("ATTACK"));

  if (nextHp <= 0) {
    await prisma.creature.update({ where: { id: target.id }, data: { hp: 0, isAlive: false, age: "CORPSE", diedAtTick: null, corpseDecayTicksLeft: target.species.corpseDecayTicks, activity: "RESTING", currentAction: "лежить нерухомо" } });
    await interruptActorActions({ actorType: "CREATURE", creatureId: target.id }, "істоту вбито", true);
    await prisma.creature.update({ where: { id: attacker.id }, data: { hunger: Math.max(0, attacker.hunger - 4), activity: "FIGHTING", currentAction: `убив ${target.species.name}` } });
    await notifyLocation(bot, attacker.locationId, -1, `Щось кидається на здобич. За мить ${target.species.name} падає нерухомо.`);
    await logEvent("NPC_ACTION", "Creature killed prey", `${attacker.id} -> ${target.id}`, attacker.locationId);
  } else {
    await prisma.creature.update({ where: { id: target.id }, data: { hp: nextHp, currentAction: "поранено" } });
    await prisma.creature.update({ where: { id: attacker.id }, data: { activity: "FIGHTING", currentAction: `атакує ${target.species.name}` } });
    await notifyLocation(bot, attacker.locationId, -1, `Щось нападає на ${target.species.name}.`);
    await logEvent("NPC_ACTION", "Creature attacked prey", `${attacker.id} -> ${target.id}; damage=${damage}`, attacker.locationId);
  }

  await prisma.worldAction.update({ where: { id: action.id }, data: { status: "DONE" } });
}

async function completeAttack(bot: Bot, action: WorldAction) {
  if (action.actorType === "CREATURE") return completeCreatureAttack(bot, action);

  const payload = payloadOf<SocialPayload>(action);
  const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
  const chatId = chatIdFromAction(action);
  if (!player || !player.currentLocationId || action.actorType !== "PLAYER") return void (await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } }));
  const target = await resolveTarget(payload.targetType, payload.targetId, player.currentLocationId);
  if (!target || target.kind !== "creature" || !target.isAnimal || target.isCorpse) {
    await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } });
    if (chatId) await bot.api.sendMessage(chatId, !target ? "Цілі вже немає поруч." : "⚔️ Поки що можна атакувати тільки живих тварин.");
    return;
  }

  const creature = await prisma.creature.findFirst({ where: { id: target.id, locationId: player.currentLocationId, isAlive: true, isGone: false }, include: { species: true } });
  if (!creature) {
    await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } });
    if (chatId) await bot.api.sendMessage(chatId, "Цілі вже немає поруч. Можна спробувати відслідкувати слід.");
    return;
  }

  await spendPlayerStamina(bot, player.id, "ATTACK", chatId);
  await prisma.creature.update({ where: { id: creature.id }, data: { hp: 0, isAlive: false, age: "CORPSE", diedAtTick: null, corpseDecayTicksLeft: creature.species.corpseDecayTicks, activity: "RESTING", currentAction: "лежить нерухомо" } });
  await interruptActorActions({ actorType: "CREATURE", creatureId: creature.id }, "істоту вбито", true);
  await prisma.player.update({ where: { id: player.id }, data: { animalsKilled: { increment: 1 } } });
  await notifyLocation(bot, player.currentLocationId, player.id, `Хтось атакує і вбиває ${target.forms.accusative}.`);
  await prisma.worldAction.update({ where: { id: action.id }, data: { status: "DONE" } });
  await logEvent("PLAYER_ACTION", "Player killed animal", `${target.kind}:${target.id}`, player.currentLocationId);
  if (chatId) await bot.api.sendMessage(chatId, `⚔️ Ви атакували і вбили ${target.forms.accusative}. Труп лишився на землі.`);
}

async function completeSay(bot: Bot, action: WorldAction) {
  const payload = payloadOf<SayPayload>(action);
  const text = String(payload.text ?? "").slice(0, 300);
  if (!text) return void (await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } }));

  if (action.actorType === "PLAYER") {
    const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
    const chatId = chatIdFromAction(action);
    if (!player || !player.currentLocationId) return void (await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } }));
    await spendPlayerStamina(bot, player.id, "SAY", chatId);
    await prisma.player.update({ where: { id: player.id }, data: { says: { increment: 1 } } });
    await notifyLocation(bot, player.currentLocationId, player.id, `Хтось каже: «${text}»`);
    await prisma.worldAction.update({ where: { id: action.id }, data: { status: "DONE" } });
    await logEvent("SAY", "Player said something", text, player.currentLocationId);
    if (chatId) await bot.api.sendMessage(chatId, `Ви кажете: «${text}»`);
    return;
  }

  const creature = action.creatureId ? await prisma.creature.findUnique({ where: { id: action.creatureId }, include: { species: true } }) : null;
  if (!creature || !creature.isAlive || creature.isGone) return void (await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } }));
  await prisma.creature.update({ where: { id: creature.id }, data: { says: { increment: 1 }, activity: "SPEAKING", currentAction: "говорить" } });
  await notifyLocation(bot, creature.locationId, -1, `${creature.name ?? creature.species.name} промовляє: «${text}»`);
  await prisma.worldAction.update({ where: { id: action.id }, data: { status: "DONE" } });
  await logEvent("NPC_SAY", "Creature said something", text, creature.locationId);
}

async function completeTrack(bot: Bot, action: WorldAction) {
  const player = action.playerId ? await prisma.player.findUnique({ where: { id: action.playerId } }) : null;
  const chatId = chatIdFromAction(action);
  if (!player || !player.currentLocationId || action.actorType !== "PLAYER") return void (await prisma.worldAction.update({ where: { id: action.id }, data: { status: "FAILED" } }));

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

  await prisma.worldAction.update({ where: { id: action.id }, data: { status: "DONE" } });

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
        const max = player.staminaMax ?? BASE_STAMINA;
        const payload = payloadOf<{ untilFull?: boolean }>(action);
        const next = payload.untilFull ? max : Math.min(max, player.stamina + REST_STAMINA_REGEN_PER_INTERVAL);
        await prisma.player.update({ where: { id: player.id }, data: { stamina: next, fatigueState: fatigueStateFor(next, max), isResting: false } });
      }
    }
    if (action.actorType === "CREATURE" && action.creatureId) {
      const creature = await prisma.creature.findUnique({ where: { id: action.creatureId } });
      if (creature) {
        const max = creature.staminaMax ?? BASE_STAMINA;
        const next = Math.min(max, creature.stamina + REST_STAMINA_REGEN_PER_INTERVAL);
        await prisma.creature.update({ where: { id: creature.id }, data: { stamina: next, fatigueState: fatigueStateFor(next, max), activity: "RESTING", currentAction: "відпочиває" } });
      }
    }
  } else if (action.actorType === "CREATURE" && action.creatureId) {
    await prisma.creature.update({ where: { id: action.creatureId }, data: { activity: "RESTING", currentAction: actionTitle(action) } });
  }

  await prisma.worldAction.update({ where: { id: action.id }, data: { status: "DONE" } });
}


async function recoverStamina(bot: Bot) {
  const now = new Date();
  const players = await prisma.player.findMany();

  for (const player of players) {
    const max = player.staminaMax ?? BASE_STAMINA;
    if (player.stamina >= max && !player.isResting) continue;

    const activeActions = await prisma.worldAction.count({
      where: { actorType: "PLAYER", playerId: player.id, status: { in: ["QUEUED", "RUNNING"] } },
    });

    if (activeActions > 0 && !player.isResting) {
      await prisma.player.update({ where: { id: player.id }, data: { lastStaminaRegenAt: now } });
      continue;
    }

    const last = player.lastStaminaRegenAt ?? player.updatedAt ?? now;
    const intervals = Math.floor((now.getTime() - last.getTime()) / STAMINA_REGEN_INTERVAL_MS);
    if (intervals <= 0) continue;

    const before = player.stamina;
    const rate = player.isResting ? REST_STAMINA_REGEN_PER_INTERVAL : PASSIVE_STAMINA_REGEN_PER_INTERVAL;
    const after = Math.min(max, before + intervals * rate);
    const messages = thresholdMessages(before, after, max);
    const fullyRested = after >= max;
    const nextState = fatigueStateFor(after, max);
    const nextRegenAt = new Date(last.getTime() + intervals * STAMINA_REGEN_INTERVAL_MS);

    await prisma.player.update({
      where: { id: player.id },
      data: {
        stamina: after,
        fatigueState: nextState,
        isResting: player.isResting && !fullyRested,
        lastStaminaRegenAt: nextRegenAt,
      },
    });

    const chatId = Number(player.telegramId);
    if (Number.isSafeInteger(chatId)) {
      for (const message of messages) {
        const shouldSuggestRest = message.includes("втом") || message.includes("Виснаження");
        await bot.api.sendMessage(chatId, message, shouldSuggestRest ? { reply_markup: buildFatigueRestKeyboard() } : undefined);
      }
    }
  }

  const creatures = await prisma.creature.findMany({ where: { isGone: false } });
  for (const creature of creatures) {
    const max = creature.staminaMax ?? BASE_STAMINA;
    if (creature.stamina >= max) continue;

    const activeActions = await prisma.worldAction.count({
      where: { actorType: "CREATURE", creatureId: creature.id, status: { in: ["QUEUED", "RUNNING"] } },
    });
    if (activeActions > 0) {
      await prisma.creature.update({ where: { id: creature.id }, data: { lastStaminaRegenAt: now } });
      continue;
    }

    const last = creature.lastStaminaRegenAt ?? creature.updatedAt ?? now;
    const intervals = Math.floor((now.getTime() - last.getTime()) / STAMINA_REGEN_INTERVAL_MS);
    if (intervals <= 0) continue;
    const after = Math.min(max, creature.stamina + intervals * PASSIVE_STAMINA_REGEN_PER_INTERVAL);
    await prisma.creature.update({
      where: { id: creature.id },
      data: {
        stamina: after,
        fatigueState: fatigueStateFor(after, max),
        lastStaminaRegenAt: new Date(last.getTime() + intervals * STAMINA_REGEN_INTERVAL_MS),
      },
    });
  }
}

async function processActionQueue(bot: Bot) {
  await recoverStamina(bot);
  const dueRunning = await prisma.worldAction.findMany({ where: { status: "RUNNING", executeAt: { lte: new Date() } }, orderBy: [{ executeAt: "asc" }, { id: "asc" }], take: 50 });
  for (const action of dueRunning) await completeAction(bot, action);

  const nextQueued = await prisma.worldAction.findMany({ where: { status: "QUEUED" }, orderBy: [{ position: "asc" }, { id: "asc" }], take: 100 });
  const startedActors = new Set<string>();

  for (const action of nextQueued) {
    const key = actorKey(action);
    if (startedActors.has(key)) continue;
    if (action.actorType === "PLAYER" && action.playerId) {
      const player = await prisma.player.findUnique({ where: { id: action.playerId } });
      if (player?.isResting) continue;
    }
    const running = await prisma.worldAction.count({ where: { ...actorWhereFromAction(action), status: "RUNNING" } });
    if (running > 0) continue;
    startedActors.add(key);
    await startNextQueuedAction(action);
    const chatId = chatIdFromAction(action);
    if (chatId) await bot.api.sendMessage(chatId, `Починаємо: ${actionTitle(action)} (${msToSeconds(action.durationMs)} с).`, { reply_markup: buildActionQueueKeyboard(true) });
  }
}

export function startActionQueueLoop(bot: Bot) {
  setInterval(() => {
    processActionQueue(bot).catch((error) => {
      setLastRuntimeError(error);
      console.error("Action queue failed:", error);
      logEvent("ERROR", "Action queue failed", String(error)).catch(() => undefined);
    });
  }, ACTION_QUEUE_POLL_MS);
}
