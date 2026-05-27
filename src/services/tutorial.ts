import { Direction, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { getStartLocationId } from "./players";
import { directionLabels } from "../ui/labels";

export const TUTORIAL_REGION_KEY = "dream_tutorial";
export const TUTORIAL_START_LOCATION_KEY = "dream_tutorial_threshold";
export const TUTORIAL_SECOND_STEP_LOCATION_KEY = "dream_tutorial_second_step";
export const TUTORIAL_GATE_LOCATION_KEY = "dream_tutorial_gate";
export const TUTORIAL_HUB_LOCATION_KEY = "dream_tutorial_hub";
export const DREAM_GATE_FEATURE_KEY = "dream_tutorial_sleep_gate";
export const DREAM_GATE_OPEN_MS = 30 * 1000;

const RETURN_LOCATION_EVENT_TITLE = "Tutorial return location";
const DREAM_LOCATION_EVENT_TITLE = "Tutorial dream location";
const COMPLETED_EVENT_TITLE = "Tutorial completed";

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

export function isTutorialLocation(location: { key: string; z: number; region?: { key: string } | null }) {
  return location.z === -13 || location.region?.key === TUTORIAL_REGION_KEY || location.key.startsWith("dream_tutorial_");
}

export function isDreamGateFeature(feature: { key: string; data: Prisma.JsonValue | null }) {
  return feature.key === DREAM_GATE_FEATURE_KEY || featureData(feature).tutorial_gate === true;
}

export function dreamGateStatusText(feature: { data: Prisma.JsonValue | null }) {
  const data = featureData(feature);
  return isLockedFeatureCurrentlyOpen(data)
    ? "Брама прочинена. Сон за нею дихає холодом і кличе на південь."
    : "Брама зімкнена. На дереві проступає знак: не всі шляхи є шляхами, доки їх не покличеш.";
}

export async function getTutorialStartLocationId() {
  const location = await prisma.cellLocation.findUnique({ where: { key: TUTORIAL_START_LOCATION_KEY } });
  if (!location) throw new Error(`Tutorial start location "${TUTORIAL_START_LOCATION_KEY}" not found. Run npm run seed first.`);
  return location.id;
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
      entered: false,
      text: "Сон уже тримає вас. Ви пам’ятаєте своє ім’я і майже нічого більше.",
    };
  }

  await rememberPlayerLocation(player.id, RETURN_LOCATION_EVENT_TITLE, currentLocationId);

  const savedDreamLocationId = options.forceStart
    ? null
    : await validLocationId(await latestPlayerEventLocation(player.id, DREAM_LOCATION_EVENT_TITLE), true);
  const locationId = savedDreamLocationId ?? await getTutorialStartLocationId();

  await prisma.player.update({ where: { id: player.id }, data: { currentLocationId: locationId } });
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
    entered: true,
    text: "Вам здається, що ви засинаєте стоячи. Десь поруч шумить Чорноліс, але тут, у сні, лишається тільки ім’я і кілька кроків попереду.",
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
  return `Закрито (${reason}).`;
}

export async function openDreamGate(playerId: number) {
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) throw new Error("Спершу треба увійти у світ.");

  const feature = await prisma.locationFeature.findFirst({
    where: { key: DREAM_GATE_FEATURE_KEY, locationId: player.currentLocationId, isActive: true },
  });
  if (!feature) return "Тут немає воріт, які можна відкрити.";

  const data = featureData(feature);
  const openUntil = new Date(Date.now() + Number(data.reset_after_ms ?? data.resetAfterMs ?? DREAM_GATE_OPEN_MS)).toISOString();
  await prisma.locationFeature.update({
    where: { id: feature.id },
    data: {
      data: {
        ...data,
        locked: true,
        open_until: openUntil,
        opened_at: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  });

  await prisma.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: "Tutorial dream gate opened",
      description: "south unlocked",
      playerId,
      locationId: player.currentLocationId,
    },
  });

  return "Брама Сну розходиться без скрипу. Південний шлях відкритий, але сон не любить чекати.";
}

export function lockedExitLabel(direction: Direction, reason: string) {
  return `${directionLabels[direction] ?? direction} — закрито (${reason})`;
}
