import type { Bot } from "grammy";
import { PlayerSleepState } from "@prisma/client";
import { prisma } from "../db";
import { escapeHtml } from "../utils/text";
import { playerForms } from "./grammar";
import { notifyLocationExcept } from "./notifications";
import { assertCanPerformPhysicalAction } from "./postureRules";
import { hasActiveLitTorchForPlayer } from "./fire";
import { canShowFeatureDetails, visibilityRulesForLocation, type VisibilityRules } from "./visibility";

export const ATTENTION_ROOT_GAP_FEATURE_KEY = "start_cellar_root_gap";
export const ATTENTION_ROOT_GAP_SOURCE_KEY = "start_border_cellar";
export const ATTENTION_ROOT_GAP_DESTINATION_KEY = "start_cellar_root_pocket";
export const ATTENTION_ROOT_GAP_EVENT_TITLE = "Attention-gated root pocket passage";

type AttentionGateFeature = {
  key?: string | null;
  data?: unknown | null;
};

function featureData(feature: AttentionGateFeature) {
  return feature.data && typeof feature.data === "object" && !Array.isArray(feature.data)
    ? feature.data as Record<string, unknown>
    : {};
}

export function isAttentionRootGapFeature(feature: AttentionGateFeature) {
  return feature.key === ATTENTION_ROOT_GAP_FEATURE_KEY
    || featureData(feature).attention_gate === "root_gap_light";
}

export function attentionRootGapDarkOutline() {
  return "під корінням є темніша пляма, але без світла вона зливається з землею";
}

export function attentionRootGapDarkInspectionText() {
  return [
    "🕳 <i>Щілина під старим коренем</i>",
    "",
    "Під корінням є темніша пляма. Без світла вона лишається тільки плямою: земля, тінь і кілька подряпин, які не складаються в певний шлях.",
  ].join("\n");
}

export function attentionRootGapRevealText() {
  return [
    "Світло знаходить не яму, а вузьку суху щілину. Хтось малий або дуже терплячий уже проходив тут боком.",
    "",
    "Це не стежка для поспіху й не сховище здобичі. Якщо пролізти обережно, можна опинитися у низькій кишені під корінням.",
  ].join("\n");
}

export function attentionRootGapButtonLabel() {
  return "🕳 Пролізти в щілину";
}

export function canRevealAttentionRootGap(visibility: VisibilityRules, options: { playerHasLitTorch?: boolean } = {}) {
  return canShowFeatureDetails(visibility) || options.playerHasLitTorch === true;
}

export async function canPlayerRevealAttentionRootGap(playerId: number, locationId: number) {
  const visibility = await visibilityRulesForLocation(locationId, "details");
  if (canRevealAttentionRootGap(visibility)) return true;
  return hasActiveLitTorchForPlayer(playerId);
}

export function attentionRootGapUseDecision(input: {
  playerLocationId?: number | null;
  playerLocationKey?: string | null;
  feature?: (AttentionGateFeature & { id: number; locationId: number; isActive?: boolean | null }) | null;
  visibility: VisibilityRules;
  playerHasLitTorch?: boolean;
}) {
  if (!input.playerLocationId || input.playerLocationKey !== ATTENTION_ROOT_GAP_SOURCE_KEY) {
    return { ok: false as const, reason: "wrong-location" as const };
  }

  const feature = input.feature;
  if (!feature || !feature.isActive || feature.locationId !== input.playerLocationId || !isAttentionRootGapFeature(feature)) {
    return { ok: false as const, reason: "missing-feature" as const };
  }

  if (!canRevealAttentionRootGap(input.visibility, { playerHasLitTorch: input.playerHasLitTorch })) {
    return { ok: false as const, reason: "dark" as const, featureId: feature.id };
  }

  return { ok: true as const, featureId: feature.id };
}

export function attentionRootGapEventDescription(playerId: number) {
  return `player=${playerId}; source=${ATTENTION_ROOT_GAP_SOURCE_KEY}; destination=${ATTENTION_ROOT_GAP_DESTINATION_KEY}; feature=${ATTENTION_ROOT_GAP_FEATURE_KEY}; gate=light_examine`;
}

export async function findLocalAttentionRootGapFeature(playerId: number) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { currentLocationId: true },
  });
  if (!player?.currentLocationId) return null;
  return prisma.locationFeature.findFirst({
    where: {
      key: ATTENTION_ROOT_GAP_FEATURE_KEY,
      locationId: player.currentLocationId,
      isActive: true,
    },
    orderBy: { id: "asc" },
  });
}

export async function attentionRootGapCanBeUsedByPlayer(playerId: number, featureId?: number | null) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { currentLocation: { select: { id: true, key: true } } },
  });
  if (!player?.currentLocationId || player.currentLocation?.key !== ATTENTION_ROOT_GAP_SOURCE_KEY) {
    return { ok: false as const, reason: "wrong-location" as const };
  }

  const feature = featureId
    ? await prisma.locationFeature.findUnique({ where: { id: featureId }, include: { location: true } })
    : await findLocalAttentionRootGapFeature(player.id);
  if (!feature || !feature.isActive || feature.locationId !== player.currentLocationId || !isAttentionRootGapFeature(feature)) {
    return { ok: false as const, reason: "missing-feature" as const };
  }

  const [visibility, playerHasLitTorch] = await Promise.all([
    visibilityRulesForLocation(feature.locationId, "details"),
    hasActiveLitTorchForPlayer(player.id),
  ]);
  const decision = attentionRootGapUseDecision({
    playerLocationId: player.currentLocationId,
    playerLocationKey: player.currentLocation?.key,
    feature,
    visibility,
    playerHasLitTorch,
  });
  if (!decision.ok) {
    return decision;
  }

  return { ok: true as const, player, featureId: decision.featureId };
}

export function attentionRootGapFailureText(reason: "wrong-location" | "missing-feature" | "dark") {
  if (reason === "dark") {
    return "Під корінням щось темніє, але без світла це не стає шляхом. Запаліть факел або знайдіть інше світло, а тоді роздивіться щілину знову.";
  }
  if (reason === "wrong-location") return "Тут немає тієї низької щілини, яку можна було б обережно пройти.";
  return "Поруч не видно щілини, через яку можна пролізти.";
}

export async function enterAttentionRootGap(bot: Bot, input: {
  playerId: number;
  featureId?: number | null;
}) {
  const usable = await attentionRootGapCanBeUsedByPlayer(input.playerId, input.featureId);
  if (!usable.ok) {
    return { ok: false as const, text: attentionRootGapFailureText(usable.reason) };
  }

  const { player } = usable;
  assertCanPerformPhysicalAction(player, "MOVE");

  if ((player.hp ?? 0) <= 0 || player.sleepState !== PlayerSleepState.AWAKE) {
    return { ok: false as const, text: "Зараз тіло не відповідає на такий низький хід." };
  }

  const destination = await prisma.cellLocation.findUnique({
    where: { key: ATTENTION_ROOT_GAP_DESTINATION_KEY },
    select: { id: true },
  });
  if (!destination) return { ok: false as const, text: "Щілина є, але далі земля не тримає певного місця." };

  const sourceLocationId = player.currentLocationId;
  if (!sourceLocationId) {
    return { ok: false as const, text: "Щілина на мить є, але ваш крок не знаходить її знову." };
  }
  const forms = playerForms(player);
  const moved = await prisma.$transaction(async (tx) => {
    const updated = await tx.player.updateMany({
      where: {
        id: player.id,
        currentLocationId: sourceLocationId,
        hp: { gt: 0 },
        isResting: false,
        sleepState: PlayerSleepState.AWAKE,
      },
      data: {
        currentLocationId: destination.id,
        steps: { increment: 1 },
        lastActionAt: new Date(),
        lastPlayerActionAt: new Date(),
      },
    });
    if (updated.count === 0) return false;

    await tx.worldEvent.create({
      data: {
        type: "PLAYER_ACTION",
        title: ATTENTION_ROOT_GAP_EVENT_TITLE,
        description: attentionRootGapEventDescription(player.id),
        playerId: player.id,
        locationId: sourceLocationId,
      },
    });
    return true;
  });
  if (!moved) return { ok: false as const, text: "Щілина на мить є, але ваш крок не знаходить її знову." };

  await notifyLocationExcept(
    bot,
    sourceLocationId,
    [player.id],
    `${escapeHtml(forms.nominative)} пригинається біля старого кореня й зникає з прямого погляду.`,
    { parseMode: "HTML" },
  );
  await notifyLocationExcept(
    bot,
    destination.id,
    [player.id],
    `${escapeHtml(forms.nominative)} обережно пролазить крізь коріння.`,
    { parseMode: "HTML" },
  );

  const text = "Тепер, коли світло бере корінь збоку, щілина стає шляхом.\n\nВи пригинаєтесь нижче, ніж зручно, і повільно просуваєтесь боком. Коріння шкрябає плече, суха глина тримає коліно, а потім вузьке місце раптом стає низькою кишенею під землею.";
  return { ok: true as const, text, destinationLocationId: destination.id };
}
