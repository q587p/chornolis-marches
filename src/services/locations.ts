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
  TORCH_DURATION_MS,
} from "./fire";
import { isVisibleGroundResource } from "./groundItems";
import { escapeHtml } from "../utils/text";
import { normalizeCreatureActionText } from "../utils/creatureActionText";
import { creatureForms } from "./grammar";
import { resourceTypeDisplayName } from "./corpses";
import { getPublicEcologySignStats, type PublicEcologySignStats } from "./ecologyStats";
import { lifetimeSummary } from "./itemLifetime";
import { playerShowsTechnicalDetails } from "./technicalDetails";
import { dreamGateStatusText, isDreamGateFeature, lockedExitDirections, lockedExitLabel, rememberTutorialObservationLesson } from "./tutorial";
import { formatObservedPostureText } from "../utils/playerText";

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
type LocationViewMode = "brief" | "details";
type VoiceQuoteMessage = {
  title: string;
  text: string;
};
type HtmlFollowupMessage = {
  text: string;
};

function isVisibleCorpse(c: any) {
  return !c.isAlive && !c.isGone && !c.isHidden && c.age === "CORPSE";
}

function isVisibleLivingCreature(c: any) {
  return c.isAlive && !c.isGone && !c.isHidden;
}

function visibleTargets(
  location: any,
  viewerPlayerId?: number,
  options: { showAnimalAge?: boolean; showTechnicalDetails?: boolean } = {}
) {
  const players = location.players
    .filter((p: any) => p.id !== viewerPlayerId)
    .map((p: any) => ({
      type: "player" as const,
      id: p.id,
      label: p.nameNominative ?? p.firstName ?? p.username ?? "мандрівник",
      canGreet: true,
      isResting: p.isResting,
      fatigueState: p.fatigueState,
      grammaticalGender: p.grammaticalGender,
      pronoun: p.pronoun,
    }));

  const livingCreatures = location.creatures
    .filter(isVisibleLivingCreature)
    .map((c: any) => ({
      type: "creature" as const,
      id: c.id,
      label: options.showAnimalAge && c.species.kind === "ANIMAL"
        ? animalAgeDescription(c, options.showTechnicalDetails)
        : c.name ?? c.species.name,
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

function isTutorialObservationFeature(feature: any) {
  return featureData(feature).tutorial_observation_prompt === true;
}

function isTutorialRestSeatFeature(feature: any) {
  return featureData(feature).tutorial_rest_seat === true;
}

function isTutorialInsideFeature(feature: any) {
  return featureData(feature).tutorial_inside_prompt === true;
}

async function tutorialObservationLesson(viewerPlayerId: number, locationId: number, skillKey = "tracking") {
  const firstLesson = await rememberTutorialObservationLesson(viewerPlayerId, locationId, skillKey);
  return {
    text: firstLesson ? "" : "Ви вже впізнаєте цей рух: низько, тихо, без зайвого шуму.",
    quoteMessages: [
      {
        title: "Сон шепоче",
        text: "Будьте уважні. Дорога лишає слід не тільки на землі, а й у русі того, хто йде.",
      },
      {
        title: "Дрімота фиркає",
        text: "Не вдивляйтеся так довго. Усе одно все втече.",
      },
    ] satisfies VoiceQuoteMessage[],
    followupMessages: firstLesson
      ? [{ text: `Ви уважно спостерігаєте.\n<b>Слідування</b> трохи покращено.` }]
      : [] satisfies HtmlFollowupMessage[],
  };
}

function torchLightButtonText(torchState: { isLit: boolean; plainAmount: number; litAmount: number }) {
  if (torchState.isLit && torchState.plainAmount > 0) return "🔥 Підпалити ще один факел";
  return torchState.isLit ? "🔥 Оновити вогонь на факелі" : "🔥 Підпалити факел";
}

function featureIcon(feature: any) {
  if (isTutorialInsideFeature(feature)) return "🕳️";
  if (isTutorialRestSeatFeature(feature)) return "🪑";
  if (isTutorialObservationFeature(feature)) return "🦊";
  if (isCampfireFeature(feature)) return isExtinguishedCampfire(feature) ? "🪨" : "🔥";
  if (isDepletedVegetationFeature(feature)) return "🌾";
  if (feature.type === "BORDER_MARKER") return "🪧";
  if (feature.type === "GATE") return "🚪";
  return "✦";
}

function isInteractiveFeature(feature: any) {
  return feature.isActive && (isDepletedVegetationFeature(feature) || ["BORDER_MARKER", "CAMPFIRE", "MAGIC_CAMPFIRE", "GATE", "LANDMARK"].includes(feature.type));
}

function isTutorialPromptFeature(feature: any) {
  const data = featureData(feature);
  return data.tutorial_wake_prompt === true || data.tutorial_time_prompt === true || data.tutorial_safety_prompt === true || data.tutorial_observation_prompt === true;
}

function featureBriefLine(feature: any) {
  return `${featureIcon(feature)} <i>${escapeHtml(feature.name)}</i>`;
}

function featureDetailLine(feature: any, showTechnicalDetails = false) {
  const line = `${featureIcon(feature)} <i>${escapeHtml(feature.name)}</i>`;
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
  } else if (isTutorialInsideFeature(feature)) {
    details.push("ховає вхід, що не є стороною світу");
  } else if (isTutorialRestSeatFeature(feature)) {
    details.push("зручне місце для короткого перепочинку");
  } else if (isTutorialObservationFeature(feature)) {
    details.push("вчить уважно спостерігати");
  }

  const fireState = isCampfireFeature(feature) ? campfireStateLine(feature) : null;
  if (fireState && !isExtinguishedCampfire(feature)) details.push(fireState);
  if (showTechnicalDetails && feature.restStaminaCapMultiplier) details.push(`відпочинок до ×${feature.restStaminaCapMultiplier} снаги`);
  const restSpeedMultiplier = Number(featureData(feature).rest_stamina_regen_multiplier ?? featureData(feature).restStaminaRegenMultiplier ?? 1);
  if (showTechnicalDetails && Number.isFinite(restSpeedMultiplier) && restSpeedMultiplier > 1) details.push(`відновлення снаги ×${Math.floor(restSpeedMultiplier)}`);
  return details.length ? `${line}; ${details.map(escapeHtml).join("; ")}` : line;
}

function formatPublicCount(value: number) {
  return value.toLocaleString("uk-UA");
}

function roughAmount(value: number) {
  if (value <= 0) return "не видно";
  if (value === 1) return "поодиноко";
  if (value <= 4) return "кілька";
  if (value <= 12) return "трохи";
  if (value <= 40) return "помітно";
  if (value <= 120) return "багато";
  return "дуже багато";
}

function roughEventAmount(value: number) {
  if (value <= 0) return "не позначено";
  if (value === 1) return "одна зарубка";
  if (value <= 4) return "кілька зарубок";
  if (value <= 12) return "помітно зарубок";
  return "багато зарубок";
}

function publicEcologyReport(stats: PublicEcologySignStats, showTechnicalDetails = false) {
  const livingSpecies = stats.speciesRows
    .filter((row) => row.alive > 0)
    .sort((a, b) => b.alive - a.alive || a.name.localeCompare(b.name, "uk-UA"))
    .slice(0, 8);
  const livingLines = livingSpecies.map((row) => `- ${row.name}: ${roughAmount(row.alive)}`);

  const counters = stats.recent.counters;
  const recentBirths = counters.rabbitBirths + counters.mouseBirths + counters.foxBirths + counters.wolfBirths;
  const recentDeaths = counters.oldAgeDeaths + counters.starvationDeaths + counters.predatorKills;
  const recentWindow = stats.recent.eventCount > 0
    ? "останні свіжі зарубки"
    : "останні свіжі зарубки";
  const technical = showTechnicalDetails
    ? [
        "",
        `Технічно: alive=${formatPublicCount(stats.totals.aliveAnimals)}, corpses=${formatPublicCount(stats.totals.corpseAnimals)}; recentWindowMinutes=${formatPublicCount(Math.max(1, Math.round(stats.recent.observedMinutes)))}; births=${formatPublicCount(recentBirths)}, deaths=${formatPublicCount(recentDeaths)}, predatorKills=${formatPublicCount(counters.predatorKills)}, starvationDeaths=${formatPublicCount(counters.starvationDeaths)}, oldAgeDeaths=${formatPublicCount(counters.oldAgeDeaths)}; totalPredatorKills=${formatPublicCount(stats.totals.predatorKills)}, totalStarvationDeaths=${formatPublicCount(stats.totals.starvationDeaths)}.`,
      ]
    : [];

  return [
    "Нижче на знаку додано свіжі зарубки про живність Порубіжжя.",
    "",
    `Живності зараз: ${roughAmount(stats.totals.aliveAnimals)}. Трупів на землі: ${roughAmount(stats.totals.corpseAnimals)}.`,
    livingLines.length ? `За видами:\n${livingLines.join("\n")}` : "Живих тварин на зарубках зараз не видно.",
    "",
    `За ${recentWindow}: народжень ${roughEventAmount(recentBirths)}, смертей ${roughEventAmount(recentDeaths)}.`,
    `Причини на зарубках: хижаки — ${roughEventAmount(counters.predatorKills)}, голод — ${roughEventAmount(counters.starvationDeaths)}, вік — ${roughEventAmount(counters.oldAgeDeaths)}.`,
    "",
    `За давнішими записами знака: хижаки й голод уже лишали тут помітні сліди.`,
    ...technical,
  ].join("\n");
}

function featuresText(location: any, mode: "brief" | "details", showTechnicalDetails = false) {
  const features = (location.features ?? []).filter(isInteractiveFeature);
  if (!features.length) return "";
  const title = mode === "brief" ? "Особливості:" : "Особливості місцини:";
  const lines = features.map((feature: any) => mode === "brief" ? featureBriefLine(feature) : featureDetailLine(feature, showTechnicalDetails));
  return `\n\n${title}\n${lines.join("\n")}`;
}

function addFeatureButtons(keyboard: InlineKeyboard, features: any[], sourceMode: LocationViewMode) {
  for (const feature of features.filter(isInteractiveFeature)) {
    keyboard.text(`${featureIcon(feature)} ${feature.name}`, `feature:${feature.id}:${sourceMode}`).row();
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

function presenceText(location: any, viewerPlayerId?: number, revealTargets = false, activeActions = new Map<string, any>()) {
  const targets = visibleTargets(location, viewerPlayerId);
  const hasCharacters = targets.some((t) => t.canGreet);
  const hasAnimals = location.creatures.some((c: any) => isVisibleLivingCreature(c) && c.species.kind === "ANIMAL");
  const hasCorpses = location.creatures.some(isVisibleCorpse);
  const groundItems = (location.resources ?? []).filter((r: any) => isVisibleGroundResource(r, location));

  if (revealTargets && targets.length) {
    const livingLines = targets
      .filter(isLivingTarget)
      .slice(0, TARGET_TEXT_LIMIT)
      .map((target) => `- <i>${escapeHtml(visibleActionSentence(target, activeActions, location))}</i>`);
    const corpseLines = targets
      .filter(isCorpseTarget)
      .slice(0, TARGET_TEXT_LIMIT)
      .map((target) => `- ${escapeHtml(target.label)}`);
    const groundItemLines = groundItems
      .slice(0, TARGET_TEXT_LIMIT)
      .map((resource: any) => `- ${escapeHtml(groundItemLine(resource))}`);

    const sections: string[] = [];
    if (livingLines.length) {
      if (targets.filter(isLivingTarget).length > TARGET_TEXT_LIMIT) livingLines.push(`- ...і ще ${targets.filter(isLivingTarget).length - TARGET_TEXT_LIMIT}`);
      sections.push(`Поруч:\n${livingLines.join("\n")}`);
    }
    if (corpseLines.length) {
      if (targets.filter(isCorpseTarget).length > TARGET_TEXT_LIMIT) corpseLines.push(`- ...і ще ${targets.filter(isCorpseTarget).length - TARGET_TEXT_LIMIT}`);
    }
    const lyingLines = [...corpseLines, ...groundItemLines];
    if (lyingLines.length) {
      const hiddenGroundItems = groundItems.slice(TARGET_TEXT_LIMIT).reduce((sum: number, item: any) => sum + item.amount, 0);
      if (hiddenGroundItems > 0) lyingLines.push(`- ...і ще ${hiddenGroundItems}`);
      sections.push(`Лежить:\n${lyingLines.join("\n")}`);
    }

    return sections.length ? `\n\n${sections.join("\n\n")}` : "";
  }

  if (hasCharacters && hasAnimals) return "\n\n<i>Поруч хтось або щось є.</i>";
  if (hasCharacters) return "\n\n<i>Поруч хтось є.</i>";
  if (hasAnimals) return "\n\n<i>Поруч щось ворушиться.</i>";
  if (hasCorpses || groundItems.length) return "\n\n<i>Поруч щось лежить нерухомо.</i>";
  return "";
}

function groundItemLine(resource: any) {
  const amount = resource.amount > 1 ? ` ×${resource.amount}` : "";
  if (resource.resourceType.key !== "lit_torch") return `${resourceTypeDisplayName(resource.resourceType)}${amount}`;

  const leftMs = resource.updatedAt.getTime() + TORCH_DURATION_MS - Date.now();
  const minutes = Math.max(1, Math.ceil(leftMs / 60_000));
  return `${resourceTypeDisplayName(resource.resourceType)}${amount}; горітиме ще приблизно ${minutes} хв`;
}

function sortedExits(exits: any[]) {
  return [...exits].sort((a, b) => {
    const aIndex = COMPACT_EXIT_ORDER.indexOf(a.direction);
    const bIndex = COMPACT_EXIT_ORDER.indexOf(b.direction);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
}

function compactExitsText(exits: any[], locked = new Map<string, string>()) {
  if (!exits.length) return "Виходів не видно.";
  return `Виходи: ${sortedExits(exits)
    .map((exit) => {
      const label = directionShortLabels[exit.direction] ?? exit.direction;
      return locked.has(exit.direction) ? `(${label})` : label;
    })
    .join(" ")}`;
}

function detailedExitsText(exits: any[], locked = new Map<string, string>()) {
  if (!exits.length) return "Виходів не видно.";
  return `Виходи:\n${exits
    .map((exit) => {
      const reason = locked.get(exit.direction);
      return reason ? `- ${lockedExitLabel(exit.direction, reason)}` : `- ${directionLabels[exit.direction]} → ${exit.toLocation.name}`;
    })
    .join("\n")}`;
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

function gatherResourceLabel(action: any) {
  const key = String((action.payload as any)?.resourceKey ?? "");
  const labels: Record<string, string> = {
    berries: "ягоди",
    mushrooms: "гриби",
    herbs: "лікарські трави",
    grass: "траву",
    twigs: "хмиз",
  };
  return labels[key] ?? "ресурс";
}

function activeActionLabel(action: any) {
  if (!action) return undefined;
  const queued = action.status === "QUEUED";
  if (action.type === "MOVE") {
    const direction = (action.payload as any)?.direction;
    return direction
      ? queued
        ? `збирається піти на ${String(directionLabels[direction] ?? direction).toLowerCase()}`
        : `йде на ${String(directionLabels[direction] ?? direction).toLowerCase()}`
      : queued ? "збирається рушити" : "йде";
  }
  if (action.type === "GATHER") return queued ? "планує пошукати припаси" : "шукає припаси";
  if (action.type === "GATHER_SPECIFIC") return queued ? `планує зібрати ${gatherResourceLabel(action)}` : `збирає ${gatherResourceLabel(action)}`;
  if (action.type === "LOOK") return queued ? "збирається озирнутися" : "озирається";
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

async function activeActionsForTargets(targets: ReturnType<typeof visibleTargets>) {
  const playerTargetIds = targets.filter((t) => t.type === "player").map((t) => t.id);
  const creatureTargetIds = targets.filter((t) => t.type === "creature").map((t) => t.id);
  if (!playerTargetIds.length && !creatureTargetIds.length) return new Map<string, any>();

  const activeActionsRaw = await prisma.worldAction.findMany({
    where: {
      status: { in: ["QUEUED", "RUNNING"] },
      OR: [
        ...(playerTargetIds.length ? [{ actorType: "PLAYER" as const, playerId: { in: playerTargetIds } }] : []),
        ...(creatureTargetIds.length ? [{ actorType: "CREATURE" as const, creatureId: { in: creatureTargetIds } }] : []),
      ],
    },
    orderBy: [{ status: "desc" }, { position: "asc" }, { id: "asc" }],
  });

  const activeActions = new Map<string, any>();
  for (const action of activeActionsRaw) {
    const key = action.actorType === "PLAYER" ? `player:${action.playerId}` : `creature:${action.creatureId}`;
    if (!activeActions.has(key)) activeActions.set(key, action);
  }
  return activeActions;
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

  if (target.type === "player") {
    const player = location.players.find((p: any) => p.id === target.id);
    if (player) {
      const posture = formatObservedPostureText(player).replace(/\.$/, "");
      return ` — ${posture.charAt(0).toLocaleLowerCase("uk-UA")}${posture.slice(1)}`;
    }
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

function visiblePresenceLabel(target: ReturnType<typeof visibleTargets>[number]) {
  const action = "actionLabel" in target && target.actionLabel ? ` ${target.actionLabel}` : "";
  return `${target.label}${action}`;
}

function visibleTargetsText(targets: ReturnType<typeof visibleTargets>) {
  if (!targets.length) return "";

  const livingTargets = targets.filter(isLivingTarget);
  const grouped = new Map<string, number>();
  for (const target of livingTargets) {
    const label = visiblePresenceLabel(target);
    grouped.set(label, (grouped.get(label) ?? 0) + 1);
  }
  const groups = [...grouped.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "uk"));
  const shown = groups.slice(0, TARGET_TEXT_LIMIT);
  const hiddenCount = groups.slice(TARGET_TEXT_LIMIT).reduce((sum, [, count]) => sum + count, 0);
  const lines = shown.map(([label, count]) => `- <i>${escapeHtml(label)}</i>${count > 1 ? ` ×${count}` : ""}`);
  if (hiddenCount > 0) lines.push(`- ...і ще ${hiddenCount}`);

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
      resources: { include: { resourceType: true } },
      features: { where: { isActive: true }, orderBy: { id: "asc" } },
      region: true,
      exitsFrom: { where: { isHidden: false }, include: { toLocation: true }, orderBy: { direction: "asc" } },
    },
  });

  if (!location) throw new Error("Location not found");

  const revealTargets = await hasActiveLightAtLocation(location.id);
  const showTechnicalDetails = await playerShowsTechnicalDetails(viewerPlayerId);
  const lockedExits = await lockedExitDirections(location.id);
  const targets = visibleTargets(location, viewerPlayerId);
  const activeActions = revealTargets ? await activeActionsForTargets(targets) : new Map<string, any>();
  const actionLabeledTargets = targets.map((target) => ({
    ...target,
    actionLabel: visibleActionLabel(target, activeActions, location) ?? ("actionLabel" in target ? target.actionLabel : undefined),
  }));
  const keyboard = new InlineKeyboard();
  addFeatureButtons(keyboard, location.features, "brief");
  if (revealTargets && targets.length) addInlineRows(keyboard, buildTargetListKeyboard(actionLabeledTargets, { page: options.targetPage, pageCallbackPrefix: "targetPage:brief" }));

  return {
    text: `<b>${escapeHtml(location.name)}</b>\n<i>Регіон: ${escapeHtml(location.region.name)}</i>\n\n${escapeHtml(location.description ?? "")}${featuresText(location, "brief", showTechnicalDetails)}${presenceText(location, viewerPlayerId, revealTargets, activeActions)}\n\n${escapeHtml(compactExitsText(location.exitsFrom, lockedExits))}`,
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
  const lockedExits = await lockedExitDirections(location.id);
  const targets = visibleTargets(location, viewerPlayerId, { showAnimalAge: true, showTechnicalDetails });
  const activeActions = await activeActionsForTargets(targets);
  const actionLabeledTargets = targets.map((target) => ({
    ...target,
    actionLabel: visibleActionLabel(target, activeActions, location) ?? ("actionLabel" in target ? target.actionLabel : undefined),
  }));
  const charactersText = visibleTargetsText(actionLabeledTargets);

  const resourceLines = location.resources
    .filter((r) => r.amount > 0 && (GATHERABLE_RESOURCE_KEYS as readonly string[]).includes(r.resourceType.key))
    .map((r) => {
      const amount = r.amount >= 20 ? "багато" : r.amount >= 8 ? "трохи" : "майже немає";
      return `- <i>${escapeHtml(r.resourceType.name)}</i>: ${escapeHtml(amount)}`;
    });
  const resourcesText = resourceLines.length ? `\n\nВи помічаєте:\n${resourceLines.join("\n")}` : "";

  const tracksHint = await visibleTracksHint(location.id);

  const corpses = location.creatures.filter(isVisibleCorpse);
  const groundItems = location.resources.filter((r) => isVisibleGroundResource(r, location));
  const lyingLines = [
    ...corpses.map((c) => `труп ${creatureForms(c).genitive}; стан: ${lifetimeSummary(c.corpseDecayTicksLeft, c.species.corpseDecayTicks, { showTechnicalDetails })}`),
    ...groundItems.map(groundItemLine),
  ];
  const lyingText = lyingLines.length
    ? `\n\nЛежить:\n${lyingLines
        .slice(0, 8)
        .map((line) => `- ${escapeHtml(line)}`)
        .join("\n")}${lyingLines.length > 8 ? `\n- ...і ще ${lyingLines.length - 8}` : ""}`
    : "";
  const keyboard = new InlineKeyboard();
  const resources = await resourceButtonData(location.resources, viewerPlayerId);

  addFeatureButtons(keyboard, location.features, "details");

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
    text: `<b>${escapeHtml(location.name)}</b>\n<i>Регіон: ${escapeHtml(location.region.name)}</i>\n\n${escapeHtml(location.description ?? "")}${featuresText(location, "details", showTechnicalDetails)}\n\n<i>Ви роздивляєтесь уважніше.</i>${technicalLocationText}\n\n${escapeHtml(detailedExitsText(location.exitsFrom, lockedExits))}${resourcesText}${charactersText}${tracksHint.text}${lyingText}`,
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

export async function renderDepletedVegetationInspection(locationId: number, viewerPlayerId?: number, returnMode: LocationViewMode = "details") {
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

  const keyboard = new InlineKeyboard().text("↩️ Назад", `location:${returnMode}`);
  return {
    text: [
      "🌾 Винищена трава",
      "",
      feature.description ?? "Тут трава вибита й виїдена майже до землі.",
      "",
      vegetationRecoveryPhrase(grass),
      technical,
    ].join("\n"),
    keyboard,
  };
}

export async function renderLocationFeatureInteraction(featureId: number, viewerPlayerId: number, returnMode: LocationViewMode = "details") {
  const player = await prisma.player.findUnique({ where: { id: viewerPlayerId }, select: { currentLocationId: true } });
  const feature = await prisma.locationFeature.findUnique({ where: { id: featureId }, include: { location: true } });
  if (feature?.locationId) await expireTimedCampfires(feature.locationId);
  if (!player || !feature || !feature.isActive || player.currentLocationId !== feature.locationId || !isInteractiveFeature(feature)) return null;

  let text = feature.description ?? "Тут є щось варте уваги.";
  let quoteMessages: VoiceQuoteMessage[] = [];
  let followupMessages: HtmlFollowupMessage[] = [];
  if (isDepletedVegetationFeature(feature)) {
    return renderDepletedVegetationInspection(feature.locationId, viewerPlayerId, returnMode);
  }
  if (feature.type === "BORDER_MARKER") {
    const [stats, showTechnicalDetails] = await Promise.all([
      getPublicEcologySignStats(),
      playerShowsTechnicalDetails(viewerPlayerId),
    ]);
    text = [
      "Ви бачите межовий знак. На темному дереві вирізано просту, майже дитячу мапу: суха лука тягнеться на захід, за нею темніє ліс; річка йде з півночі на південь; на сході за мостом позначено поселення й зачинені ворота.",
      "",
      publicEcologyReport(stats, showTechnicalDetails),
    ].join("\n");
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
    text = isDreamGateFeature(feature)
      ? `${feature.description ?? "Перед вами стоїть Брама Сну."}\n\n${dreamGateStatusText(feature)}`
      : feature.description ?? "Ви стукаєте у ворота, але вам ніхто не відповідає.";
  } else if (isTutorialObservationFeature(feature)) {
    const data = featureData(feature);
    const lesson = await tutorialObservationLesson(viewerPlayerId, feature.locationId, String(data.tutorial_observation_skill ?? "tracking"));
    text = [
      feature.description ?? "Лисиця вчить не поспішати очима.",
      lesson.text,
    ].filter(Boolean).join("\n\n");
    quoteMessages = lesson.quoteMessages;
    followupMessages = lesson.followupMessages;
  } else if (isTutorialRestSeatFeature(feature)) {
    text = feature.description ?? "Тут можна присісти й коротко відпочити.";
  } else if (isTutorialInsideFeature(feature)) {
    text = feature.description ?? "Кущі трохи розступаються. Будьте уважні: входи й виходи не завжди лежать за сторонами світу.";
  } else if (featureData(feature).tutorial_wake_prompt === true) {
    text = `${feature.description ?? "Десь збоку ворушаться майбутні уроки."}\n\nВи можете прокинутися зараз і повернутися до цього місця сну пізніше.`;
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
  if (feature.type === "GATE" && isDreamGateFeature(feature)) keyboard.text("💬 Сказати «Відчинитися»", "tutorial:sayOpenGate").row();
  if (isTutorialRestSeatFeature(feature)) keyboard.text("🧘 Присісти і відпочити", "rest:start").row();
  if (isTutorialInsideFeature(feature)) keyboard.text("🕳️ Всередину", "move:INSIDE").row();
  if (featureData(feature).tutorial_time_prompt === true) keyboard.text("🕯 Час", "time:show").row();
  if (featureData(feature).tutorial_wake_prompt === true) keyboard.text("🌅 Прокинутися", "tutorial:wake").row();
  if (isTorchSourceFeature(feature)) keyboard.text("🕯 Взяти факел", `torch:take:${feature.id}`).row();
  keyboard.text("↩️ Назад", `location:${returnMode}`);
  return { text, keyboard, quoteMessages, followupMessages };
}

export async function lightLocationCampfire(featureId: number, viewerPlayerId: number) {
  return lightCampfireFromTorch(viewerPlayerId, featureId);
}

export async function takeTorchFromLocationFeature(featureId: number, viewerPlayerId: number) {
  return takeTorchFromFeature(viewerPlayerId, featureId);
}
