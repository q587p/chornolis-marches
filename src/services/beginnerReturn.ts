import { PlayerPosture } from "@prisma/client";
import { prisma } from "../db";
import { BASE_STAMINA } from "../gameConfig";
import { START_LOCATION_KEY, getStartLocationId } from "./players";
import { fatigueStateFor } from "./actionRecovery";

export const BEGINNER_RETURN_COMMAND = "/respawn";
export const BEGINNER_RETURN_PROGRESS_LIMIT = 800;
export const BEGINNER_RETURN_COOLDOWN_MS = 30 * 60 * 1000;
export const BEGINNER_RETURN_NEW_PLAYER_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
export const BEGINNER_RETURN_EVENT_TITLE = "Player used respawn return";

type BeginnerReturnPlayer = {
  id: number;
  telegramId?: string | null;
  currentLocationId?: number | null;
  hp: number;
  hpMax?: number | null;
  stamina: number;
  staminaMax?: number | null;
  steps?: number | null;
  looks?: number | null;
  says?: number | null;
  successfulGathers?: number | null;
  animalsKilled?: number | null;
  restStarts?: number | null;
  createdAt?: Date | null;
};

export type BeginnerReturnEligibility =
  | { ok: true; reason: "beginner" | "weak" }
  | { ok: false; reason: "no-location" | "already-home" | "cooldown" | "established"; remainingMs?: number };

export function beginnerReturnProgressScore(player: Pick<BeginnerReturnPlayer, "steps" | "looks" | "says" | "successfulGathers" | "animalsKilled" | "restStarts">) {
  return (
    Math.max(0, player.steps ?? 0) +
    Math.max(0, player.looks ?? 0) +
    Math.max(0, player.says ?? 0) +
    Math.max(0, player.successfulGathers ?? 0) * 2 +
    Math.max(0, player.restStarts ?? 0) * 3 +
    Math.max(0, player.animalsKilled ?? 0) * 25
  );
}

export function beginnerReturnStaminaAfter(player: Pick<BeginnerReturnPlayer, "stamina" | "staminaMax">) {
  const max = player.staminaMax ?? BASE_STAMINA;
  const lowered = Math.ceil(max / 3);
  return Math.max(1, Math.min(player.stamina, lowered));
}

export function withinBeginnerReturnNewPlayerGrace(player: Pick<BeginnerReturnPlayer, "createdAt">, now = new Date()) {
  if (!player.createdAt) return false;
  return now.getTime() - player.createdAt.getTime() <= BEGINNER_RETURN_NEW_PLAYER_GRACE_MS;
}

export function beginnerReturnEligibility(
  player: BeginnerReturnPlayer,
  options: { startLocationId: number; lastUsedAt?: Date | null; now?: Date }
): BeginnerReturnEligibility {
  if (!player.currentLocationId) return { ok: false, reason: "no-location" };
  if (player.currentLocationId === options.startLocationId) return { ok: false, reason: "already-home" };

  const now = options.now ?? new Date();
  if (options.lastUsedAt) {
    const remainingMs = BEGINNER_RETURN_COOLDOWN_MS - (now.getTime() - options.lastUsedAt.getTime());
    if (remainingMs > 0) return { ok: false, reason: "cooldown", remainingMs };
  }

  const hpMax = player.hpMax ?? 20;
  const staminaMax = player.staminaMax ?? BASE_STAMINA;
  const weak = player.hp <= Math.ceil(hpMax / 2) || player.stamina <= Math.ceil(staminaMax / 4);
  if (weak) return { ok: true, reason: "weak" };
  if (withinBeginnerReturnNewPlayerGrace(player, now)) return { ok: true, reason: "beginner" };

  return beginnerReturnProgressScore(player) <= BEGINNER_RETURN_PROGRESS_LIMIT
    ? { ok: true, reason: "beginner" }
    : { ok: false, reason: "established" };
}

export function beginnerReturnCooldownText(remainingMs: number) {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  if (minutes === 1) return "приблизно хвилину";
  if (minutes < 5) return `приблизно ${minutes} хвилини`;
  return `приблизно ${minutes} хвилин`;
}

export function beginnerReturnRefusalText(eligibility: BeginnerReturnEligibility) {
  if (eligibility.ok) return "";
  if (eligibility.reason === "no-location") return "Стежка не знаходить, звідки вас забрати. Напишіть /start, щоб відновити вхід у світ.";
  if (eligibility.reason === "already-home") return "Ви вже біля межового табору. Стежка повернення тихо лежить під ногами й нікуди не тягне.";
  if (eligibility.reason === "cooldown") {
    return `Стежка повернення ще не встигла зарости новою росою. Спробуйте знову за ${beginnerReturnCooldownText(eligibility.remainingMs ?? 0)}.`;
  }
  return "Стежка назад більше не слухається так легко. Ви вже занадто міцно тримаєтеся цього світу, щоб Порубіжжя просто винесло вас до табору.";
}

export function beginnerReturnPromptText() {
  return [
    "Якщо ви справді заблукали, можна попросити Порубіжжя повернути вас до межового табору.",
    "",
    "Це не швидкий шлях і не зручна телепортація: стежка забере частину снаги, зіб’є поточні дії й лишить у пам’яті світу слід повернення.",
  ].join("\n");
}

export function beginnerReturnSuccessText(reason: "beginner" | "weak") {
  const opening = reason === "weak"
    ? "Порубіжжя чує втому раніше, ніж ви встигаєте впертися в неї до кінця."
    : "Порубіжжя впізнає ще свіжий слід і не дає йому загубитися назавжди.";

  return [
    opening,
    "",
    "Між деревами на мить проступає стара зарубка. Ви йдете за нею не зовсім кроком і не зовсім сном; гілля змикається за спиною, а попереду знову чути межовий табір.",
    "",
    "Снага після такого повернення збивається, зате дорога знову має початок.",
  ].join("\n");
}

async function lastBeginnerReturnAt(playerId: number) {
  const event = await prisma.worldEvent.findFirst({
    where: { title: BEGINNER_RETURN_EVENT_TITLE, playerId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return event?.createdAt ?? null;
}

export async function checkBeginnerReturnForPlayer(playerId: number) {
  const [player, startLocationId] = await Promise.all([
    prisma.player.findUnique({ where: { id: playerId } }),
    getStartLocationId(),
  ]);
  if (!player) return null;

  const lastUsedAt = await lastBeginnerReturnAt(player.id);
  return {
    player,
    startLocationId,
    eligibility: beginnerReturnEligibility(player, { startLocationId, lastUsedAt }),
  };
}

export async function performBeginnerReturn(playerId: number) {
  const checked = await checkBeginnerReturnForPlayer(playerId);
  if (!checked) return null;
  if (!checked.eligibility.ok) return { ...checked, moved: false as const };

  const fromLocationId = checked.player.currentLocationId;
  const stamina = beginnerReturnStaminaAfter(checked.player);
  await prisma.$transaction([
    prisma.worldAction.updateMany({
      where: { actorType: "PLAYER", playerId, status: { in: ["QUEUED", "RUNNING"] } },
      data: { status: "CANCELLED", note: "перервано поверненням" },
    }),
    prisma.player.update({
      where: { id: playerId },
      data: {
        currentLocationId: checked.startLocationId,
        stamina,
        fatigueState: fatigueStateFor(stamina, checked.player.staminaMax ?? BASE_STAMINA),
        posture: PlayerPosture.STANDING,
        sleepState: "AWAKE",
        isResting: false,
        isAutoEnabled: false,
        sessionPresence: "ACTIVE",
        remindersPaused: false,
        lastPlayerActionAt: new Date(),
      },
    }),
    prisma.worldEvent.create({
      data: {
        type: "PLAYER_ACTION",
        title: BEGINNER_RETURN_EVENT_TITLE,
        description: `player=${playerId}; from=${fromLocationId ?? "unknown"}; to=${START_LOCATION_KEY}; reason=${checked.eligibility.reason}; stamina=${stamina}`,
        playerId,
        locationId: checked.startLocationId,
      },
    }),
  ]);
  return {
    ...checked,
    moved: true as const,
    text: beginnerReturnSuccessText(checked.eligibility.reason),
  };
}
