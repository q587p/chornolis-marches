import { prisma } from "../db";

export const CAMPFIRE_DURATION_MS = 16 * 60_000;
export const CAMPFIRE_FADING_MS = 4 * 60_000;
export const CAMPFIRE_TWIGS_AFTER_MS = 2 * 60_000;
export const TORCH_DURATION_MS = 10 * 60_000;
export const TORCH_FADING_MS = 2 * 60_000;

const TORCH_KEY = "torch";
const LIT_TORCH_KEY = "lit_torch";

type JsonRecord = Record<string, unknown>;

function jsonRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function dateFromJson(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function timedFireData(createdBy: string) {
  const litAt = new Date();
  const expiresAt = new Date(litAt.getTime() + CAMPFIRE_DURATION_MS);
  return {
    debug: true,
    is_campfire: true,
    created_by: createdBy,
    magical: false,
    litAt: litAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    durationMs: CAMPFIRE_DURATION_MS,
  };
}

function extinguishedFireData(data: unknown) {
  return {
    ...jsonRecord(data),
    is_campfire: true,
    extinguished: true,
    extinguishedAt: new Date().toISOString(),
  };
}

function relitFireData(data: unknown, createdBy: string) {
  const base = timedFireData(createdBy);
  return {
    ...jsonRecord(data),
    ...base,
    extinguished: false,
    relitAt: base.litAt,
  };
}

function remainingMs(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() - now.getTime();
}

export function campfireExpiresAt(feature: { data?: unknown | null }) {
  return dateFromJson(jsonRecord(feature.data).expiresAt);
}

export function campfireLitAt(feature: { data?: unknown | null; createdAt?: Date | string | null }) {
  return dateFromJson(jsonRecord(feature.data).litAt) ?? (feature.createdAt ? new Date(feature.createdAt) : null);
}

export function isTimedCampfireExpired(feature: { data?: unknown | null }, now = new Date()) {
  if (jsonRecord(feature.data).extinguished) return false;
  const expiresAt = campfireExpiresAt(feature);
  return Boolean(expiresAt && remainingMs(expiresAt, now) <= 0);
}

export function isExtinguishedCampfire(feature: { data?: unknown | null; providesLight?: boolean | null }) {
  const data = jsonRecord(feature.data);
  return Boolean(data.extinguished) || Boolean(campfireExpiresAt(feature) && !feature.providesLight);
}

export function isCampfireFading(feature: { data?: unknown | null }, now = new Date()) {
  const expiresAt = campfireExpiresAt(feature);
  const left = expiresAt ? remainingMs(expiresAt, now) : CAMPFIRE_DURATION_MS;
  return left > 0 && left <= CAMPFIRE_FADING_MS;
}

export function canAddTwigsToCampfire(feature: { data?: unknown | null; createdAt?: Date | string | null }, now = new Date()) {
  const litAt = campfireLitAt(feature);
  return Boolean(litAt && now.getTime() - litAt.getTime() >= CAMPFIRE_TWIGS_AFTER_MS);
}

export function campfireStateLine(feature: { data?: unknown | null }) {
  if (isExtinguishedCampfire(feature)) return "згасло; не дає світла";
  if (isCampfireFading(feature)) return "полум'я нижчає; скоро згасне, варто додати хмизу";
  return null;
}

export async function expireTimedCampfires(locationId?: number | null) {
  const features = await prisma.locationFeature.findMany({
    where: {
      isActive: true,
      type: { in: ["CAMPFIRE", "MAGIC_CAMPFIRE"] },
      ...(locationId ? { locationId } : {}),
    },
    select: { id: true, data: true },
  });

  const expired = features.filter((feature) => isTimedCampfireExpired(feature));
  if (!expired.length) return 0;

  for (const feature of expired) {
    await prisma.locationFeature.update({
      where: { id: feature.id },
      data: {
        name: "Згасле вогнище",
        isActive: true,
        providesLight: false,
        restStaminaCapMultiplier: null,
        data: extinguishedFireData(feature.data),
      },
    });
  }
  return expired.length;
}

export async function createDebugCampfire(locationId: number) {
  const key = `debug_campfire_${locationId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return prisma.locationFeature.create({
    data: {
      key,
      locationId,
      type: "CAMPFIRE",
      name: "Вогнище",
      description: "Звичайне вогнище потріскує й дає тепле світло. Воно не має магічної сили незгасного полум'я.",
      isActive: true,
      providesLight: true,
      restStaminaCapMultiplier: null,
      data: timedFireData("addCampfire"),
    },
  });
}

export async function ensureTorchResourceTypes() {
  const [torch, litTorch] = await Promise.all([
    prisma.resourceType.upsert({
      where: { key: TORCH_KEY },
      update: { name: "факел", description: "Сухий факел, який можна підпалити біля вогнища." },
      create: { key: TORCH_KEY, name: "факел", description: "Сухий факел, який можна підпалити біля вогнища." },
    }),
    prisma.resourceType.upsert({
      where: { key: LIT_TORCH_KEY },
      update: { name: "запалений факел", description: "Факел, що ще тримає полум'я." },
      create: { key: LIT_TORCH_KEY, name: "запалений факел", description: "Факел, що ще тримає полум'я." },
    }),
  ]);
  return { torch, litTorch };
}

export async function syncPlayerTorchState(playerId: number) {
  const { torch, litTorch } = await ensureTorchResourceTypes();
  const lit = await prisma.playerResource.findUnique({
    where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } },
  });

  if (!lit || lit.amount <= 0) return;
  if (Date.now() - lit.updatedAt.getTime() < TORCH_DURATION_MS) return;

  await prisma.$transaction([
    prisma.playerResource.delete({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } } }),
    prisma.playerResource.upsert({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: torch.id } },
      update: { amount: { increment: lit.amount } },
      create: { playerId, resourceTypeId: torch.id, amount: lit.amount },
    }),
  ]);
}

export async function getPlayerTorchState(playerId: number) {
  await syncPlayerTorchState(playerId);
  const { torch, litTorch } = await ensureTorchResourceTypes();
  const [plain, lit] = await Promise.all([
    prisma.playerResource.findUnique({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: torch.id } } }),
    prisma.playerResource.findUnique({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } } }),
  ]);

  const litAt = lit && lit.amount > 0 ? lit.updatedAt : null;
  const expiresAt = litAt ? new Date(litAt.getTime() + TORCH_DURATION_MS) : null;
  const left = expiresAt ? remainingMs(expiresAt) : 0;
  return {
    hasTorch: Boolean((plain?.amount ?? 0) > 0 || (lit?.amount ?? 0) > 0),
    isLit: Boolean(litAt && left > 0),
    isFading: Boolean(litAt && left > 0 && left <= TORCH_FADING_MS),
    litAt,
    expiresAt,
  };
}

export async function lightPlayerTorchAtCampfire(playerId: number, featureId: number) {
  await expireTimedCampfires();
  await syncPlayerTorchState(playerId);
  const { torch, litTorch } = await ensureTorchResourceTypes();
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  const feature = await prisma.locationFeature.findUnique({ where: { id: featureId }, select: { id: true, locationId: true, isActive: true, type: true, providesLight: true, key: true, name: true } });
  if (!player?.currentLocationId || !feature?.isActive || player.currentLocationId !== feature.locationId || !feature.providesLight) {
    return "Біля цього вогню вже не вдається підпалити факел.";
  }

  const plain = await prisma.playerResource.findUnique({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: torch.id } } });
  const lit = await prisma.playerResource.findUnique({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } } });
  const wasLit = Boolean(lit && lit.amount > 0);
  if (!wasLit && (!plain || plain.amount <= 0)) {
    return "Потрібен факел у речах, щоб підпалити його біля вогнища.";
  }

  const consumePlainTorch =
    plain && plain.amount > 0 && !wasLit
      ? plain.amount > 1
        ? prisma.playerResource.update({
            where: { playerId_resourceTypeId: { playerId, resourceTypeId: torch.id } },
            data: { amount: { decrement: 1 } },
          })
        : prisma.playerResource.delete({
            where: { playerId_resourceTypeId: { playerId, resourceTypeId: torch.id } },
          })
      : null;

  await prisma.$transaction([
    ...(consumePlainTorch ? [consumePlainTorch] : []),
    prisma.playerResource.upsert({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } },
      update: { amount: Math.max(1, lit?.amount ?? 1), updatedAt: new Date() },
      create: { playerId, resourceTypeId: litTorch.id, amount: 1 },
    }),
  ]);

  return wasLit
    ? "🔥 Ви оновили вогонь на факелі. Полум'я знову триматиметься довше."
    : "🔥 Ви підпалили факел. Тепер він дає світло поруч із вами.";
}

export async function lightCampfireFromTorch(playerId: number, featureId: number) {
  await expireTimedCampfires();
  const { litTorch } = await ensureTorchResourceTypes();
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { currentLocationId: true } });
  const feature = await prisma.locationFeature.findUnique({ where: { id: featureId }, select: { id: true, locationId: true, isActive: true, type: true, data: true } });
  if (!player?.currentLocationId || !feature?.isActive || player.currentLocationId !== feature.locationId || feature.type !== "CAMPFIRE") {
    return "Це вогнище вже не вдається підпалити.";
  }

  const lit = await prisma.playerResource.findUnique({ where: { playerId_resourceTypeId: { playerId, resourceTypeId: litTorch.id } } });
  const litAt = lit && lit.amount > 0 ? lit.updatedAt : null;
  if (!litAt || Date.now() - litAt.getTime() >= TORCH_DURATION_MS) {
    await syncPlayerTorchState(playerId);
    return "Потрібен запалений факел, щоб підпалити це вогнище.";
  }

  await prisma.locationFeature.update({
    where: { id: feature.id },
    data: {
      name: "Вогнище",
      providesLight: true,
      restStaminaCapMultiplier: null,
      data: relitFireData(feature.data, "torch"),
    },
  });

  return "🔥 Ви підпалили вогнище від факела. Полум'я розгоряється й дає світло навколо.";
}

export async function hasActiveTorchLightAtLocation(locationId: number) {
  const litTorch = await prisma.resourceType.findUnique({ where: { key: LIT_TORCH_KEY } });
  if (!litTorch) return false;
  const activeSince = new Date(Date.now() - TORCH_DURATION_MS);
  const count = await prisma.playerResource.count({
    where: {
      resourceTypeId: litTorch.id,
      amount: { gt: 0 },
      updatedAt: { gt: activeSince },
      player: { currentLocationId: locationId },
    },
  });
  return count > 0;
}

export async function hasActiveLightAtLocation(locationId: number) {
  await expireTimedCampfires(locationId);
  const [featureLight, torchLight] = await Promise.all([
    prisma.locationFeature.count({ where: { locationId, isActive: true, providesLight: true } }),
    hasActiveTorchLightAtLocation(locationId),
  ]);
  return featureLight > 0 || torchLight;
}

export function addTwigsPlaceholderText() {
  return "Хмиз поки ще не працює: команда /add twigs campfire уже зарезервована, але реалізація підкидання хмизу чекає наступного кроку.";
}
