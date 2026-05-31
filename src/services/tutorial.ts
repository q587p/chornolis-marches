import { Direction, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { getStartLocationId } from "./players";
import { directionLabels } from "../ui/labels";

export const TUTORIAL_REGION_KEY = "dream_tutorial";
export const TUTORIAL_START_LOCATION_KEY = "dream_tutorial_threshold";
export const TUTORIAL_SECOND_STEP_LOCATION_KEY = "dream_tutorial_second_step";
export const TUTORIAL_GATE_LOCATION_KEY = "dream_tutorial_gate";
export const TUTORIAL_HUB_LOCATION_KEY = "dream_tutorial_hub";
export const TUTORIAL_FORAGING_LOCATION_KEY = "dream_tutorial_foraging";
export const TUTORIAL_REST_LOCATION_KEY = "dream_tutorial_rest";
export const TUTORIAL_TIME_LOCATION_KEY = "dream_tutorial_time";
export const TUTORIAL_SAFETY_LOCATION_KEY = "dream_tutorial_safety";
export const TUTORIAL_OBSERVATION_LOCATION_KEY = "dream_tutorial_observation";
export const TUTORIAL_END_LOCATION_KEY = TUTORIAL_OBSERVATION_LOCATION_KEY;
export const TUTORIAL_DEEP_REST_LOCATION_KEY = "dream_tutorial_deep_rest";
export const DREAM_GATE_FEATURE_KEY = "dream_tutorial_sleep_gate";
export const DREAM_GATE_RETURN_FEATURE_KEY = "dream_tutorial_sleep_gate_return";
export const DREAM_GATE_FEATURE_KEYS = [DREAM_GATE_FEATURE_KEY, DREAM_GATE_RETURN_FEATURE_KEY] as const;
export const DREAM_GATE_OPEN_MS = 30 * 1000;
const DREAM_GATE_OPEN_WINDOWS_MS = [30_000, 60_000, 120_000, 240_000, 480_000];
export const DREAM_GATE_OPENED_TEXT = "Брама Сну розходиться без скрипу. Прохід відкритий з обох боків, але Дрімота довго не чекатиме.";
export const DREAM_GATE_ALREADY_OPEN_TEXT = "Брама Сну вже прочинена. Прохід ще тримається з обох боків; Дрімота тільки позіхає й чекає, чи підете ви далі.";
export const TUTORIAL_FORAGING_SUCCESS_EVENT_TITLE = "Tutorial foraging success";
export const TUTORIAL_INVENTORY_AVAILABLE_EVENT_TITLE = "Tutorial inventory available";
export const TUTORIAL_OBSERVATION_LESSON_EVENT_TITLE = "Tutorial observation lesson";
export const TUTORIAL_WELLBEING_ASIDE_EVENT_TITLE = "Tutorial wellbeing aside";
export const TUTORIAL_WELLBEING_ASIDE_TEXT = [
  "Сон на мить дивиться крізь персонажа - просто на вас.",
  "",
  "«Тілу по той бік теж потрібні вода, їжа, перепочинок і трохи далечіні для очей. Розімніть плечі, відведіть погляд від екрана хоч на кілька подихів. Чорноліс почекає».",
].join("\n");

const RETURN_LOCATION_EVENT_TITLE = "Tutorial return location";
const DREAM_LOCATION_EVENT_TITLE = "Tutorial dream location";
const COMPLETED_EVENT_TITLE = "Tutorial completed";
const RESET_EVENT_TITLE = "Tutorial reset by admin";
const TUTORIAL_COMMAND_HINT_EVENT_TITLE = "Tutorial command hint";
const DREAM_GATE_LOCK_HINT_EVENT_TITLE = "Tutorial dream gate lock hint";
const DREAM_GATE_OPEN_PHRASES = ["відчинитися", "відчинися", "відчинись", "відкритися", "відкрийся"];
export const TUTORIAL_FORAGING_RESOURCE_AMOUNTS = {
  berries: 6,
  herbs: 3,
} as const;

export function tutorialForagingResourceAmount(resourceKey: string) {
  return TUTORIAL_FORAGING_RESOURCE_AMOUNTS[resourceKey as keyof typeof TUTORIAL_FORAGING_RESOURCE_AMOUNTS] ?? null;
}

function normalizeDreamGateSpeech(text: string) {
  let normalized = text
    .trim()
    .toLocaleLowerCase("uk-UA")
    .replace(/[«»"“”„]/g, "")
    .replace(/[!?.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const filler of ["будь ласка", "прошу", "можеш", "можете", "будь добрий", "будь добра", "будь ласкавий"]) {
    normalized = normalized.split(filler).join(" ");
  }

  return normalized.replace(/\s+/g, " ").trim();
}

export function isDreamGateOpeningPhrase(text: string) {
  const normalized = normalizeDreamGateSpeech(text);
  return DREAM_GATE_OPEN_PHRASES.some((phrase) =>
    normalized === phrase || normalized.startsWith(`${phrase} `) || normalized.endsWith(` ${phrase}`),
  );
}

export async function canOpenDreamGateWithSpeech(playerId: number, text: string) {
  if (!isDreamGateOpeningPhrase(text)) return false;

  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) return false;

  const feature = await prisma.locationFeature.findFirst({
    where: { key: { in: [...DREAM_GATE_FEATURE_KEYS] }, locationId: player.currentLocationId, isActive: true },
    select: { id: true },
  });
  return Boolean(feature);
}

function featureData(feature: { data: Prisma.JsonValue | null }) {
  return feature.data && typeof feature.data === "object" && !Array.isArray(feature.data)
    ? feature.data as Record<string, unknown>
    : {};
}

function directionFromData(data: Record<string, unknown>): Direction | null {
  const direction = String(data.locks_exit_direction ?? data.lockedExitDirection ?? "").toUpperCase();
  return ["NORTH", "SOUTH", "EAST", "WEST", "UP", "DOWN", "INSIDE", "OUTSIDE"].includes(direction)
    ? direction as Direction
    : null;
}

function openUntilMs(data: Record<string, unknown>) {
  const value = data.open_until ?? data.openUntil;
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function isLockedFeatureCurrentlyOpen(data: Record<string, unknown>, now = Date.now()) {
  const until = openUntilMs(data);
  return until !== null && until > now;
}

function lockReason(data: Record<string, unknown>) {
  return typeof data.lock_reason === "string"
    ? data.lock_reason
    : typeof data.lockReason === "string"
      ? data.lockReason
      : "перешкода";
}

function lockedReasonLabel(reason: string) {
  const trimmed = reason.trim();
  if (!trimmed) return "Перешкода";
  return `${trimmed.charAt(0).toLocaleUpperCase("uk-UA")}${trimmed.slice(1)}`;
}

export function isTutorialLocation(location: { key: string; z: number; region?: { key: string } | null }) {
  return location.z === -13 || location.region?.key === TUTORIAL_REGION_KEY || location.key.startsWith("dream_tutorial_");
}

export function isTutorialFastRestLocationKey(key: string | null | undefined) {
  return key === TUTORIAL_REST_LOCATION_KEY || key === TUTORIAL_DEEP_REST_LOCATION_KEY;
}

export function isDreamGateFeature(feature: { key: string; data: Prisma.JsonValue | null }) {
  return DREAM_GATE_FEATURE_KEYS.includes(feature.key as typeof DREAM_GATE_FEATURE_KEYS[number]) || featureData(feature).tutorial_gate === true;
}

export function dreamGateStatusText(feature: { data: Prisma.JsonValue | null }) {
  const data = featureData(feature);
  return isLockedFeatureCurrentlyOpen(data)
    ? "Брама прочинена. Сон за нею дихає холодом, і прохід тимчасово відкритий."
    : "Брама зімкнена. На дереві проступає знак: не всі шляхи є шляхами, доки їх не покличеш.";
}

export function dreamGateAlreadyOpenText(feature: { data: Prisma.JsonValue | null }) {
  return isLockedFeatureCurrentlyOpen(featureData(feature)) ? DREAM_GATE_ALREADY_OPEN_TEXT : null;
}

export async function getTutorialStartLocationId() {
  const location = await prisma.cellLocation.findUnique({ where: { key: TUTORIAL_START_LOCATION_KEY } });
  if (!location) throw new Error(`Tutorial start location "${TUTORIAL_START_LOCATION_KEY}" not found. Run npm run seed first.`);
  return location.id;
}

export async function ensureTutorialForagingResources(locationId: number) {
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    select: { key: true },
  });
  if (location?.key !== TUTORIAL_FORAGING_LOCATION_KEY) return false;

  const resourceTypes = await prisma.resourceType.findMany({
    where: { key: { in: Object.keys(TUTORIAL_FORAGING_RESOURCE_AMOUNTS) } },
    select: { id: true, key: true },
  });
  if (!resourceTypes.length) return false;

  await prisma.$transaction(resourceTypes.map((resourceType) => {
    const amount = tutorialForagingResourceAmount(resourceType.key) ?? 1;
    return prisma.resourceNode.upsert({
      where: {
        locationId_resourceTypeId: {
          locationId,
          resourceTypeId: resourceType.id,
        },
      },
      update: {
        amount,
        maxAmount: amount,
      },
      create: {
        locationId,
        resourceTypeId: resourceType.id,
        amount,
        maxAmount: amount,
      },
    });
  }));

  return true;
}

async function latestPlayerEventLocation(playerId: number, title: string) {
  const event = await prisma.worldEvent.findFirst({
    where: { playerId, type: "SYSTEM", title },
    orderBy: { id: "desc" },
  });
  const locationId = Number(event?.description);
  return Number.isInteger(locationId) && locationId > 0 ? locationId : null;
}

async function rememberPlayerLocation(playerId: number, title: string, locationId: number) {
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title,
      description: String(locationId),
      playerId,
      locationId,
    },
  });
}

export async function hasCompletedTutorial(playerId: number) {
  const event = await prisma.worldEvent.findFirst({
    where: { playerId, type: "SYSTEM", title: COMPLETED_EVENT_TITLE },
    select: { id: true },
    orderBy: { id: "desc" },
  });
  return Boolean(event);
}

export const TUTORIAL_END_CONFIRMATION_TEXT = [
  "Сон на мить спиняє стежку.",
  "",
  "«Закінчити навчання зараз? Далі буде не коротка вправа, а справжнє Порубіжжя: більше простору, темряви, голоду, чужих слідів і рішень без підказки».",
  "",
  "Дрімота позіхає збоку:",
  "",
  "«Я б ще посиділа. Але якщо вже йти, то йди з відкритими очима: реальний світ ширший, голосніший і не завжди пояснює себе двічі».",
].join("\n");

export async function completeTutorialForPlayer(playerId: number, reason = "tutorial-end") {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { currentLocation: { include: { region: true } } },
  });
  if (!player) throw new Error("Player not found.");

  const currentLocationId = player.currentLocationId ?? await getStartLocationId();
  const dreaming = player.currentLocation ? isTutorialLocation(player.currentLocation) : false;
  const completedBefore = await hasCompletedTutorial(player.id);
  const returnLocationId = dreaming
    ? await validLocationId(await latestPlayerEventLocation(player.id, RETURN_LOCATION_EVENT_TITLE), false)
      ?? await getStartLocationId()
    : currentLocationId;

  await prisma.$transaction(async (tx) => {
    if (dreaming) {
      await tx.worldEvent.create({
        data: {
          type: "SYSTEM",
          title: DREAM_LOCATION_EVENT_TITLE,
          description: String(currentLocationId),
          playerId: player.id,
          locationId: currentLocationId,
        },
      });
      await tx.player.update({ where: { id: player.id }, data: { currentLocationId: returnLocationId } });
    }

    if (!completedBefore) {
      await tx.worldEvent.create({
        data: {
          type: "SYSTEM",
          title: COMPLETED_EVENT_TITLE,
          description: reason,
          playerId: player.id,
          locationId: returnLocationId,
        },
      });
    }
  });

  return {
    locationId: returnLocationId,
    fromLocationId: currentLocationId,
    completed: !completedBefore,
    woke: dreaming,
    text: [
      "Ви закінчуєте навчальний сон.",
      "",
      "Сон відступає не різко, а як туман, що знає дорогу назад. Дрімота бурмоче: «Ну от. Тепер справжнє Порубіжжя. Там ширше, гучніше й живіше, ніж у цій короткій вправі».",
      "",
      "Підказки про незавершене навчання більше не триматимуться за вас. Якщо колись захочеться повернутися до сну для повторення, напишіть /sleep tutorial.",
    ].join("\n"),
  };
}

export async function resetTutorialProgressForPlayer(playerId: number, scribePlayerId?: number) {
  const startLocationId = await getTutorialStartLocationId();
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { currentLocationId: true, currentLocation: { select: { key: true, z: true, region: { select: { key: true } } } } },
  });
  const currentlyInTutorial = player?.currentLocation ? isTutorialLocation(player.currentLocation) : false;

  await prisma.$transaction(async (tx) => {
    await tx.worldEvent.deleteMany({
      where: {
        playerId,
        type: "SYSTEM",
        title: { in: [COMPLETED_EVENT_TITLE, TUTORIAL_FORAGING_SUCCESS_EVENT_TITLE, TUTORIAL_INVENTORY_AVAILABLE_EVENT_TITLE, TUTORIAL_OBSERVATION_LESSON_EVENT_TITLE, TUTORIAL_WELLBEING_ASIDE_EVENT_TITLE] },
      },
    });

    await tx.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: DREAM_LOCATION_EVENT_TITLE,
        description: String(startLocationId),
        playerId,
        locationId: startLocationId,
      },
    });

    await tx.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: RESET_EVENT_TITLE,
        description: `scribePlayer=${scribePlayerId ?? "unknown"}; dreamLocation=start; movedCurrent=${currentlyInTutorial}`,
        playerId,
        locationId: startLocationId,
      },
    });

    if (currentlyInTutorial) {
      await tx.player.update({
        where: { id: playerId },
        data: { currentLocationId: startLocationId },
      });
    }
  });

  return { locationId: startLocationId, movedCurrent: currentlyInTutorial };
}

export async function hasTutorialForagingSuccess(playerId: number) {
  const event = await prisma.worldEvent.findFirst({
    where: { playerId, type: "SYSTEM", title: TUTORIAL_FORAGING_SUCCESS_EVENT_TITLE },
    select: { id: true },
    orderBy: { id: "desc" },
  });
  return Boolean(event);
}

export async function rememberTutorialForagingSuccess(playerId: number, locationId: number, resourceKey: string) {
  const seen = await hasTutorialForagingSuccess(playerId);
  if (seen) return false;

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: TUTORIAL_FORAGING_SUCCESS_EVENT_TITLE,
      description: resourceKey,
      playerId,
      locationId,
    },
  });
  return true;
}

export async function hasTutorialInventoryAvailable(playerId: number) {
  const event = await prisma.worldEvent.findFirst({
    where: { playerId, type: "SYSTEM", title: TUTORIAL_INVENTORY_AVAILABLE_EVENT_TITLE },
    select: { id: true },
    orderBy: { id: "desc" },
  });
  return Boolean(event);
}

export async function rememberTutorialInventoryAvailable(playerId: number, locationId: number | null | undefined, reason = "inventory") {
  if (!locationId) return false;
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    select: { key: true, z: true, region: { select: { key: true } } },
  });
  if (!location || !isTutorialLocation(location)) return false;

  const seen = await hasTutorialInventoryAvailable(playerId);
  if (seen) return false;

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: TUTORIAL_INVENTORY_AVAILABLE_EVENT_TITLE,
      description: reason,
      playerId,
      locationId,
    },
  });
  return true;
}

export async function hasTutorialObservationLesson(playerId: number) {
  const event = await prisma.worldEvent.findFirst({
    where: { playerId, type: "SYSTEM", title: TUTORIAL_OBSERVATION_LESSON_EVENT_TITLE },
    select: { id: true },
    orderBy: { id: "desc" },
  });
  return Boolean(event);
}

export async function rememberTutorialObservationLesson(playerId: number, locationId: number, skillKey = "tracking") {
  const seen = await hasTutorialObservationLesson(playerId);
  if (seen) return false;

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: TUTORIAL_OBSERVATION_LESSON_EVENT_TITLE,
      description: skillKey,
      playerId,
      locationId,
    },
  });
  return true;
}

export function isTutorialWellbeingFoodResource(resourceKey: string) {
  return ["berries", "mushrooms", "cooked_meat"].includes(resourceKey);
}

export async function rememberTutorialWellbeingAside(playerId: number, locationId: number | null | undefined, resourceKey: string) {
  if (!locationId || !isTutorialWellbeingFoodResource(resourceKey)) return false;
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    select: { key: true, z: true, region: { select: { key: true } } },
  });
  if (!location || !isTutorialLocation(location)) return false;

  const seen = await prisma.worldEvent.findFirst({
    where: { playerId, type: "SYSTEM", title: TUTORIAL_WELLBEING_ASIDE_EVENT_TITLE },
    select: { id: true },
    orderBy: { id: "desc" },
  });
  if (seen) return false;

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: TUTORIAL_WELLBEING_ASIDE_EVENT_TITLE,
      description: resourceKey,
      playerId,
      locationId,
    },
  });
  return true;
}

export async function rememberTutorialCommandHint(playerId: number, commandKey: string, locationId?: number | null) {
  const description = commandKey.trim();
  const seen = await prisma.worldEvent.findFirst({
    where: { playerId, type: "SYSTEM", title: TUTORIAL_COMMAND_HINT_EVENT_TITLE, description },
    select: { id: true },
    orderBy: { id: "desc" },
  });
  if (seen) return false;

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: TUTORIAL_COMMAND_HINT_EVENT_TITLE,
      description,
      playerId,
      locationId: locationId ?? undefined,
    },
  });
  return true;
}

export async function hasTutorialCommandHint(playerId: number, commandKey: string) {
  const description = commandKey.trim();
  const event = await prisma.worldEvent.findFirst({
    where: { playerId, type: "SYSTEM", title: TUTORIAL_COMMAND_HINT_EVENT_TITLE, description },
    select: { id: true },
    orderBy: { id: "desc" },
  });
  return Boolean(event);
}

export async function rememberTutorialCommandHintIfInTutorial(playerId: number, commandKey: string, locationId?: number | null) {
  if (!locationId) return false;
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    select: { key: true, z: true, region: { select: { key: true } } },
  });
  if (!location || !isTutorialLocation(location)) return false;
  return rememberTutorialCommandHint(playerId, commandKey, locationId);
}

async function validLocationId(locationId: number | null, tutorial: boolean) {
  if (!locationId) return null;
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    select: { id: true, key: true, z: true, region: { select: { key: true } } },
  });
  if (!location) return null;
  return isTutorialLocation(location) === tutorial ? location.id : null;
}

export async function enterTutorialDream(playerId: number, options: { forceStart?: boolean } = {}) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { currentLocation: { include: { region: true } } },
  });
  if (!player) throw new Error("Player not found.");

  const currentLocationId = player.currentLocationId ?? await getStartLocationId();
  const alreadyDreaming = player.currentLocation ? isTutorialLocation(player.currentLocation) : false;
  if (alreadyDreaming) {
    return {
      locationId: currentLocationId,
      fromLocationId: currentLocationId,
      entered: false,
      text: "Ви і так уже спите. Сон усередині сну наразі не вплетений у правила Порубіжжя.",
    };
  }

  await rememberPlayerLocation(player.id, RETURN_LOCATION_EVENT_TITLE, currentLocationId);

  const savedDreamLocationId = options.forceStart
    ? null
    : await validLocationId(await latestPlayerEventLocation(player.id, DREAM_LOCATION_EVENT_TITLE), true);
  const locationId = savedDreamLocationId ?? await getTutorialStartLocationId();

  await prisma.player.update({ where: { id: player.id }, data: { currentLocationId: locationId, isAutoEnabled: false } });
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: "Player entered tutorial dream",
      description: options.forceStart ? "first-run" : "sleep tutorial",
      playerId: player.id,
      locationId,
    },
  });

  return {
    locationId,
    fromLocationId: currentLocationId,
    entered: true,
    text: "Ви стоїте посеред сну й не можете згадати, як опинилися тут. Минуле тримається за темряву: ким ви були, що вміли, чий голос кликав вас раніше. Попереду лишається ім’я і кілька кроків стежки.",
  };
}

export async function wakeFromTutorialDream(playerId: number) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { currentLocation: { include: { region: true } } },
  });
  if (!player) throw new Error("Player not found.");

  const currentLocationId = player.currentLocationId ?? await getStartLocationId();
  const dreaming = player.currentLocation ? isTutorialLocation(player.currentLocation) : false;
  if (!dreaming) {
    return {
      locationId: currentLocationId,
      fromLocationId: currentLocationId,
      woke: false,
      text: "Ви вже не в навчальному сні.",
    };
  }

  await rememberPlayerLocation(player.id, DREAM_LOCATION_EVENT_TITLE, currentLocationId);
  const returnLocationId =
    await validLocationId(await latestPlayerEventLocation(player.id, RETURN_LOCATION_EVENT_TITLE), false)
    ?? await getStartLocationId();

  await prisma.player.update({ where: { id: player.id }, data: { currentLocationId: returnLocationId } });
  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: COMPLETED_EVENT_TITLE,
      description: "woke",
      playerId: player.id,
      locationId: returnLocationId,
    },
  });

  return {
    locationId: returnLocationId,
    fromLocationId: currentLocationId,
    woke: true,
    text: "Ви прокидаєтеся. Сон відступає, але стежка, здається, запам’ятала ваші кроки.",
  };
}

export async function lockedExitDirections(locationId: number) {
  const features = await prisma.locationFeature.findMany({
    where: { locationId, isActive: true },
    select: { data: true },
  });
  const locked = new Map<Direction, string>();

  for (const feature of features) {
    const data = featureData(feature);
    if (data.locked !== true) continue;
    const direction = directionFromData(data);
    if (!direction || isLockedFeatureCurrentlyOpen(data)) continue;
    locked.set(direction, lockReason(data));
  }

  return locked;
}

export async function isLocationExitLocked(locationId: number, direction: Direction) {
  const locked = await lockedExitDirections(locationId);
  const reason = locked.get(direction);
  if (!reason) return null;
  return `${lockedReasonLabel(reason)} (закрито).`;
}

async function firstDreamGateLockHint(playerId: number, locationId: number, direction: Direction, reason: string) {
  if (normalizeDreamGateSpeech(reason) !== "брама сну") return null;

  const gate = await prisma.locationFeature.findFirst({
    where: {
      locationId,
      isActive: true,
      key: { in: [...DREAM_GATE_FEATURE_KEYS] },
    },
    select: { id: true, data: true },
  });
  const data = gate ? featureData(gate) : {};
  if (!gate || data.locked !== true || directionFromData(data) !== direction || isLockedFeatureCurrentlyOpen(data)) return null;

  const existing = await prisma.worldEvent.findFirst({
    where: {
      playerId,
      type: "SYSTEM",
      title: DREAM_GATE_LOCK_HINT_EVENT_TITLE,
    },
    select: { id: true },
  });
  if (existing) return null;

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: DREAM_GATE_LOCK_HINT_EVENT_TITLE,
      description: `${locationId}:${direction}`,
      playerId,
      locationId,
    },
  });

  return "Сон шепоче: «Брама зімкнена. Спробуй оглянути браму.»";
}

export async function locationLockedExitMessageForPlayer(playerId: number, locationId: number, direction: Direction) {
  const locked = await lockedExitDirections(locationId);
  const reason = locked.get(direction);
  if (!reason) return null;

  const base = `${lockedReasonLabel(reason)} (закрито).`;
  const hint = await firstDreamGateLockHint(playerId, locationId, direction, reason);
  return hint ? `${base}\n\n${hint}` : base;
}

const DIRECTION_PATH_LABELS: Partial<Record<Direction, string>> = {
  NORTH: "північний прохід",
  SOUTH: "південний прохід",
  EAST: "східний прохід",
  WEST: "західний прохід",
  UP: "прохід угору",
  DOWN: "прохід униз",
  INSIDE: "прохід усередину",
  OUTSIDE: "прохід назовні",
};

type LocalGateFeature = {
  key?: string | null;
  name?: string | null;
  type?: string | null;
  data: Prisma.JsonValue | null;
};

const GENERIC_GATE_TARGETS = new Set([
  "gate",
  "gates",
  "door",
  "doors",
  "ворота",
  "воріт",
  "ворітьми",
  "брама",
  "браму",
  "брами",
  "брамою",
  "двері",
]);

function normalizeGateQuery(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("uk-UA")
    .replace(/[^\p{L}\p{N}\s_-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stringListFromData(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function localGateSearchKeys(feature: LocalGateFeature) {
  const data = featureData(feature);
  const direction = directionFromData(data);
  const aliases = [
    ...stringListFromData(data, "aliases"),
    ...stringListFromData(data, "open_aliases"),
    ...stringListFromData(data, "openable_aliases"),
  ];
  return [
    feature.name,
    feature.key,
    feature.type,
    "ворота",
    "брама",
    "gate",
    direction ? directionLabels[direction] : undefined,
    direction ? DIRECTION_PATH_LABELS[direction] : undefined,
    ...aliases,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map(normalizeGateQuery)
    .filter(Boolean);
}

function gateMatchesQuery(feature: LocalGateFeature, targetQuery: string) {
  const normalizedTarget = normalizeGateQuery(targetQuery);
  if (!normalizedTarget) return true;
  if (GENERIC_GATE_TARGETS.has(normalizedTarget)) return true;
  return localGateSearchKeys(feature).some((key) => key === normalizedTarget || key.includes(normalizedTarget) || normalizedTarget.includes(key));
}

function isDreamGateFeatureKey(key?: string | null) {
  return DREAM_GATE_FEATURE_KEYS.includes(String(key) as typeof DREAM_GATE_FEATURE_KEYS[number]);
}

function pickLocalGateForOpenAttempt(gates: LocalGateFeature[], targetQuery: string) {
  const matchingGates = gates.filter((gate) => gateMatchesQuery(gate, targetQuery));
  return matchingGates.find((gate) => !isDreamGateFeatureKey(gate.key)) ?? matchingGates[0] ?? null;
}

export function localGateOpenAttemptText(feature: LocalGateFeature) {
  const data = featureData(feature);
  const name = feature.name?.trim() || "Ворота";
  const direction = directionFromData(data);
  const directionText = direction ? DIRECTION_PATH_LABELS[direction] ?? "прохід" : "прохід";

  if (data.openable === false) {
    return [
      `Ворота тут є: ${name}.`,
      "",
      `Ви пробуєте відчинити їх, але засув не піддається. Це не та брама, яку можна просто відкрити командою; ${directionText} відкриється лише за певних умов.`,
    ].join("\n");
  }

  if (data.locked === true) {
    return [
      `Ворота тут є: ${name}.`,
      "",
      `Ви пробуєте відчинити їх, але вони лишаються замкненими. ${directionText} поки закритий.`,
    ].join("\n");
  }

  return [
    `Ворота тут є: ${name}.`,
    "",
    "Ви пробуєте їх відчинити, але світ поки не має для цього окремого правила.",
  ].join("\n");
}

export async function openDreamGate(playerId: number, targetQuery = "") {
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) throw new Error("Спершу треба увійти у світ.");

  const feature = await prisma.locationFeature.findFirst({
    where: { key: { in: [...DREAM_GATE_FEATURE_KEYS] }, locationId: player.currentLocationId, isActive: true },
  });
  if (!feature || !gateMatchesQuery(feature, targetQuery)) {
    const localGates = await prisma.locationFeature.findMany({
      where: { locationId: player.currentLocationId, isActive: true, type: "GATE" },
      orderBy: { id: "asc" },
      select: { key: true, name: true, type: true, data: true },
    });
    const localGate = pickLocalGateForOpenAttempt(localGates, targetQuery);
    if (localGate) return localGateOpenAttemptText(localGate);
    return targetQuery.trim()
      ? `Поруч немає воріт чи брами з такою назвою: «${targetQuery.trim()}».`
      : "Тут немає воріт, які можна відкрити.";
  }

  const alreadyOpenText = dreamGateAlreadyOpenText(feature);
  if (alreadyOpenText) return alreadyOpenText;

  const previousOpens = await prisma.worldEvent.count({
    where: {
      playerId,
      type: "SYSTEM",
      title: "Tutorial dream gate opened",
    },
  });
  const openDurationMs = DREAM_GATE_OPEN_WINDOWS_MS[previousOpens % DREAM_GATE_OPEN_WINDOWS_MS.length] ?? DREAM_GATE_OPEN_MS;
  const openUntil = new Date(Date.now() + openDurationMs).toISOString();
  const gateFeatures = await prisma.locationFeature.findMany({
    where: { key: { in: [...DREAM_GATE_FEATURE_KEYS] }, isActive: true },
  });

  for (const gateFeature of gateFeatures) {
    const data = featureData(gateFeature);
    await prisma.locationFeature.update({
      where: { id: gateFeature.id },
      data: {
        data: {
          ...data,
          locked: true,
          open_until: openUntil,
          opened_at: new Date().toISOString(),
          open_duration_ms: openDurationMs,
        } as Prisma.InputJsonValue,
      },
    });
  }

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: "Tutorial dream gate opened",
      description: `dream gate unlocked; durationMs=${openDurationMs}`,
      playerId,
      locationId: player.currentLocationId,
    },
  });

  return DREAM_GATE_OPENED_TEXT;
}

export function lockedExitLabel(direction: Direction, reason: string) {
  return `${directionLabels[direction] ?? direction} — ${lockedReasonLabel(reason)} (закрито)`;
}
