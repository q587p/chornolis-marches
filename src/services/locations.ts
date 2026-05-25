import { InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { ACTION_BASE_TICKS, QUICK_PLAYER_ACTION_DURATION_MS, TICK_MS, gatherConfig, playerStaminaCostConfig } from "../gameConfig";
import { directionLabels, directionShortLabels } from "../ui/labels";
import { buildMovementKeyboard, buildResourceMenuKeyboard, buildTargetListKeyboard } from "../ui/keyboards";
import { isCampfireFeature } from "./locationFeatures";
import { escapeHtml } from "../utils/text";

const COMPACT_EXIT_ORDER = ["NORTH", "WEST", "SOUTH", "EAST", "UP", "DOWN", "INSIDE", "OUTSIDE"];
const GATHERABLE_RESOURCE_KEYS = ["berries", "mushrooms", "herbs"] as const;

function isVisibleCorpse(c: any) {
  return !c.isAlive && !c.isGone && c.age === "CORPSE";
}

function isVisibleLivingCreature(c: any) {
  return c.isAlive && !c.isGone && !c.isHidden;
}

function visibleTargets(location: any, viewerPlayerId?: number) {
  const players = location.players
    .filter((p: any) => p.id !== viewerPlayerId)
    .map((p: any) => ({ type: "player" as const, id: p.id, label: p.nameNominative ?? p.firstName ?? p.username ?? "мандрівник", canGreet: true }));

  const livingCreatures = location.creatures
    .filter(isVisibleLivingCreature)
    .map((c: any) => ({ type: "creature" as const, id: c.id, label: c.name ?? c.species.name, canGreet: c.species.kind !== "ANIMAL" }));

  const corpses = location.creatures
    .filter(isVisibleCorpse)
    .map((c: any) => ({ type: "creature" as const, id: c.id, label: `труп: ${c.species.name}`, canGreet: false }));

  return [...players, ...livingCreatures, ...corpses];
}

function featureIcon(feature: any) {
  if (isCampfireFeature(feature)) return "🔥";
  if (feature.type === "BORDER_MARKER") return "🪧";
  if (feature.type === "GATE") return "🚪";
  return "✦";
}

function isInteractiveFeature(feature: any) {
  return feature.isActive && ["BORDER_MARKER", "CAMPFIRE", "MAGIC_CAMPFIRE", "GATE", "LANDMARK"].includes(feature.type);
}

function featureLine(feature: any) {
  const parts = [`${featureIcon(feature)} ${feature.name}`];
  if (feature.providesLight) parts.push("дає світло");
  if (feature.restStaminaCapMultiplier) parts.push(`відпочинок до ×${feature.restStaminaCapMultiplier} витривалости`);
  return parts.join(" — ");
}

function featuresText(location: any) {
  const features = (location.features ?? []).filter(isInteractiveFeature);
  if (!features.length) return "";
  return `\n\n${features.map(featureLine).join("\n")}`;
}

function addFeatureButtons(keyboard: InlineKeyboard, features: any[]) {
  for (const feature of features.filter(isInteractiveFeature)) {
    keyboard.text(`${featureIcon(feature)} ${feature.name}`, `feature:${feature.id}`).row();
  }
}

function addInlineRows(target: InlineKeyboard, source: InlineKeyboard) {
  for (const row of source.inline_keyboard) {
    for (const button of row) {
      if ("text" in button && "callback_data" in button) target.text(button.text, button.callback_data);
    }
    target.row();
  }
}

function hasCampfireInLocation(location: any) {
  return Boolean((location.features ?? []).some((feature: any) => feature.isActive && isCampfireFeature(feature)));
}

function presenceText(location: any, viewerPlayerId?: number, revealTargets = false) {
  const targets = visibleTargets(location, viewerPlayerId);
  const hasCharacters = targets.some((t) => t.canGreet);
  const hasAnimals = location.creatures.some((c: any) => isVisibleLivingCreature(c) && c.species.kind === "ANIMAL");
  const hasCorpses = location.creatures.some(isVisibleCorpse);

  if (revealTargets && targets.length) {
    return `\n\nПоруч:\n${targets.map((target) => `- ${escapeHtml(target.label)}${target.canGreet ? "" : " <i>(тварина/об’єкт)</i>"}`).join("\n")}`;
  }

  if (hasCharacters && hasAnimals) return "\n\n<i>Поруч хтось або щось є.</i>";
  if (hasCharacters) return "\n\n<i>Поруч хтось є.</i>";
  if (hasAnimals) return "\n\n<i>Поруч щось ворушиться.</i>";
  if (hasCorpses) return "\n\n<i>Поруч щось лежить нерухомо.</i>";
  return "";
}

function sortedExits(exits: any[]) {
  return [...exits].sort((a, b) => {
    const aIndex = COMPACT_EXIT_ORDER.indexOf(a.direction);
    const bIndex = COMPACT_EXIT_ORDER.indexOf(b.direction);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
}

function compactExitsText(exits: any[]) {
  if (!exits.length) return "Виходів не видно.";
  return `Виходи: ${sortedExits(exits).map((exit) => directionShortLabels[exit.direction] ?? exit.direction).join(" ")}`;
}

function detailedExitsText(exits: any[]) {
  if (!exits.length) return "Виходів не видно.";
  return `Виходи:\n${exits.map((exit) => `- ${directionLabels[exit.direction]} → ${exit.toLocation.name}`).join("\n")}`;
}

function slowResourceSeconds(resourceKey: string) {
  return Math.ceil(((gatherConfig[resourceKey]?.ticks ?? playerStaminaCostConfig.GATHER_SPECIFIC ?? 1) * ACTION_BASE_TICKS * TICK_MS) / 1000);
}

function formatSeconds(ms: number) {
  return Math.max(1, Math.ceil(ms / 1000));
}

async function usesQuickPlayerActionDuration(viewerPlayerId?: number) {
  if (!viewerPlayerId) return false;

  const player = await prisma.player.findUnique({ where: { id: viewerPlayerId }, select: { hp: true, isResting: true, stamina: true } });
  if (!player || player.hp <= 0 || player.isResting || player.stamina <= 0) return false;

  const activeActions = await prisma.worldAction.count({
    where: { actorType: "PLAYER", playerId: viewerPlayerId, status: { in: ["QUEUED", "RUNNING"] } },
  });

  return activeActions === 0;
}

function resourceDurationText(resourceKey: string, quick: boolean) {
  const ms = quick ? QUICK_PLAYER_ACTION_DURATION_MS : slowResourceSeconds(resourceKey) * 1000;
  return ` (${formatSeconds(ms)} с)`;
}

function activeActionLabel(action: any) {
  if (!action) return undefined;
  if (action.type === "MOVE") return "йде";
  if (action.type === "GATHER" || action.type === "GATHER_SPECIFIC") return "збирає";
  if (action.type === "LOOK") return "роздивляється";
  if (action.type === "INSPECT") return "роздивляється";
  if (action.type === "GREET") return "вітається";
  if (action.type === "ATTACK") return "атакує";
  if (action.type === "FRESHEN") return "освіжує труп";
  if (action.type === "SAY") return "говорить";
  if (action.type === "TRACK") return "вистежує";
  if (action.type === "REST") return "відпочиває";
  if (action.type === "SET_TRAP") return "ставить пастку";
  return "зайнятий";
}

function visibleActionText(target: { type: "player" | "creature"; id: number }, activeActions: Map<string, any>, location: any) {
  const key = `${target.type}:${target.id}`;
  const queued = activeActionLabel(activeActions.get(key));
  if (queued) return ` — ${queued}`;

  if (target.type === "creature") {
    const creature = location.creatures.find((c: any) => c.id === target.id);
    if (creature?.currentAction) return ` — ${creature.currentAction}`;
  }

  return "";
}

async function resourceButtonData(resources: any[], viewerPlayerId?: number) {
  const quick = await usesQuickPlayerActionDuration(viewerPlayerId);
  return resources
    .filter((r) => r.amount > 0 && (GATHERABLE_RESOURCE_KEYS as readonly string[]).includes(r.resourceType.key))
    .map((resource) => ({
      key: resource.resourceType.key,
      name: resource.resourceType.name,
      durationText: resourceDurationText(resource.resourceType.key, quick),
    }));
}

export async function renderLocationBrief(locationId: number, viewerPlayerId?: number) {
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: {
      players: true,
      creatures: { where: { isGone: false }, include: { species: true } },
      features: { where: { isActive: true }, orderBy: { id: "asc" } },
      region: true,
      exitsFrom: { where: { isHidden: false }, include: { toLocation: true }, orderBy: { direction: "asc" } },
    },
  });

  if (!location) throw new Error("Location not found");

  const revealTargets = hasCampfireInLocation(location);
  const targets = visibleTargets(location, viewerPlayerId);
  const keyboard = new InlineKeyboard();
  addFeatureButtons(keyboard, location.features);
  if (revealTargets && targets.length) addInlineRows(keyboard, buildTargetListKeyboard(targets));
  addInlineRows(keyboard, buildMovementKeyboard(location.exitsFrom));

  return {
    text: `<b>${escapeHtml(location.name)}</b>\n<i>Регіон: ${escapeHtml(location.region.name)}</i>\n\n${escapeHtml(location.description ?? "")}${featuresText(location)}${presenceText(location, viewerPlayerId, revealTargets)}\n\n${escapeHtml(compactExitsText(location.exitsFrom))}`,
    keyboard,
  };
}

export async function renderLocationDetails(locationId: number, viewerPlayerId?: number) {
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: {
      players: true,
      creatures: { where: { isGone: false }, include: { species: true } },
      resources: { include: { resourceType: true } },
      features: { where: { isActive: true }, orderBy: { id: "asc" } },
      region: true,
      exitsFrom: { where: { isHidden: false }, include: { toLocation: true }, orderBy: { direction: "asc" } },
    },
  });

  if (!location) throw new Error("Location not found");

  const targets = visibleTargets(location, viewerPlayerId);
  const playerTargetIds = targets.filter((t) => t.type === "player").map((t) => t.id);
  const creatureTargetIds = targets.filter((t) => t.type === "creature").map((t) => t.id);
  const activeActionsRaw = await prisma.worldAction.findMany({
    where: {
      status: { in: ["QUEUED", "RUNNING"] },
      OR: [
        playerTargetIds.length ? { actorType: "PLAYER", playerId: { in: playerTargetIds } } : { id: -1 },
        creatureTargetIds.length ? { actorType: "CREATURE", creatureId: { in: creatureTargetIds } } : { id: -1 },
      ],
    },
    orderBy: [{ status: "desc" }, { position: "asc" }, { id: "asc" }],
  });
  const activeActions = new Map<string, any>();
  for (const action of activeActionsRaw) {
    const key = action.actorType === "PLAYER" ? `player:${action.playerId}` : `creature:${action.creatureId}`;
    if (!activeActions.has(key)) activeActions.set(key, action);
  }
  const charactersText = targets.length
    ? `\n\nПоруч:\n${targets.map((x) => `- ${escapeHtml(x.label)}${x.canGreet ? "" : " <i>(тварина/об’єкт)</i>"}${escapeHtml(visibleActionText(x, activeActions, location))}`).join("\n")}`
    : "";

  const resourceLines = location.resources
    .filter((r) => r.amount > 0 && (GATHERABLE_RESOURCE_KEYS as readonly string[]).includes(r.resourceType.key))
    .map((r) => {
      const amount = r.amount >= 20 ? "багато" : r.amount >= 8 ? "трохи" : "майже немає";
      return `- <i>${escapeHtml(r.resourceType.name)}</i>: ${escapeHtml(amount)}`;
    });
  const resourcesText = resourceLines.length ? `\n\nВи помічаєте:\n${resourceLines.join("\n")}` : "";

  const livingAnimals = location.creatures.filter((c) => isVisibleLivingCreature(c) && c.species.kind === "ANIMAL");
  const tracksText = livingAnimals.length
    ? `\n\nСліди та рух:\n${livingAnimals
        .slice(0, 8)
        .map((c) => {
          const ageText = c.ageTicks !== undefined && c.age ? ` (${String(c.age).toLowerCase()}, ${c.ageTicks} тіків)` : "";
          return `- ${escapeHtml(`${c.species.name}${ageText}: ${c.currentAction ?? "проходить"}`)}`;
        })
        .join("\n")}${livingAnimals.length > 8 ? `\n- ...і ще ${livingAnimals.length - 8}` : ""}`
    : "";

  const corpses = location.creatures.filter(isVisibleCorpse);
  const corpsesText = corpses.length
    ? `\n\nПоруч лежить:\n${corpses
        .slice(0, 8)
        .map((c) => `- ${escapeHtml(`труп: ${c.species.name}; зникне приблизно за ${c.corpseDecayTicksLeft ?? "?"} тіків`)}`)
        .join("\n")}${corpses.length > 8 ? `\n- ...і ще ${corpses.length - 8}` : ""}`
    : "";

  const keyboard = new InlineKeyboard();
  const resources = await resourceButtonData(location.resources, viewerPlayerId);

  addFeatureButtons(keyboard, location.features);

  if (resources.length === 1) {
    const resource = resources[0];
    keyboard.text(`🌿 Зібрати: ${resource.name}${resource.durationText}`, `gather:${resource.key}`).row();
  } else if (resources.length > 1) {
    keyboard.text("🌿 Зібрати", "gather:menu").row();
  }

  if (targets.length > 0) {
    addInlineRows(keyboard, buildTargetListKeyboard(targets));
  }

  addInlineRows(keyboard, buildMovementKeyboard(location.exitsFrom));

  return {
    text: `<b>${escapeHtml(location.name)}</b>\n<i>Регіон: ${escapeHtml(location.region.name)}</i>\n\n${escapeHtml(location.description ?? "")}${featuresText(location)}\n\n<i>Ви роздивляєтесь.</i>\n\nКоординати: ${location.x}, ${location.y}, ${location.z}\nНебезпека: ${location.dangerLevel}\n\n${escapeHtml(detailedExitsText(location.exitsFrom))}${resourcesText}${charactersText}${tracksText}${corpsesText}`,
    keyboard,
  };
}

export async function buildGatherMenuForLocation(locationId: number, viewerPlayerId?: number) {
  const resources = await prisma.resourceNode.findMany({
    where: { locationId, amount: { gt: 0 } },
    include: { resourceType: true },
    orderBy: { id: "asc" },
  });

  return buildResourceMenuKeyboard(await resourceButtonData(resources, viewerPlayerId));
}

export async function renderLocationFeatureInteraction(featureId: number, viewerPlayerId: number) {
  const player = await prisma.player.findUnique({ where: { id: viewerPlayerId }, select: { currentLocationId: true } });
  const feature = await prisma.locationFeature.findUnique({ where: { id: featureId }, include: { location: true } });
  if (!player || !feature || !feature.isActive || player.currentLocationId !== feature.locationId || !isInteractiveFeature(feature)) return null;

  let text = feature.description ?? "Тут є щось варте уваги.";
  if (feature.type === "BORDER_MARKER") {
    text = "Ви бачите межовий знак. На темному дереві вирізано просту, майже дитячу мапу: суха лука тягнеться на захід, за нею темніє ліс; річка йде з півночі на південь; на сході за мостом позначено поселення й зачинені ворота.";
  } else if (isCampfireFeature(feature)) {
    text = "Вогнище, що не згасає, освітлює все навколо. Поряд із ним легше відпочити, відігрітися й набратися додаткових сил.";
  } else if (feature.type === "GATE") {
    text = "Ви стукаєте у ворота, але вам ніхто не відповідає.";
  }

  const keyboard = new InlineKeyboard().text("↩️ Назад", "location:details");
  return { text, keyboard };
}
