import { InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { ACTION_BASE_TICKS, QUICK_PLAYER_ACTION_DURATION_MS, TICK_MS, gatherConfig, playerStaminaCostConfig } from "../gameConfig";
import { directionLabels, directionShortLabels } from "../ui/labels";
import { buildExamineTracksKeyboard, buildResourceMenuKeyboard, buildTargetListKeyboard } from "../ui/keyboards";
import { isCampfireFeature } from "./locationFeatures";
import {
  campfireStateLine,
  canAddTwigsToCampfire,
  expireTimedCampfires,
  getPlayerTorchState,
  hasActiveLightAtLocation,
  isCampfireFading,
  isExtinguishedCampfire,
  lightCampfireFromTorch,
  takeTorchFromFeature,
} from "./fire";
import { isPickableResourceKey } from "./groundItems";
import { escapeHtml } from "../utils/text";
import { normalizeCreatureActionText } from "../utils/creatureActionText";
import { creatureForms } from "./grammar";
import { lifetimeSummary } from "./itemLifetime";
import { playerShowsTechnicalDetails } from "./technicalDetails";

const COMPACT_EXIT_ORDER = ["NORTH", "WEST", "SOUTH", "EAST", "UP", "DOWN", "INSIDE", "OUTSIDE"];
const GATHERABLE_RESOURCE_KEYS = ["berries", "mushrooms", "herbs"] as const;
const TARGET_TEXT_LIMIT = 8;
const EXHAUSTED_LOCATION_REGEN_EVERY_TICKS = Number(process.env.WORLD_EXHAUSTED_LOCATION_REGEN_EVERY_TICKS || 240);
const RESOURCE_REGEN_AMOUNT = Number(process.env.WORLD_RESOURCE_REGEN_AMOUNT || 1);
const CREATURE_AGE_ADJECTIVES: Record<string, Record<string, string>> = {
  YOUNG: { MASCULINE: "молодий", FEMININE: "молода", NEUTER: "молоде", PLURAL: "молоді" },
  ADULT: { MASCULINE: "дорослий", FEMININE: "доросла", NEUTER: "доросле", PLURAL: "дорослі" },
  OLD: { MASCULINE: "старий", FEMININE: "стара", NEUTER: "старе", PLURAL: "старі" },
};

function featureData(feature: any) {
  return feature.data && typeof feature.data === "object" && !Array.isArray(feature.data) ? feature.data as Record<string, unknown> : {};
}

type LocationRenderOptions = {
  targetPage?: number;
};

function isVisibleCorpse(c: any) {
  return !c.isAlive && !c.isGone && !c.isHidden && c.age === "CORPSE";
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
    .map((c: any) => ({
      type: "creature" as const,
      id: c.id,
      label: c.name ?? c.species.name,
      actionLabel: normalizeCreatureActionText(c.currentAction, "проходить"),
      canGreet: c.species.kind !== "ANIMAL",
      isAnimal: c.species.kind === "ANIMAL",
      isCorpse: false,
    }));

  const corpses = location.creatures
    .filter(isVisibleCorpse)
    .map((c: any) => ({
      type: "creature" as const,
      id: c.id,
      label: `труп: ${c.species.name}`,
      actionLabel: c.currentAction ? normalizeCreatureActionText(c.currentAction) : undefined,
      canGreet: false,
      isAnimal: c.species.kind === "ANIMAL",
      isCorpse: true,
    }));

  return [...players, ...livingCreatures, ...corpses];
}

function isLivingTarget(target: ReturnType<typeof visibleTargets>[number]) {
  return !("isCorpse" in target && target.isCorpse);
}

function isCorpseTarget(target: ReturnType<typeof visibleTargets>[number]) {
  return "isCorpse" in target && target.isCorpse;
}

function isTorchSourceFeature(feature: any) {
  return featureData(feature).torch_source === true;
}

function isDepletedVegetationFeature(feature: any) {
  return feature.isActive && String(feature.key ?? "").startsWith("depleted_vegetation_");
}

function torchLightButtonText(torchState: { isLit: boolean; plainAmount: number; litAmount: number }) {
  if (torchState.isLit && torchState.plainAmount > 0) return "🔥 Підпалити ще один факел";
  return torchState.isLit ? "🔥 Оновити вогонь на факелі" : "🔥 Підпалити факел";
}

function featureIcon(feature: any) {
  if (isCampfireFeature(feature)) return "🔥";
  if (isDepletedVegetationFeature(feature)) return "🌾";
  if (feature.type === "BORDER_MARKER") return "🪧";
  if (feature.type === "GATE") return "🚪";
  return "✦";
}

function isInteractiveFeature(feature: any) {
  return feature.isActive && (isDepletedVegetationFeature(feature) || ["BORDER_MARKER", "CAMPFIRE", "MAGIC_CAMPFIRE", "GATE", "LANDMARK"].includes(feature.type));
}

function featureBriefLine(feature: any) {
  return `${featureIcon(feature)} ${feature.name}`;
}

function featureDetailLine(feature: any, showTechnicalDetails = false) {
  const line = `${featureIcon(feature)} ${feature.name}`;
  const details: string[] = [];

  if (isCampfireFeature(feature)) {
    if (isExtinguishedCampfire(feature)) {
      details.push("лишився попіл і чорні головешки");
      details.push("світла й тепла вже не дає");
    } else if (feature.type === "MAGIC_CAMPFIRE") {
      details.push("дає світло");
      details.push("покращує відпочинок");
      details.push("тримається на магії й не потребує хмизу");
    } else {
      if (feature.providesLight) {
        details.push(isCampfireFading(feature) ? "догорає, але ще дає світло" : "дає світло");
      }
      if (feature.restStaminaCapMultiplier) {
        details.push("покращує відпочинок");
      }
    }
  } else if (isTorchSourceFeature(feature)) {
    details.push("тут є факели, які можна взяти з собою");
  } else if (feature.providesLight) {
    details.push("дає світло");
  } else if (feature.type === "BORDER_MARKER") {
    details.push("допомагає зорієнтуватися поблизу межі");
  } else if (feature.type === "GATE") {
    details.push("позначає прохід, який треба роздивитися ближче");
  }

  const fireState = isCampfireFeature(feature) ? campfireStateLine(feature) : null;
  if (fireState && !isExtinguishedCampfire(feature)) details.push(fireState);
  if (showTechnicalDetails && feature.restStaminaCapMultiplier) details.push(`відпочинок до ×${feature.restStaminaCapMultiplier} снаги`);
  return details.length ? `${line}; ${details.join("; ")}` : line;
}

function featuresText(location: any, mode: "brief" | "details", showTechnicalDetails = false) {
  const features = (location.features ?? []).filter(isInteractiveFeature);
  if (!features.length) return "";
  const title = mode === "brief" ? "Особливості:" : "Особливості місцини:";
  const lines = features.map((feature: any) => mode === "brief" ? featureBriefLine(feature) : featureDetailLine(feature, showTechnicalDetails));
  return `\n\n${title}\n${lines.join("\n")}`;
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

function presenceText(location: any, viewerPlayerId?: number, revealTargets = false) {
  const targets = visibleTargets(location, viewerPlayerId);
  const hasCharacters = targets.some((t) => t.canGreet);
  const hasAnimals = location.creatures.some((c: any) => isVisibleLivingCreature(c) && c.species.kind === "ANIMAL");
  const hasCorpses = location.creatures.some(isVisibleCorpse);

  if (revealTargets && targets.length) {
    const livingLines = targets
      .filter(isLivingTarget)
      .slice(0, TARGET_TEXT_LIMIT)
      .map((target) => `- ${escapeHtml(visibleActionSentence(target, new Map(), location))}`);
    const corpseLines = targets
      .filter(isCorpseTarget)
      .slice(0, TARGET_TEXT_LIMIT)
      .map((target) => `- ${escapeHtml(target.label)}`);

    const sections: string[] = [];
    if (livingLines.length) {
      if (targets.filter(isLivingTarget).length > TARGET_TEXT_LIMIT) livingLines.push(`- ...і ще ${targets.filter(isLivingTarget).length - TARGET_TEXT_LIMIT}`);
      sections.push(`Поруч:\n${livingLines.join("\n")}`);
    }
    if (corpseLines.length) {
      if (targets.filter(isCorpseTarget).length > TARGET_TEXT_LIMIT) corpseLines.push(`- ...і ще ${targets.filter(isCorpseTarget).length - TARGET_TEXT_LIMIT}`);
      sections.push(`Лежить:\n${corpseLines.join("\n")}`);
    }

    return sections.length ? `\n\n${sections.join("\n\n")}` : "";
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

function resourceDurationText(resourceKey: string, quick: boolean, showTechnicalDetails: boolean) {
  if (!showTechnicalDetails) return "";
  const ms = quick ? QUICK_PLAYER_ACTION_DURATION_MS : slowResourceSeconds(resourceKey) * 1000;
  return ` (${formatSeconds(ms)} с)`;
}

function activeActionLabel(action: any) {
  if (!action) return undefined;
  if (action.type === "MOVE") {
    const direction = (action.payload as any)?.direction;
    return direction ? `йде на ${String(directionLabels[direction] ?? direction).toLowerCase()}` : "йде";
  }
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

function guessGenderFromForms(forms: ReturnType<typeof creatureForms>, fallback?: string | null) {
  if (fallback === "FEMININE" || fallback === "NEUTER" || fallback === "PLURAL") return fallback;
  const lower = forms.nominative.toLocaleLowerCase("uk-UA");
  if (lower.endsWith("а") || lower.endsWith("я")) return "FEMININE";
  if (lower.endsWith("о") || lower.endsWith("е") || lower.endsWith("я")) return "NEUTER";
  return "MASCULINE";
}

function animalAgeDescription(creature: any, showTechnicalDetails = false) {
  const forms = creatureForms(creature);
  const ticks = showTechnicalDetails && Number.isFinite(creature.ageTicks) ? `, ${creature.ageTicks} тіків` : "";
  if (creature.age === "CHILD") return `дитинча ${forms.genitive}${ticks}`;

  const gender = guessGenderFromForms(forms, creature.species?.grammaticalGender);
  const adjective = CREATURE_AGE_ADJECTIVES[creature.age]?.[gender] ?? "";
  const label = adjective ? `${adjective} ${forms.nominative}` : forms.nominative;
  return `${label}${ticks}`;
}

function visibleActionText(target: { type: "player" | "creature"; id: number }, activeActions: Map<string, any>, location: any) {
  const key = `${target.type}:${target.id}`;
  const queued = activeActionLabel(activeActions.get(key));
  if (queued) return ` — ${queued}`;

  if (target.type === "creature") {
    const creature = location.creatures.find((c: any) => c.id === target.id);
    if (creature?.currentAction) return ` — ${normalizeCreatureActionText(creature.currentAction)}`;
  }

  return "";
}

function visibleActionSentence(target: { type: "player" | "creature"; id: number; label: string }, activeActions: Map<string, any>, location: any) {
  const action = visibleActionText(target, activeActions, location).replace(/^ — /, "");
  return action ? `${target.label} ${action}` : target.label;
}

function visibleActionLabel(target: { type: "player" | "creature"; id: number }, activeActions: Map<string, any>, location: any) {
  return visibleActionText(target, activeActions, location).replace(/^ — /, "") || undefined;
}

function visibleTargetsText(targets: ReturnType<typeof visibleTargets>, activeActions: Map<string, any>, location: any) {
  if (!targets.length) return "";

  const livingTargets = targets.filter(isLivingTarget);
  const lines = livingTargets
    .slice(0, TARGET_TEXT_LIMIT)
    .map((x) => `- ${escapeHtml(visibleActionSentence(x, activeActions, location))}`);
  if (livingTargets.length > TARGET_TEXT_LIMIT) lines.push(`- ...і ще ${livingTargets.length - TARGET_TEXT_LIMIT}`);

  return lines.length ? `\n\nПоруч:\n${lines.join("\n")}` : "";
}

async function visibleTracksHint(locationId: number) {
  const now = new Date();
  const trackCount = await prisma.worldTrack.count({
    where: {
      expiresAt: { gt: now },
      OR: [{ fromLocationId: locationId }, { toLocationId: locationId }],
    },
  });

  return {
    hasTracks: trackCount > 0,
    text: trackCount > 0 ? "\n\nВи бачите різні сліди тут." : "",
  };
}

async function resourceButtonData(resources: any[], viewerPlayerId?: number) {
  const quick = await usesQuickPlayerActionDuration(viewerPlayerId);
  const showTechnicalDetails = await playerShowsTechnicalDetails(viewerPlayerId);
  return resources
    .filter((r) => r.amount > 0 && (GATHERABLE_RESOURCE_KEYS as readonly string[]).includes(r.resourceType.key))
    .map((resource) => ({
      key: resource.resourceType.key,
      name: resource.resourceType.name,
      durationText: resourceDurationText(resource.resourceType.key, quick, showTechnicalDetails),
    }));
}

export async function renderLocationBrief(locationId: number, viewerPlayerId?: number, options: LocationRenderOptions = {}) {
  await expireTimedCampfires(locationId);
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

  const revealTargets = await hasActiveLightAtLocation(location.id);
  const showTechnicalDetails = await playerShowsTechnicalDetails(viewerPlayerId);
  const targets = visibleTargets(location, viewerPlayerId);
  const keyboard = new InlineKeyboard();
  addFeatureButtons(keyboard, location.features);
  if (revealTargets && targets.length) addInlineRows(keyboard, buildTargetListKeyboard(targets, { page: options.targetPage, pageCallbackPrefix: "targetPage:brief" }));

  return {
    text: `<b>${escapeHtml(location.name)}</b>\n<i>Регіон: ${escapeHtml(location.region.name)}</i>\n\n${escapeHtml(location.description ?? "")}${featuresText(location, "brief", showTechnicalDetails)}${presenceText(location, viewerPlayerId, revealTargets)}\n\n${escapeHtml(compactExitsText(location.exitsFrom))}`,
    keyboard,
  };
}

export async function renderLocationDetails(locationId: number, viewerPlayerId?: number, options: LocationRenderOptions = {}) {
  await expireTimedCampfires(locationId);
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

  const showTechnicalDetails = await playerShowsTechnicalDetails(viewerPlayerId);
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
  const actionLabeledTargets = targets.map((target) => ({
    ...target,
    actionLabel: visibleActionLabel(target, activeActions, location) ?? ("actionLabel" in target ? target.actionLabel : undefined),
  }));
  const charactersText = visibleTargetsText(targets, activeActions, location);

  const resourceLines = location.resources
    .filter((r) => r.amount > 0 && (GATHERABLE_RESOURCE_KEYS as readonly string[]).includes(r.resourceType.key))
    .map((r) => {
      const amount = r.amount >= 20 ? "багато" : r.amount >= 8 ? "трохи" : "майже немає";
      return `- <i>${escapeHtml(r.resourceType.name)}</i>: ${escapeHtml(amount)}`;
    });
  const resourcesText = resourceLines.length ? `\n\nВи помічаєте:\n${resourceLines.join("\n")}` : "";

  const livingAnimals = location.creatures.filter((c) => isVisibleLivingCreature(c) && c.species.kind === "ANIMAL");
  const animalMovementText = livingAnimals.length
    ? `\n\nРух поруч:\n${livingAnimals
        .slice(0, 8)
        .map((c) => `- ${escapeHtml(`${animalAgeDescription(c, showTechnicalDetails)}: ${normalizeCreatureActionText(c.currentAction, "проходить")}`)}`)
        .join("\n")}${livingAnimals.length > 8 ? `\n- ...і ще ${livingAnimals.length - 8}` : ""}`
    : "";
  const tracksHint = await visibleTracksHint(location.id);

  const corpses = location.creatures.filter(isVisibleCorpse);
  const groundItems = location.resources.filter((r) => r.amount > 0 && isPickableResourceKey(r.resourceType.key));
  const lyingLines = [
    ...corpses.map((c) => `труп ${creatureForms(c).genitive}; стан: ${lifetimeSummary(c.corpseDecayTicksLeft, c.species.corpseDecayTicks, { showTechnicalDetails })}`),
    ...groundItems.map((r) => `${r.resourceType.name}${r.amount > 1 ? ` ×${r.amount}` : ""}`),
  ];
  const lyingText = lyingLines.length
    ? `\n\nЛежить:\n${lyingLines
        .slice(0, 8)
        .map((line) => `- ${escapeHtml(line)}`)
        .join("\n")}${lyingLines.length > 8 ? `\n- ...і ще ${lyingLines.length - 8}` : ""}`
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

  for (const item of groundItems) {
    keyboard.text(`🤲 Підібрати: ${item.resourceType.name}`, `item:pickup:${item.id}`).row();
  }

  if (tracksHint.hasTracks) {
    addInlineRows(keyboard, buildExamineTracksKeyboard());
  }

  if (targets.length > 0) {
    addInlineRows(keyboard, buildTargetListKeyboard(actionLabeledTargets, { page: options.targetPage, pageCallbackPrefix: "targetPage:details" }));
  }

  const technicalLocationText = showTechnicalDetails
    ? `\n\nКоординати: ${location.x}, ${location.y}, ${location.z}\nНебезпека: ${location.dangerLevel}`
    : "";

  return {
    text: `<b>${escapeHtml(location.name)}</b>\n<i>Регіон: ${escapeHtml(location.region.name)}</i>\n\n${escapeHtml(location.description ?? "")}${featuresText(location, "details", showTechnicalDetails)}\n\n<i>Ви роздивляєтесь уважніше.</i>${technicalLocationText}\n\n${escapeHtml(detailedExitsText(location.exitsFrom))}${resourcesText}${charactersText}${tracksHint.text}${animalMovementText}${lyingText}`,
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

function ticksDurationText(ticks: number) {
  const minutes = Math.max(1, Math.round((ticks * TICK_MS) / 60000));
  if (minutes < 60) return `${minutes} хв`;
  const hours = Math.round(minutes / 60);
  return `${hours} год`;
}

function vegetationRecoveryPhrase(grass: { amount: number; maxAmount: number } | null) {
  if (!grass || grass.maxAmount <= 0) return "Без трав'яного кореня місцина природно майже не відновиться.";
  const threshold = Math.ceil(grass.maxAmount / 4);
  const missing = Math.max(0, threshold - grass.amount);
  if (missing <= 0) return "Трава вже починає триматися за землю. Виснаження має відступити найближчим часом.";
  if (missing <= 2) return "Потрібно ще трохи спокою: кілька повільних циклів відновлення.";
  if (missing <= 6) return "Відновлення буде довгим. Якщо тут і далі пастимуться чи збиратимуть усе підряд, місцина знову просяде.";
  return "Не скоро. Без дощу, спокою або чиєїсь допомоги трава тут майже не підніметься.";
}

export async function renderDepletedVegetationInspection(locationId: number, viewerPlayerId?: number) {
  const [feature, grass, showTechnicalDetails] = await Promise.all([
    prisma.locationFeature.findFirst({
      where: { locationId, isActive: true, key: { startsWith: "depleted_vegetation_" } },
      orderBy: { id: "asc" },
    }),
    prisma.resourceNode.findFirst({
      where: { locationId, resourceType: { key: "grass" } },
      include: { resourceType: true },
      orderBy: { id: "asc" },
    }),
    playerShowsTechnicalDetails(viewerPlayerId),
  ]);

  if (!feature) return null;

  const data = featureData(feature);
  const technical = showTechnicalDetails
    ? `\n\nТехнічно: grass=${grass?.amount ?? 0}/${grass?.maxAmount ?? 0}; поріг зняття виснаження=${grass ? Math.ceil(grass.maxAmount / 4) : 0}; виснажена місцина відновлює +${RESOURCE_REGEN_AMOUNT} раз на ${EXHAUSTED_LOCATION_REGEN_EVERY_TICKS} тіків ≈ ${ticksDurationText(EXHAUSTED_LOCATION_REGEN_EVERY_TICKS)}.${typeof data.depletedAtTick === "number" ? ` depletedAtTick=${data.depletedAtTick}.` : ""}${typeof data.minRecoverTick === "number" ? ` minRecoverTick=${data.minRecoverTick}.` : ""}`
    : "";

  const keyboard = new InlineKeyboard().text("↩️ Назад", "location:details");
  return {
    text: [
      "🌾 Винищена трава",
      "",
      feature.description ?? "Тут трава вибита й виїдена майже до землі.",
      "",
      vegetationRecoveryPhrase(grass),
      "",
      "Якщо місцину лишити в спокої, вона відновлюватиметься повільно. Дощ, магія чи чиясь турбота зможуть допомогти пізніше.",
      technical,
    ].join("\n"),
    keyboard,
  };
}

export async function renderLocationFeatureInteraction(featureId: number, viewerPlayerId: number) {
  const player = await prisma.player.findUnique({ where: { id: viewerPlayerId }, select: { currentLocationId: true } });
  const feature = await prisma.locationFeature.findUnique({ where: { id: featureId }, include: { location: true } });
  if (feature?.locationId) await expireTimedCampfires(feature.locationId);
  if (!player || !feature || !feature.isActive || player.currentLocationId !== feature.locationId || !isInteractiveFeature(feature)) return null;

  let text = feature.description ?? "Тут є щось варте уваги.";
  if (isDepletedVegetationFeature(feature)) {
    return renderDepletedVegetationInspection(feature.locationId, viewerPlayerId);
  }
  if (feature.type === "BORDER_MARKER") {
    text = "Ви бачите межовий знак. На темному дереві вирізано просту, майже дитячу мапу: суха лука тягнеться на захід, за нею темніє ліс; річка йде з півночі на південь; на сході за мостом позначено поселення й зачинені ворота.";
  } else if (isCampfireFeature(feature)) {
    if (isExtinguishedCampfire(feature)) {
      text = "Згасле вогнище лишило по собі попіл і чорні головешки. Світла й тепла воно не дає.";
      if (Number(featureData(feature).fuelTwigs ?? 0) > 0) text += "\n\nУ попелі вже лежить сухий хмиз, готовий прийняти вогонь.";
    } else if (feature.type === "MAGIC_CAMPFIRE") {
      text = "Вогнище освітлює все навколо. Поряд із ним легше відпочити, відігрітися й набратися додаткових сил.\n\nВи відчуваєте, як чиясь давня магія підтримує полум'я. Йому не потрібен хмиз, щоб горіти.";
    } else if (isCampfireFading(feature)) {
      text = "Вогнище догорає, але ще освітлює місцину. Полум'я нижчає, жар просідає в попіл; скоро варто буде додати хмизу.";
    } else {
      text = "Вогнище освітлює все навколо. Поряд із ним легше відпочити, відігрітися й набратися додаткових сил.";
      const fireState = campfireStateLine(feature);
      if (fireState) text += `\n\nПолум'я нижчає. Скоро згасне; варто додати хмизу.`;
    }
  } else if (feature.type === "GATE") {
    text = "Ви стукаєте у ворота, але вам ніхто не відповідає.";
  } else if (isTorchSourceFeature(feature)) {
    text = feature.description ?? "Тут лежать сухі факели. Один можна взяти з собою.";
  }

  const keyboard = new InlineKeyboard();
  if (isCampfireFeature(feature)) {
    const torchState = await getPlayerTorchState(viewerPlayerId);
    if (isExtinguishedCampfire(feature)) {
      keyboard.text("🪵 Додати хмиз", `fire:addTwigs:${feature.id}`).row();
      if (torchState.isLit) keyboard.text("🔥 Підпалити", `fire:light:${feature.id}`).row();
    } else {
      keyboard.text("🔥 Відпочити", "rest:start").row();
      if (feature.type !== "MAGIC_CAMPFIRE" && canAddTwigsToCampfire(feature)) keyboard.text("🪵 Додати хмиз", `fire:addTwigs:${feature.id}`).row();
      if (torchState.hasTorch) {
        keyboard.text(torchLightButtonText(torchState), `torch:light:${feature.id}`).row();
      }
    }
  }
  if (isTorchSourceFeature(feature)) keyboard.text("🕯 Взяти факел", `torch:take:${feature.id}`).row();
  keyboard.text("↩️ Назад", "location:details");
  return { text, keyboard };
}

export async function lightLocationCampfire(featureId: number, viewerPlayerId: number) {
  return lightCampfireFromTorch(viewerPlayerId, featureId);
}

export async function takeTorchFromLocationFeature(featureId: number, viewerPlayerId: number) {
  return takeTorchFromFeature(viewerPlayerId, featureId);
}
