import type { Bot } from "grammy";
import { Direction, LocationExit } from "@prisma/client";
import { prisma } from "../db";
import { actionDurationMs, gatherDurationMs, movementDurationMs } from "./actionRules";
import { enqueueCreatureAction } from "./actionLifecycle";
import {
  CELLAR_WATER_PASSAGE_DESTINATION_KEY,
  CELLAR_WATER_PASSAGE_SOURCE_KEY,
} from "./cellarWaterPassage";
import { creatureUsableExits } from "./creatureMovement";
import { findLocationRoute, type RouteStep } from "./routeFinding";
import { notifyLocationAll } from "./notifications";
import { maybePerformHerbalistSignal } from "./socialAutonomy";
import { FOLLOW_TARGET_CREATURE } from "./following";
import { rememberFollowedTargetHiddenRoute } from "./followRouteMemory";
import { creatureForms } from "./grammar";
import { maybeQueueProfessionTotemDismantle } from "./npcTotemDismantling";

export const HERBALIST_PROFESSION_KEYS = ["znakhar", "travnytsia"] as const;
export const HERBALIST_SUPPLY_RUN_STAGE_EVENT_TITLE = "Herbalist supply run stage";
export const HERBALIST_SUPPLY_RUN_COMPLETED_EVENT_TITLE = "Herbalist supply run completed";
export const HERBALIST_SUPPLY_RUN_BASELINE_EVENT_TITLE = "Herbalist supply run baseline";
export const HERBALIST_WATER_WORD_PASSAGE_EVENT_TITLE = "Herbalist water-word passage";
export const HERBALIST_SUPPLY_RUN_MIN_INTERVAL_MINUTES = 3 * 24 * 60;
export const HERBALIST_SUPPLY_RUN_FORCE_INTERVAL_MINUTES = 7 * 24 * 60;
export const HERBALIST_SUPPLY_RUN_CHANCE_AFTER_MIN = 8;
export const HERBALIST_WATER_WORD_PASSAGE_CHANCE_PERCENT = 20;
export const HERBALIST_CELLAR_LOCATION_KEY = CELLAR_WATER_PASSAGE_SOURCE_KEY;
export const HERBALIST_WATCHTOWER_LOCATION_KEY = "start_border_watchtower";
export const HERBALIST_GATHER_LOCATION_KEY = "meadow_16_05";
export const HERBALIST_GATHER_RESOURCE_KEYS = ["herbs", "berries", "mushrooms"] as const;

export type HerbalistGatherResourceKey = (typeof HERBALIST_GATHER_RESOURCE_KEYS)[number];
export type HerbalistSupplyRunStage =
  | "to_cellar"
  | "cellar_check"
  | "to_watchtower"
  | "torch_prep"
  | "to_gather"
  | "gather"
  | "return_cellar"
  | "deposit_rest";

export const HERBALIST_LINES = [
  "Трави самі говорять, якщо слухати тихо.",
  "Не кожен корінь лікує. Деякі тільки пам’ятають біль.",
  "Чорноліс сьогодні пахне дощем і старою корою.",
  "Не топчи мох без потреби — він старший за нас.",
  "Ягоди темнішають. Це не завжди добрий знак.",
  "Коли ліс мовчить — слухай землю.",
  "Тут десь має бути деревій... або щось, що ним прикидається.",
  "Гриби не брешуть. Люди — часто.",
  "Хто забирає все, той будить старше за себе.",
  "Тиша теж буває голодною.",
  "Якщо листя блищить без дощу, не поспішай торкатися.",
  "Полин гіркий, зате чесний.",
  "Корінь, вирваний зі злістю, лікує гірше.",
  "Те, що росте біля стежки, чує більше за нас.",
  "Стара кора знає, хто тут проходив до тебе.",
  "Не всяка ягода проситься до руки. Деякі кличуть тільки око.",
  "Коли трава лягає проти вітру, краще ступати тихіше.",
  "У добрій настоянці половина сили від терпіння.",
  "Лікувати можна і словом, але слово теж треба сушити.",
  "Тутешній мох не любить поспіху.",
  "Якщо гриб надто гарний, спершу привітайся здалеку.",
  "У лісі немає бур’янів. Є тільки рослини, яких ти ще не знаєш.",
  "Не рви останнього листка. Йому ще тримати пам’ять місцини.",
  "Дощ змиває сліди, але не завжди запах.",
  "Там, де трава мовчить, часто говорить камінь.",
  "Кропива сердита, бо її всі чіпають без дозволу.",
  "Ліс дає ліки повільніше, ніж люди просять.",
  "Сухий лист під ногою іноді гучніший за крик.",
  "Перш ніж збирати, подивися, хто вже їв тут до тебе.",
  "У темних ягодах буває сонце, тільки старе.",
  "Хвороба любить поспіх. Знахар ні.",
  "Не всякий запах попереджає. Деякі заманюють.",
  "Під корою теж є стежки, просто не для людської ноги.",
  "Якщо земля тепла без сонця, не лягай на неї.",
  "Свіжа рана слухає краще, коли навколо тихо.",
  "Мед лікує не все. Іноді він тільки переконує біль зачекати.",
  "Вода пам’ятає руки, що її брали.",
  "Деревій не любить, коли його називають навмання.",
  "Є трави для тіла, є для страху, а є такі, що краще не будити.",
  "Край лікується повільно. Ми лише підставляємо руки.",
  "Коли ліс надто щедрий, спершу спитай себе, кому він винен.",
  "Чорна земля не завжди мертва. Іноді вона просто думає.",
  "Свіжий пагін легше зламати, ніж попросити пробачення.",
  "У кожного кореня є низ, якого не видно.",
  "Гіркота часто приходить першою, щоб солодке не розлінилося.",
  "Листя шелестить по-різному для хворого і здорового.",
  "Справжні ліки не завжди пахнуть приємно.",
  "Поки рука тремтить, краще збирати очима.",
  "Лісовий пил осідає навіть на думках.",
  "Не все, що лікує звіра, витримає людину.",
  "Знахарська торба порожніє швидше, коли рука нетерпляча.",
  "Ягода може нагодувати, а може тільки нагадати про голод.",
  "Молодий пагін не питає, чи ти поспішаєш.",
  "Якщо місце виснажене, не кричи на нього ногами.",
  "Де трава повертається сама, там краще не ставати першим.",
  "Старий гриб знає більше доріг під землею, ніж ми на стежці.",
  "Трава не ворог. Ворог — рука, що бере без пам'яті.",
  "Коли лікуєш тіло, не забувай, що страх теж має корінь.",
  "Не всяка гіркота погана. Деяка просто чесна.",
  "Перший листок після винищення не чіпають.",
  "Якщо зілля пахне димом, спершу згадай, хто палив вогонь.",
  "На межі навіть мох росте насторожено.",
  "Де забагато слідів, там рослинам важче говорити.",
  "Ліки люблять чисті руки, але не завжди чисті думки.",
  "Кущ, який пережив ніч, не завжди готовий до чужої торби.",
];

const HERBALIST_ROUTE_MAX_DEPTH = 24;

function chance(p: number) {
  return Math.random() * 100 < p;
}

function pick<T>(items: T[]) {
  return items.length ? items[Math.floor(Math.random() * items.length)] : undefined;
}

function eventCreatureMarker(creatureId: number) {
  return `creatureId=${creatureId}`;
}

export function herbalistWaterWordPassageEventDescription(creatureId: number, absoluteMinute: number) {
  return [
    eventCreatureMarker(creatureId),
    `absoluteMinute=${Math.max(0, Math.floor(absoluteMinute))}`,
    `source=${CELLAR_WATER_PASSAGE_SOURCE_KEY}`,
    `destination=${CELLAR_WATER_PASSAGE_DESTINATION_KEY}`,
    "trigger=water_word_phrase",
    "stage=supply_run",
  ].join("; ");
}

function stageDescription(creatureId: number, stage: HerbalistSupplyRunStage, absoluteMinute: number, extra: Record<string, string | number> = {}) {
  const parts = [eventCreatureMarker(creatureId), `stage=${stage}`, `absoluteMinute=${Math.max(0, Math.floor(absoluteMinute))}`];
  for (const [key, value] of Object.entries(extra)) parts.push(`${key}=${value}`);
  return parts.join("; ");
}

function parseField(description: string | null | undefined, field: string) {
  if (!description) return null;
  const match = description.match(new RegExp(`(?:^|;\\s*)${field}=([^;]+)`));
  return match?.[1]?.trim() ?? null;
}

function parseAbsoluteMinute(description: string | null | undefined) {
  const value = Number(parseField(description, "absoluteMinute"));
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;
}

export function isHerbalistCreature(creature: { species?: { key?: string | null } | null; professionKey?: string | null }) {
  return creature.species?.key === "herbalist" || (creature.professionKey ? (HERBALIST_PROFESSION_KEYS as readonly string[]).includes(creature.professionKey) : false);
}

export function shouldHerbalistUseWaterWordPassage(input: {
  creature: { species?: { key?: string | null } | null; professionKey?: string | null };
  locationKey?: string | null;
  randomPercent?: number;
}) {
  if (!isHerbalistCreature(input.creature)) return false;
  if (input.locationKey !== CELLAR_WATER_PASSAGE_SOURCE_KEY) return false;
  const roll = input.randomPercent ?? Math.random() * 100;
  return roll < HERBALIST_WATER_WORD_PASSAGE_CHANCE_PERCENT;
}

export function isHerbalistSupplyRunDue(input: {
  currentAbsoluteMinute: number;
  lastAnchorAbsoluteMinute: number | null;
  randomPercent?: number;
}) {
  if (input.lastAnchorAbsoluteMinute === null) return false;
  const elapsed = Math.max(0, Math.floor(input.currentAbsoluteMinute - input.lastAnchorAbsoluteMinute));
  if (elapsed < HERBALIST_SUPPLY_RUN_MIN_INTERVAL_MINUTES) return false;
  if (elapsed >= HERBALIST_SUPPLY_RUN_FORCE_INTERVAL_MINUTES) return true;
  const roll = input.randomPercent ?? Math.random() * 100;
  return roll < HERBALIST_SUPPLY_RUN_CHANCE_AFTER_MIN;
}

export function isHerbalistGatherResourceKey(value: string | null | undefined): value is HerbalistGatherResourceKey {
  return Boolean(value && (HERBALIST_GATHER_RESOURCE_KEYS as readonly string[]).includes(value));
}

export function herbalistSupplyRunTorchPrepText() {
  return "торкається смоляних факелів: тринадцять вогників — не всі для вогню, деякі для пам'яті дороги";
}

export function herbalistCellarShelfCheckText() {
  return "перевіряє полицю в погребі, ніби рахує не речі, а майбутній шлях";
}

export function herbalistCellarDepositText() {
  return "сортує трави в погребі";
}

export function herbalistWaterWordCellarObserverText() {
  return "Знахар торкається стіни зарубок і тихо каже: «До води». На мить у сухому погребі чути воду — і його крок зникає.";
}

export function herbalistWaterWordDestinationObserverText() {
  return "Знахар виходить з мокрої темряви під мостом, ніби прийшов не стежкою, а словом.";
}

export function herbalistWaterWordCurrentAction() {
  return "виходить з мокрої темряви під мостом";
}

export function herbalistGatherText(resourceKey: HerbalistGatherResourceKey) {
  if (resourceKey === "berries") return "вибирає ягоди повільно, не торкаючись темних плям на листі";
  if (resourceKey === "mushrooms") return "придивляється до грибів довше, ніж до власної торби";
  return "збирає лікарські трави повільно, не рве першого листка й довше дивиться на корінь, ніж на стебло";
}

export function herbalistRouteDirections(route: RouteStep[]) {
  return route.map((step) => step.direction);
}

async function latestEvent(title: string, creatureId: number) {
  return prisma.worldEvent.findFirst({
    where: { title, description: { contains: eventCreatureMarker(creatureId) } },
    orderBy: { createdAt: "desc" },
  });
}

async function activeSupplyRunStage(creatureId: number): Promise<HerbalistSupplyRunStage | null> {
  const [stage, completed] = await Promise.all([
    latestEvent(HERBALIST_SUPPLY_RUN_STAGE_EVENT_TITLE, creatureId),
    latestEvent(HERBALIST_SUPPLY_RUN_COMPLETED_EVENT_TITLE, creatureId),
  ]);
  if (!stage) return null;
  if (completed && completed.createdAt >= stage.createdAt) return null;
  const value = parseField(stage.description, "stage");
  return isSupplyRunStage(value) ? value : null;
}

function isSupplyRunStage(value: string | null): value is HerbalistSupplyRunStage {
  return value === "to_cellar"
    || value === "cellar_check"
    || value === "to_watchtower"
    || value === "torch_prep"
    || value === "to_gather"
    || value === "gather"
    || value === "return_cellar"
    || value === "deposit_rest";
}

async function lastSupplyRunAnchorMinute(creatureId: number) {
  const [completed, baseline] = await Promise.all([
    latestEvent(HERBALIST_SUPPLY_RUN_COMPLETED_EVENT_TITLE, creatureId),
    latestEvent(HERBALIST_SUPPLY_RUN_BASELINE_EVENT_TITLE, creatureId),
  ]);
  return parseAbsoluteMinute(completed?.description) ?? parseAbsoluteMinute(baseline?.description);
}

async function ensureSupplyRunBaseline(creatureId: number, locationId: number, absoluteMinute: number) {
  const baseline = await latestEvent(HERBALIST_SUPPLY_RUN_BASELINE_EVENT_TITLE, creatureId);
  if (baseline) return false;
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: HERBALIST_SUPPLY_RUN_BASELINE_EVENT_TITLE,
      description: `${eventCreatureMarker(creatureId)}; absoluteMinute=${Math.max(0, Math.floor(absoluteMinute))}`,
      locationId,
    },
  });
  return true;
}

async function recordSupplyRunStage(
  creature: { id: number; locationId: number },
  stage: HerbalistSupplyRunStage,
  absoluteMinute: number,
  extra: Record<string, string | number> = {},
) {
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: HERBALIST_SUPPLY_RUN_STAGE_EVENT_TITLE,
      description: stageDescription(creature.id, stage, absoluteMinute, extra),
      locationId: creature.locationId,
    },
  });
}

async function recordSupplyRunCompleted(creature: { id: number; locationId: number }, absoluteMinute: number) {
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: HERBALIST_SUPPLY_RUN_COMPLETED_EVENT_TITLE,
      description: `${eventCreatureMarker(creature.id)}; absoluteMinute=${Math.max(0, Math.floor(absoluteMinute))}; cellar=${HERBALIST_CELLAR_LOCATION_KEY}`,
      locationId: creature.locationId,
    },
  });
}

async function locationIdByKey(key: string) {
  const location = await prisma.cellLocation.findUnique({ where: { key }, select: { id: true } });
  return location?.id ?? null;
}

function isExit(value: unknown): value is LocationExit {
  return Boolean(value && typeof value === "object" && "direction" in value && "toLocationId" in value);
}

async function queueMoveStep(creature: any, route: RouteStep[], reason: string) {
  const step = route[0];
  if (!step) return "queuedRest";
  await enqueueCreatureAction({
    creatureId: creature.id,
    type: "MOVE",
    payload: { direction: step.direction as Direction, reason },
    durationMs: movementDurationMs(step.travelCost, creature.stamina),
  });
  return "queuedMove";
}

async function queueRouteTo(creature: any, targetLocationId: number, reason: string) {
  if (creature.locationId === targetLocationId) return null;
  const route = await findLocationRoute(creature.locationId, targetLocationId, { maxDepth: HERBALIST_ROUTE_MAX_DEPTH });
  if (!route?.length) return null;
  return queueMoveStep(creature, route, reason);
}

async function moveTowardOrPause(creature: any, targetLocationId: number, reason: string, blockedReason: string) {
  if (creature.locationId === targetLocationId) return null;
  const move = await queueRouteTo(creature, targetLocationId, reason);
  return move ?? queueLook(creature, blockedReason);
}

async function chooseGatherResource(locationId: number): Promise<HerbalistGatherResourceKey> {
  const resources = await prisma.resourceNode.findMany({
    where: {
      locationId,
      amount: { gt: 0 },
      resourceType: { key: { in: [...HERBALIST_GATHER_RESOURCE_KEYS] } },
    },
    include: { resourceType: true },
    orderBy: [{ amount: "desc" }, { resourceType: { key: "asc" } }],
  });
  const key = resources.map((resource) => resource.resourceType.key).find(isHerbalistGatherResourceKey);
  return key ?? "herbs";
}

async function queueLook(creature: any, reason: string) {
  await enqueueCreatureAction({
    creatureId: creature.id,
    type: "LOOK",
    payload: { reason },
    durationMs: actionDurationMs("LOOK", creature.stamina),
  });
  return "queuedLook";
}

async function queueGather(creature: any, resourceKey: HerbalistGatherResourceKey) {
  await enqueueCreatureAction({
    creatureId: creature.id,
    type: "GATHER_SPECIFIC",
    payload: { resourceKey },
    durationMs: gatherDurationMs(resourceKey, creature.stamina),
  });
  await prisma.creature.updateMany({
    where: { id: creature.id },
    data: { activity: "GATHERING", currentAction: herbalistGatherText(resourceKey) },
  });
  return "queuedGather";
}

async function queueRestInCellar(creature: any) {
  await prisma.creature.updateMany({
    where: { id: creature.id },
    data: { activity: "RESTING", currentAction: herbalistCellarDepositText() },
  });
  await enqueueCreatureAction({
    creatureId: creature.id,
    type: "REST",
    payload: {},
    durationMs: actionDurationMs("REST", creature.stamina),
  });
  return "queuedRest";
}

async function maybeUseHerbalistWaterWordPassage(bot: Bot | null, creature: any, absoluteMinute: number) {
  if (!shouldHerbalistUseWaterWordPassage({
    creature,
    locationKey: creature.location?.key,
  })) return false;

  const destination = await prisma.cellLocation.findUnique({
    where: { key: CELLAR_WATER_PASSAGE_DESTINATION_KEY },
    select: { id: true },
  });
  if (!destination) return false;

  const sourceLocationId = creature.locationId;
  const moved = await prisma.$transaction(async (tx) => {
    const updated = await tx.creature.updateMany({
      where: {
        id: creature.id,
        locationId: sourceLocationId,
        isAlive: true,
        isGone: false,
      },
      data: {
        locationId: destination.id,
        activity: "MOVING",
        currentAction: herbalistWaterWordCurrentAction(),
        steps: { increment: 1 },
      },
    });
    if (updated.count === 0) return false;

    await tx.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: HERBALIST_WATER_WORD_PASSAGE_EVENT_TITLE,
        description: herbalistWaterWordPassageEventDescription(creature.id, absoluteMinute),
        locationId: sourceLocationId,
      },
    });
    return true;
  });
  if (!moved) return false;

  if (bot) {
    await rememberFollowedTargetHiddenRoute(bot, {
      sourceLocationId,
      destinationLocationId: destination.id,
      target: { type: FOLLOW_TARGET_CREATURE, id: creature.id, label: creatureForms(creature).nominative, visible: !creature.isHidden },
    });
    await notifyLocationAll(bot, sourceLocationId, herbalistWaterWordCellarObserverText());
    await notifyLocationAll(bot, destination.id, herbalistWaterWordDestinationObserverText());
  }
  return true;
}

async function maybeHerbalistSpeak(creature: any) {
  if (!chance(Number(process.env.HERBALIST_SPEAK_CHANCE || 12))) return false;
  const line = pick(HERBALIST_LINES);
  if (!line) return false;
  await enqueueCreatureAction({
    creatureId: creature.id,
    type: "SAY",
    payload: { text: line },
    durationMs: actionDurationMs("SAY", creature.stamina),
  });
  return true;
}

async function tickLegacyHerbalist(bot: Bot | null, creature: any) {
  if (bot && await maybePerformHerbalistSignal(bot, creature)) return "queuedLook";
  if (await maybeHerbalistSpeak(creature)) return "queuedSay";

  const herbs = creature.location.resources.find((resource: any) => resource.resourceType.key === "herbs");
  if (herbs && herbs.amount > 0) {
    await enqueueCreatureAction({
      creatureId: creature.id,
      type: "GATHER_SPECIFIC",
      payload: { resourceKey: "herbs" },
      durationMs: gatherDurationMs("herbs", creature.stamina),
    });
    return "queuedGather";
  }

  const exit = pick(creatureUsableExits(creature, creature.location.exitsFrom));
  if (isExit(exit)) {
    await enqueueCreatureAction({
      creatureId: creature.id,
      type: "MOVE",
      payload: { direction: exit.direction as Direction, reason: "шукає лікарські трави" },
      durationMs: movementDurationMs(exit.travelCost, creature.stamina),
    });
    return "queuedMove";
  }

  await enqueueCreatureAction({
    creatureId: creature.id,
    type: "REST",
    payload: {},
    durationMs: actionDurationMs("REST", creature.stamina),
  });
  return "queuedRest";
}

async function tickSupplyRunStage(bot: Bot | null, creature: any, stage: HerbalistSupplyRunStage, absoluteMinute: number) {
  const [cellarLocationId, watchtowerLocationId, gatherLocationId] = await Promise.all([
    locationIdByKey(HERBALIST_CELLAR_LOCATION_KEY),
    locationIdByKey(HERBALIST_WATCHTOWER_LOCATION_KEY),
    locationIdByKey(HERBALIST_GATHER_LOCATION_KEY),
  ]);
  if (!cellarLocationId || !watchtowerLocationId || !gatherLocationId) return "queuedRest";

  if (stage === "to_cellar") {
    const move = await moveTowardOrPause(
      creature,
      cellarLocationId,
      "вертається до погреба під табором",
      "зупиняється й звіряє дорогу до погреба",
    );
    if (move) return move;
    await recordSupplyRunStage(creature, "cellar_check", absoluteMinute);
    return queueLook(creature, herbalistCellarShelfCheckText());
  }

  if (stage === "cellar_check") {
    if (await maybeUseHerbalistWaterWordPassage(bot, creature, absoluteMinute)) {
      await recordSupplyRunStage(creature, "to_gather", absoluteMinute, {
        target: HERBALIST_GATHER_LOCATION_KEY,
        route: "water_word_passage",
      });
      return "queuedMove";
    }

    await recordSupplyRunStage(creature, "to_watchtower", absoluteMinute);
    const move = await moveTowardOrPause(
      creature,
      watchtowerLocationId,
      "піднімається до вежі по світло перед обходом",
      "зупиняється й слухає, де скрипить драбина вежі",
    );
    return move ?? queueLook(creature, herbalistSupplyRunTorchPrepText());
  }

  if (stage === "to_watchtower") {
    const move = await moveTowardOrPause(
      creature,
      watchtowerLocationId,
      "піднімається до вежі по світло перед обходом",
      "зупиняється й слухає, де скрипить драбина вежі",
    );
    if (move) return move;
    await recordSupplyRunStage(creature, "torch_prep", absoluteMinute);
    return queueLook(creature, herbalistSupplyRunTorchPrepText());
  }

  if (stage === "torch_prep") {
    await recordSupplyRunStage(creature, "to_gather", absoluteMinute, { target: HERBALIST_GATHER_LOCATION_KEY });
    const move = await moveTowardOrPause(
      creature,
      gatherLocationId,
      "йде з табору по трави, ягоди й гриби",
      "звіряє край луки перед збором",
    );
    return move ?? queueLook(creature, "звіряє край луки перед збором");
  }

  if (stage === "to_gather") {
    const move = await moveTowardOrPause(
      creature,
      gatherLocationId,
      "йде з табору по трави, ягоди й гриби",
      "звіряє край луки перед збором",
    );
    if (move) return move;
    const resourceKey = await chooseGatherResource(gatherLocationId);
    await recordSupplyRunStage(creature, "gather", absoluteMinute, { resourceKey, target: HERBALIST_GATHER_LOCATION_KEY });
    return queueGather(creature, resourceKey);
  }

  if (stage === "gather") {
    await recordSupplyRunStage(creature, "return_cellar", absoluteMinute);
    const move = await moveTowardOrPause(
      creature,
      cellarLocationId,
      "повертається до погреба з обходу",
      "перевіряє, чи не розсипалося зібране дорогою",
    );
    return move ?? queueLook(creature, "перевіряє, чи не розсипалося зібране дорогою");
  }

  if (stage === "return_cellar") {
    const move = await moveTowardOrPause(
      creature,
      cellarLocationId,
      "повертається до погреба з обходу",
      "перевіряє, чи не розсипалося зібране дорогою",
    );
    if (move) return move;
    await recordSupplyRunStage(creature, "deposit_rest", absoluteMinute);
    await recordSupplyRunCompleted(creature, absoluteMinute);
    return queueRestInCellar(creature);
  }

  await recordSupplyRunCompleted(creature, absoluteMinute);
  return queueRestInCellar(creature);
}

export async function tickNpcHerbalist(bot: Bot | null, creature: any, absoluteMinute: number) {
  if (!isHerbalistCreature(creature)) return "queuedRest";
  if (await maybeQueueProfessionTotemDismantle(bot, creature)) return "queuedLook";

  const stage = await activeSupplyRunStage(creature.id);
  if (stage) return tickSupplyRunStage(bot, creature, stage, absoluteMinute);

  const anchor = await lastSupplyRunAnchorMinute(creature.id);
  if (anchor === null) {
    await ensureSupplyRunBaseline(creature.id, creature.locationId, absoluteMinute);
    return tickLegacyHerbalist(bot, creature);
  }

  if (isHerbalistSupplyRunDue({ currentAbsoluteMinute: absoluteMinute, lastAnchorAbsoluteMinute: anchor })) {
    await recordSupplyRunStage(creature, "to_cellar", absoluteMinute);
    return tickSupplyRunStage(bot, creature, "to_cellar", absoluteMinute);
  }

  return tickLegacyHerbalist(bot, creature);
}
