import { InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { ACTION_BASE_TICKS, QUICK_PLAYER_ACTION_DURATION_MS, TICK_MS, gatherConfig, playerStaminaCostConfig } from "../gameConfig";
import { directionLabels, directionShortLabels } from "../ui/labels";
import { buildExamineTracksKeyboard, buildResourceMenuKeyboard, buildTargetListKeyboard } from "../ui/keyboards";
import { isCampfireFeature } from "./locationFeatures";
import {
  campfireStateLine,
  canAddTwigsToCampfire,
  expireGroundLitTorches,
  expireTimedCampfires,
  getPlayerTorchState,
  isActiveLitTorchResource,
  isCampfireFading,
  isDismantlableCampfire,
  isExtinguishedCampfire,
  isHandmadeCampfire,
  isPreparedCampfire,
  lightCampfireFromTorch,
  oldCampfireMemoryInspectionText,
  takeTorchFromFeature,
  TORCH_DURATION_MS,
} from "./fire";
import { isVisibleGroundResource, type VisibleGroundResourceKey } from "./groundItems";
import { escapeHtml } from "../utils/text";
import { normalizeCreatureActionText } from "../utils/creatureActionText";
import { creatureForms } from "./grammar";
import { resourceTypeDisplayName } from "./corpses";
import { getPublicEcologySignStats, type PublicEcologySignStats } from "./ecologyStats";
import { lifetimeSummary } from "./itemLifetime";
import { playerShowsTechnicalDetails } from "./technicalDetails";
import { dreamGateStatusText, ensureTutorialForagingResources, isDreamGateFeature, lockedExitDirections, lockedExitLabel, rememberTutorialObservationLesson } from "./tutorial";
import { formatObservedPostureText } from "../utils/playerText";
import { isFreshenedCorpse, playerRawMeatAmount } from "./meat";
import { heldWeaponLine } from "./weapons";
import { GATE_CARCASS_DROPOFF_FEATURE_KEY, gateHuntingDropoffText, gateHuntingNoticeText, getGateHuntingSaturationState } from "./carcassDropoff";
import { visibilityDarknessText, visibilityPresenceText, visibilityRulesForLocation, type VisibilityRules } from "./visibility";
import { getCurrentWorldTimeSnapshot } from "./worldTime";
import { owlSignDetailLine, owlSignInspectionText } from "./owlSigns";
import { isStrangeTotemFeature, strangeTotemDetailLine, strangeTotemInspectionText } from "./strangeTotems";
import {
  beginnerCacheActionLabel,
  beginnerCacheContributeAllButtonLabel,
  beginnerCacheInspectionText,
  beginnerCacheTakeKeys,
  isBeginnerCacheData,
  playerBeginnerCacheContributionKeys,
  prepareBeginnerCacheForInspection,
  type BeginnerCacheResourceKey,
} from "./beginnerCache";
import { CAMP_SPIRIT_CAT_SPECIES_KEY, campSpiritCatCachePresenceLine } from "./campSpiritCat";

const COMPACT_EXIT_ORDER = ["NORTH", "WEST", "SOUTH", "EAST", "UP", "DOWN", "INSIDE", "OUTSIDE"];
const GATHERABLE_RESOURCE_KEYS = ["berries", "mushrooms", "herbs"] as const;
const TARGET_TEXT_LIMIT = 8;
const EXHAUSTED_LOCATION_REGEN_EVERY_TICKS = Number(process.env.WORLD_EXHAUSTED_LOCATION_REGEN_EVERY_TICKS || 240);
const RESOURCE_REGEN_AMOUNT = Number(process.env.WORLD_RESOURCE_REGEN_AMOUNT || 1);
export const TREE_SHAKE_DEFAULT_COOLDOWN_MS = Number(process.env.TREE_SHAKE_COOLDOWN_MS || 2 * 60 * 60 * 1000);
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

export function isVisibleCorpse(c: any) {
  return !c.isAlive && !c.isGone && !c.isHidden && c.age === "CORPSE" && !isFreshenedCorpse(c.currentAction);
}

function isVisibleLivingCreature(c: any) {
  return c.isAlive && !c.isGone && !c.isHidden;
}

function visibleCreatureTorchText(c: any) {
  const lit = c.resources?.find((resource: any) => isActiveLitTorchResource(resource));
  if (!lit) return null;
  return lit.amount > 1 ? "тримає запалені факели" : "тримає запалений факел";
}

export function joinVisibleActionLabels(...labels: Array<string | null | undefined>) {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const label of labels) {
    if (!label) continue;
    for (const rawPart of label.split(";")) {
      const part = rawPart.trim();
      if (!part) continue;
      const key = part.replace(/\s+/gu, " ").toLocaleLowerCase("uk-UA");
      if (seen.has(key)) continue;
      seen.add(key);
      parts.push(part);
    }
  }
  return parts.join("; ") || undefined;
}

function visibleTargets(
  location: any,
  viewerPlayerId?: number,
  options: { showAnimalAge?: boolean; showTechnicalDetails?: boolean; showCorpses?: boolean } = {}
) {
  const players = location.players
    .filter((p: any) => p.id !== viewerPlayerId)
    .map((p: any) => ({
      type: "player" as const,
      id: p.id,
      label: p.nameNominative ?? p.firstName ?? p.username ?? "мандрівник",
      canGreet: true,
      posture: p.posture,
      sleepState: p.sleepState,
      isResting: p.isResting,
      fatigueState: p.fatigueState,
      grammaticalGender: p.grammaticalGender,
      pronoun: p.pronoun,
      actionLabel: heldWeaponLine(p.equippedWeaponKey)?.replace(/\.$/u, "").toLocaleLowerCase("uk-UA"),
    }));

  const livingCreatures = location.creatures
    .filter(isVisibleLivingCreature)
    .map((c: any) => ({
      type: "creature" as const,
      id: c.id,
      label: options.showAnimalAge && c.species.kind === "ANIMAL"
        ? animalAgeDescription(c, options.showTechnicalDetails)
        : c.name ?? c.species.name,
      actionLabel: joinVisibleActionLabels(
        heldWeaponLine(c.equippedWeaponKey)?.replace(/\.$/u, "").toLocaleLowerCase("uk-UA"),
        normalizeCreatureActionText(c.currentAction, "проходить"),
        visibleCreatureTorchText(c)
      ),
      canGreet: c.species.kind !== "ANIMAL",
      isAnimal: c.species.kind === "ANIMAL",
      isCorpse: false,
    }));

  const corpses = location.creatures
    .filter(isVisibleCorpse)
    .filter(() => options.showCorpses !== false)
    .map((c: any) => {
      const wasFreshened = isFreshenedCorpse(c.currentAction);
      const corpseLeft = c.corpseDecayTicksLeft ?? c.species.corpseDecayTicks;
      return {
        type: "creature" as const,
        id: c.id,
        label: `${wasFreshened ? "рештки" : "труп"} ${creatureForms(c).genitive}`,
        actionLabel: undefined,
        canGreet: false,
        isAnimal: c.species.kind === "ANIMAL",
        isCorpse: true,
        canFreshen: !wasFreshened && corpseLeft > Math.floor(c.species.corpseDecayTicks / 2),
      };
    });

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

function isBeginnerCacheFeature(feature: any) {
  return isBeginnerCacheData(featureData(feature));
}

async function localCampSpiritCatCachePresenceLine(locationId: number) {
  const [cat, localMice] = await Promise.all([
    prisma.creature.findFirst({
      where: {
        locationId,
        isAlive: true,
        isGone: false,
        isHidden: false,
        species: { key: CAMP_SPIRIT_CAT_SPECIES_KEY },
      },
      select: { id: true },
    }),
    prisma.creature.count({
      where: {
        locationId,
        isAlive: true,
        isGone: false,
        isHidden: false,
        species: { key: "mouse" },
      },
    }),
  ]);
  return campSpiritCatCachePresenceLine({ isPresent: Boolean(cat), hasLocalMice: localMice > 0 });
}

function isClimbTreeFeature(feature: any) {
  return featureData(feature).climb_tree === true;
}

function isShakeTreeFeature(feature: any) {
  return featureData(feature).shake_tree === true;
}

function isOwlSignFeature(feature: any) {
  return featureData(feature).owl_sign === true;
}

export function treeShakeAmount(min = 5, max = 8, random = Math.random) {
  const safeMin = Math.max(0, Math.floor(min));
  const safeMax = Math.max(safeMin, Math.floor(max));
  return safeMin + Math.floor(random() * (safeMax - safeMin + 1));
}

function treeShakeReadyAt(data: Record<string, unknown>, now = Date.now()) {
  const lastShakenAt = typeof data.lastShakenAt === "string" ? Date.parse(data.lastShakenAt) : NaN;
  if (!Number.isFinite(lastShakenAt)) return null;
  const cooldownMs = Number(data.shake_cooldown_ms ?? TREE_SHAKE_DEFAULT_COOLDOWN_MS);
  const readyAt = lastShakenAt + Math.max(0, cooldownMs);
  return readyAt > now ? new Date(readyAt) : null;
}

function isDepletedVegetationFeature(feature: any) {
  return feature.isActive && String(feature.key ?? "").startsWith("depleted_vegetation_");
}

function isTutorialObservationFeature(feature: any) {
  return featureData(feature).tutorial_observation_prompt === true;
}

function isTutorialEndFeature(feature: any) {
  return featureData(feature).tutorial_end_prompt === true;
}

function isTutorialRestSeatFeature(feature: any) {
  return featureData(feature).tutorial_rest_seat === true;
}

function isTutorialInsideFeature(feature: any) {
  return featureData(feature).tutorial_inside_prompt === true;
}

function isTutorialOutsideFeature(feature: any) {
  return featureData(feature).tutorial_outside_prompt === true;
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
  return torchState.isLit ? "🔥🕯 Оновити вогонь на факелі" : "🔥🕯 Підпалити факел";
}

const FEATURE_MOVE_DIRECTIONS = ["UP", "DOWN", "INSIDE", "OUTSIDE"] as const;
type FeatureMoveDirection = (typeof FEATURE_MOVE_DIRECTIONS)[number];
const FEATURE_MOVE_DIRECTION_SET = new Set<string>(FEATURE_MOVE_DIRECTIONS);
const FEATURE_MOVE_ICONS: Record<FeatureMoveDirection, string> = {
  UP: "⬆️",
  DOWN: "⬇️",
  INSIDE: "🕳️",
  OUTSIDE: "🕳️",
};

export function featureMoveDirection(feature: any): FeatureMoveDirection | null {
  const direction = String(featureData(feature).vertical_hint ?? "").toUpperCase();
  return FEATURE_MOVE_DIRECTION_SET.has(direction) ? direction as FeatureMoveDirection : null;
}

export function featureMoveButtonLabel(direction: FeatureMoveDirection) {
  const label = directionLabels[direction] ?? direction;
  const icon = FEATURE_MOVE_ICONS[direction] ?? "➡️";
  return `${icon} ${label}`;
}

export function featureMoveButtonLabelForFeature(feature: any, direction: FeatureMoveDirection) {
  const customLabel = featureData(feature).move_label;
  if (typeof customLabel === "string" && customLabel.trim()) {
    const icon = FEATURE_MOVE_ICONS[direction] ?? "➡️";
    return `${icon} ${customLabel.trim()}`;
  }
  return featureMoveButtonLabel(direction);
}

export function featureYellPromptDirection(feature: any): "UP" | "DOWN" | null {
  const direction = featureMoveDirection(feature);
  return direction === "UP" || direction === "DOWN" ? direction : null;
}

export function featureYellPromptButtonLabel(direction: "UP" | "DOWN") {
  return direction === "DOWN" ? "🗣 Гукнути вниз" : "🗣 Гукнути вгору";
}

function featureIcon(feature: any) {
  const data = featureData(feature);
  if (typeof data.icon === "string" && data.icon.trim()) return data.icon.trim();
  if (isTutorialInsideFeature(feature) || isTutorialOutsideFeature(feature)) return "🕳️";
  if (isTutorialRestSeatFeature(feature)) return "🪑";
  if (isTutorialObservationFeature(feature)) return "🦊";
  if (isCampfireFeature(feature)) return isPreparedCampfire(feature) ? "🪵" : isExtinguishedCampfire(feature) ? "🪨" : "🔥";
  if (isStrangeTotemFeature(feature)) return "🪵";
  if (isDepletedVegetationFeature(feature)) return "🌾";
  if (feature.type === "BORDER_MARKER") return "🪧";
  if (feature.type === "GATE") return "🚪";
  return "✦";
}

function isInteractiveFeature(feature: any) {
  return feature.isActive && (isDepletedVegetationFeature(feature) || ["BORDER_MARKER", "CAMPFIRE", "MAGIC_CAMPFIRE", "GATE", "LANDMARK"].includes(feature.type));
}

function normalizeFeatureQuery(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function featureSearchKeys(feature: any) {
  const data = featureData(feature);
  const aliases = Array.isArray(data.aliases) ? data.aliases : [];
  return [
    feature.name,
    feature.key,
    feature.type,
    ...aliases,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map(normalizeFeatureQuery)
    .filter(Boolean);
}

async function resolveInteractiveLocationFeature(locationId: number, query: string) {
  const normalized = normalizeFeatureQuery(query);
  if (!normalized) return null;
  if (/^\d+$/.test(normalized)) return null;

  const features = (await prisma.locationFeature.findMany({
    where: { locationId, isActive: true },
    orderBy: { id: "asc" },
  })).filter(isInteractiveFeature);

  const exact = features.filter((feature) => featureSearchKeys(feature).some((key) => key === normalized));
  if (exact.length) return exact[0];

  const fuzzy = features.filter((feature) => featureSearchKeys(feature).some((key) => key.includes(normalized) || normalized.includes(key)));
  return fuzzy[0] ?? null;
}

function isTutorialPromptFeature(feature: any) {
  const data = featureData(feature);
  return data.tutorial_wake_prompt === true || data.tutorial_time_prompt === true || data.tutorial_safety_prompt === true || data.tutorial_observation_prompt === true || data.tutorial_end_prompt === true;
}

function featureBriefLine(feature: any) {
  return `${featureIcon(feature)} <i>${escapeHtml(feature.name)}</i>`;
}

function featureDetailLine(feature: any, showTechnicalDetails = false) {
  const line = `${featureIcon(feature)} <i>${escapeHtml(feature.name)}</i>`;
  const details: string[] = [];
  const data = featureData(feature);
  const authoredSummary = typeof data.examine_summary === "string" ? data.examine_summary.trim() : "";
  if (authoredSummary) details.push(authoredSummary);

  if (isCampfireFeature(feature)) {
    if (isPreparedCampfire(feature)) {
      details.push("складено, але ще не дає світла");
      if (data.wetPenalty === true) details.push("мокра місцина швидше забере жар");
    } else if (isExtinguishedCampfire(feature)) {
      if (feature.name === "Ледь помітне вогнище") {
        details.push("майже розсипалося в землю");
      } else {
        details.push("лишився попіл і чорні головешки");
      }
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
  } else if (isBeginnerCacheFeature(feature)) {
    details.push("спільні прості припаси для першої дороги");
  } else if (isClimbTreeFeature(feature)) {
    details.push("по стовбуру можна піднятися вгору");
  } else if (isShakeTreeFeature(feature)) {
    const readyAt = treeShakeReadyAt(data);
    details.push(readyAt ? "сухе гілля вже струшене й ще не відновилося" : "сухе гілля можна струсити вниз");
  } else if (isOwlSignFeature(feature)) {
    details.push(owlSignDetailLine());
  } else if (isStrangeTotemFeature(feature)) {
    details.push(strangeTotemDetailLine(feature));
  } else if (feature.providesLight) {
    details.push("дає світло");
  } else if (feature.type === "BORDER_MARKER") {
    details.push("допомагає зорієнтуватися поблизу межі");
  } else if (feature.type === "GATE") {
    details.push("позначає прохід, який відкриється за певних умов");
  } else if (isTutorialInsideFeature(feature)) {
    details.push("ховає вхід, що не є стороною світу");
  } else if (isTutorialOutsideFeature(feature)) {
    details.push("показує вихід назовні");
  } else if (isTutorialRestSeatFeature(feature)) {
    details.push("зручне місце для короткого перепочинку");
  } else if (isTutorialObservationFeature(feature)) {
    details.push("вчить уважно спостерігати");
  }

  const fireState = isCampfireFeature(feature) ? campfireStateLine(feature) : null;
  if (fireState && !isExtinguishedCampfire(feature)) details.push(fireState);
  if (showTechnicalDetails && feature.restStaminaCapMultiplier) details.push(`відпочинок до ×${feature.restStaminaCapMultiplier} снаги`);
  const restSpeedMultiplier = Number(data.rest_stamina_regen_multiplier ?? data.restStaminaRegenMultiplier ?? 1);
  if (showTechnicalDetails && Number.isFinite(restSpeedMultiplier) && restSpeedMultiplier > 1) details.push(`відновлення снаги ×${Math.floor(restSpeedMultiplier)}`);
  return details.length ? `${line}; ${details.map(escapeHtml).join("; ")}` : line;
}

export function featureBriefInspectionText(feature: any, showTechnicalDetails = false) {
  return featureDetailLine(feature, showTechnicalDetails);
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

function roughEventLevel(value: number) {
  if (value <= 0) return "не позначено";
  if (value === 1) return "один слід";
  if (value <= 4) return "кілька";
  if (value <= 12) return "помітно";
  return "багато";
}

function publicEcologyReport(stats: PublicEcologySignStats, showTechnicalDetails = false) {
  const livingSpecies = stats.speciesRows
    .filter((row) => row.alive > 0)
    .sort((a, b) => b.alive - a.alive || a.name.localeCompare(b.name, "uk-UA"))
    .slice(0, 8);
  const livingLines = livingSpecies.map((row) => `- ${row.name}: ${roughAmount(row.alive)}`);

  const counters = stats.recent.counters;
  const recentBirths = counters.rabbitBirths + counters.mouseBirths + counters.foxBirths + counters.wolfBirths;
  const recentDeaths = counters.oldAgeDeaths + counters.starvationDeaths + counters.predatorKills + counters.playerKills;
  const recentWindow = stats.recent.eventCount > 0
    ? "останні свіжі зарубки"
    : "останні свіжі зарубки";
  const technical = showTechnicalDetails
    ? [
        "",
        `Технічно: alive=${formatPublicCount(stats.totals.aliveAnimals)}, corpses=${formatPublicCount(stats.totals.corpseAnimals)}; recentWindowMinutes=${formatPublicCount(Math.max(1, Math.round(stats.recent.observedMinutes)))}; births=${formatPublicCount(recentBirths)}, deaths=${formatPublicCount(recentDeaths)}, predatorKills=${formatPublicCount(counters.predatorKills)}, playerKills=${formatPublicCount(counters.playerKills)}, starvationDeaths=${formatPublicCount(counters.starvationDeaths)}, oldAgeDeaths=${formatPublicCount(counters.oldAgeDeaths)}; totalPredatorKills=${formatPublicCount(stats.totals.predatorKills)}, totalPlayerKills=${formatPublicCount(stats.totals.playerKills)}, totalStarvationDeaths=${formatPublicCount(stats.totals.starvationDeaths)}.`,
      ]
    : [];

  return [
    "Нижче на знаку додано свіжі зарубки про живність Порубіжжя.",
    "",
    `Живності зараз: ${roughAmount(stats.totals.aliveAnimals)}. Трупів на землі: ${roughAmount(stats.totals.corpseAnimals)}.`,
    livingLines.length ? `За видами:\n${livingLines.join("\n")}` : "Живих тварин на зарубках зараз не видно.",
    "",
    `Свіжі зарубки: народжень — ${roughEventLevel(recentBirths)}; смертей — ${roughEventLevel(recentDeaths)}.`,
    `Серед причин: хижаки — ${roughEventLevel(counters.predatorKills)}; персонажі — ${roughEventLevel(counters.playerKills)}; голод — ${roughEventLevel(counters.starvationDeaths)}; вік — ${roughEventLevel(counters.oldAgeDeaths)}.`,
    "",
    `За давнішими записами знака: хижаки й голод уже лишали тут помітні сліди.`,
    ...technical,
  ].join("\n");
}

function featuresText(location: any, mode: "brief" | "details", showTechnicalDetails = false) {
  const features = (location.features ?? []).filter(isInteractiveFeature);
  if (!features.length) return "";
  const title = mode === "brief" ? "<b>Особливості:</b>" : "<b>Особливості місцини:</b>";
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

export function groundItemPickupButtonRows(groundItems: any[]) {
  const groundItemTotalsByKey = new Map<string, number>();
  for (const item of groundItems) {
    groundItemTotalsByKey.set(item.resourceType.key, (groundItemTotalsByKey.get(item.resourceType.key) ?? 0) + item.amount);
  }

  return groundItems.map((item) => {
    const row = [
      {
        text: `🤲 Підібрати: ${item.resourceType.name}`,
        callbackData: `item:pickup:${item.id}`,
      },
    ];
    if ((groundItemTotalsByKey.get(item.resourceType.key) ?? 0) > 1) {
      row.push({
        text: "всі",
        callbackData: `item:pickupAll:${item.resourceType.key as VisibleGroundResourceKey}`,
      });
    }
    return row;
  });
}

function addGroundItemPickupButtons(keyboard: InlineKeyboard, groundItems: any[]) {
  for (const row of groundItemPickupButtonRows(groundItems)) {
    for (const button of row) keyboard.text(button.text, button.callbackData);
    keyboard.row();
  }
}

export function hasPickableLyingObjects(groundItems: any[], corpses: any[]) {
  return groundItems.length > 0 || corpses.some((corpse) => !isFreshenedCorpse(corpse.currentAction));
}

function addPickUpEverythingButton(keyboard: InlineKeyboard, groundItems: any[], corpses: any[]) {
  if (hasPickableLyingObjects(groundItems, corpses)) keyboard.text("🤲 Підібрати все", "item:pickupEverything").row();
}

function presenceText(location: any, viewerPlayerId?: number, revealTargets = false, activeActions = new Map<string, any>(), visibility?: VisibilityRules) {
  const targets = visibleTargets(location, viewerPlayerId, { showCorpses: visibility?.showGroundObjects ?? true });
  const hasCharacters = targets.some((t) => t.canGreet);
  const hasAnimals = location.creatures.some((c: any) => isVisibleLivingCreature(c) && c.species.kind === "ANIMAL");
  const hasCorpses = location.creatures.some(isVisibleCorpse);
  const groundItems = (location.resources ?? []).filter((r: any) => isVisibleGroundResource(r, location));

  if (revealTargets && (targets.length || groundItems.length)) {
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

  const obscuredPresence = visibility && !visibility.showNearbyDetails;
  const obscuredGround = visibility && !visibility.showGroundObjects;
  if (obscuredPresence && (hasCharacters || hasAnimals)) return `\n\n<i>${escapeHtml(visibilityPresenceText(visibility, "nearby"))}</i>`;
  if (obscuredGround && (hasCorpses || groundItems.length)) return `\n\n<i>${escapeHtml(visibilityPresenceText(visibility, "ground"))}</i>`;
  if (hasCharacters && hasAnimals) return "\n\n<i>Поруч хтось або щось є.</i>";
  if (hasCharacters) return "\n\n<i>Поруч хтось є.</i>";
  if (hasAnimals) return "\n\n<i>Поруч щось ворушиться.</i>";
  if (hasCorpses || groundItems.length) return "\n\n<i>Поруч щось лежить нерухомо.</i>";
  return "";
}

export function groundItemLine(resource: any) {
  const amount = resource.amount > 1 ? ` ×${resource.amount}` : "";
  if (resource.resourceType.key !== "lit_torch") return `${resourceTypeDisplayName(resource.resourceType)}${amount}`;

  const leftMs = resource.updatedAt.getTime() + TORCH_DURATION_MS - Date.now();
  const minutes = Math.max(1, Math.ceil(leftMs / 60_000));
  return `${resourceTypeDisplayName(resource.resourceType)}${amount}; дає світло; горітиме ще приблизно ${minutes} хв`;
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

  const player = await prisma.player.findUnique({ where: { id: viewerPlayerId }, select: { hp: true, isResting: true, posture: true, sleepState: true, stamina: true } });
  if (!player || player.hp <= 0 || player.isResting || player.posture !== "STANDING" || player.sleepState === "ORDINARY_SLEEP" || player.stamina <= 0) return false;

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

function guessGenderFromForms(forms: ReturnType<typeof creatureForms>, fallback?: string | null, sex?: string | null) {
  if (sex === "MALE") return "MASCULINE";
  if (sex === "FEMALE") return "FEMININE";
  if (fallback === "PLURAL") return fallback;
  const lower = forms.nominative.toLocaleLowerCase("uk-UA");
  if (lower.endsWith("а") || lower.endsWith("я")) return "FEMININE";
  if (lower.endsWith("о") || lower.endsWith("е") || lower.endsWith("я")) return "NEUTER";
  if (fallback === "FEMININE" || fallback === "NEUTER") return fallback;
  return "MASCULINE";
}

export function animalAgeDescription(creature: any, showTechnicalDetails = false) {
  const forms = creatureForms(creature);
  const ticks = showTechnicalDetails && Number.isFinite(creature.ageTicks) ? `, ${creature.ageTicks} тіків` : "";
  if (creature.age === "CHILD") return `дитинча ${forms.genitive}${ticks}`;

  const gender = guessGenderFromForms(forms, creature.species?.grammaticalGender, creature.sex);
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
  await Promise.all([expireTimedCampfires(locationId), expireGroundLitTorches(undefined, new Date(), locationId)]);
  await ensureTutorialForagingResources(locationId);
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: {
      players: true,
      creatures: { where: { isGone: false }, include: { species: true, resources: { include: { resourceType: true } } } },
      resources: { include: { resourceType: true } },
      features: { where: { isActive: true }, orderBy: { id: "asc" } },
      region: true,
      exitsFrom: { where: { isHidden: false }, include: { toLocation: true }, orderBy: { direction: "asc" } },
    },
  });

  if (!location) throw new Error("Location not found");

  const visibility = await visibilityRulesForLocation(location.id, "brief");
  const revealTargets = visibility.showNearbyDetails;
  const showTechnicalDetails = await playerShowsTechnicalDetails(viewerPlayerId);
  const lockedExits = await lockedExitDirections(location.id);
  const targets = visibleTargets(location, viewerPlayerId, { showCorpses: visibility.showGroundObjects });
  const activeActions = revealTargets ? await activeActionsForTargets(targets) : new Map<string, any>();
  const actionLabeledTargets = targets.map((target) => ({
    ...target,
    actionLabel: joinVisibleActionLabels("actionLabel" in target ? target.actionLabel : undefined, visibleActionLabel(target, activeActions, location)),
  }));
  const keyboard = new InlineKeyboard();
  addFeatureButtons(keyboard, location.features, "brief");
  const groundItems = location.resources.filter((r) => isVisibleGroundResource(r, location));
  if (visibility.showGroundObjects && groundItems.length) addGroundItemPickupButtons(keyboard, groundItems);
  addPickUpEverythingButton(keyboard, visibility.showGroundObjects ? groundItems : [], visibility.showGroundObjects ? location.creatures.filter(isVisibleCorpse) : []);
  if (revealTargets && targets.length) addInlineRows(keyboard, buildTargetListKeyboard(actionLabeledTargets, { page: options.targetPage, pageCallbackPrefix: "targetPage:brief" }));

  const descriptionText = visibility.showLocationDescription
    ? escapeHtml(location.description ?? "")
    : `<i>${escapeHtml(visibilityDarknessText(visibility))}</i>`;
  return {
    text: `<b>${escapeHtml(location.name)}</b>\n<i>Регіон: ${escapeHtml(location.region.name)}</i>\n\n${descriptionText}${featuresText(location, "brief", showTechnicalDetails)}${presenceText(location, viewerPlayerId, revealTargets, activeActions, visibility)}\n\n${escapeHtml(compactExitsText(location.exitsFrom, lockedExits))}`,
    keyboard,
  };
}

export async function renderLocationGlance(locationId: number) {
  await expireTimedCampfires(locationId);
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: {
      exitsFrom: { where: { isHidden: false }, include: { toLocation: true }, orderBy: { direction: "asc" } },
    },
  });

  if (!location) throw new Error("Location not found");

  const lockedExits = await lockedExitDirections(location.id);

  return {
    text: `<b>${escapeHtml(location.name)}</b>\n\n${escapeHtml(compactExitsText(location.exitsFrom, lockedExits))}`,
  };
}

export async function renderLocationExits(locationId: number) {
  await expireTimedCampfires(locationId);
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: {
      exitsFrom: { where: { isHidden: false }, include: { toLocation: true }, orderBy: { direction: "asc" } },
    },
  });

  if (!location) throw new Error("Location not found");

  const lockedExits = await lockedExitDirections(location.id);
  return {
    text: `<b>Видимі виходи</b>\n\n${escapeHtml(detailedExitsText(location.exitsFrom, lockedExits))}`,
  };
}

export async function renderLocationDetails(locationId: number, viewerPlayerId?: number, options: LocationRenderOptions = {}) {
  await Promise.all([expireTimedCampfires(locationId), expireGroundLitTorches(undefined, new Date(), locationId)]);
  await ensureTutorialForagingResources(locationId);
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: {
      players: true,
      creatures: { where: { isGone: false }, include: { species: true, resources: { include: { resourceType: true } } } },
      resources: { include: { resourceType: true } },
      features: { where: { isActive: true }, orderBy: { id: "asc" } },
      region: true,
      exitsFrom: { where: { isHidden: false }, include: { toLocation: true }, orderBy: { direction: "asc" } },
    },
  });

  if (!location) throw new Error("Location not found");

  const visibility = await visibilityRulesForLocation(location.id, "details");
  const showTechnicalDetails = await playerShowsTechnicalDetails(viewerPlayerId);
  const lockedExits = await lockedExitDirections(location.id);
  const targets = visibleTargets(location, viewerPlayerId, { showAnimalAge: true, showTechnicalDetails, showCorpses: visibility.showGroundObjects });
  const activeActions = visibility.showNearbyDetails ? await activeActionsForTargets(targets) : new Map<string, any>();
  const actionLabeledTargets = targets.map((target) => ({
    ...target,
    actionLabel: joinVisibleActionLabels("actionLabel" in target ? target.actionLabel : undefined, visibleActionLabel(target, activeActions, location)),
  }));
  const charactersText = visibility.showNearbyDetails
    ? visibleTargetsText(actionLabeledTargets)
    : targets.length ? `\n\n<i>${escapeHtml(visibilityPresenceText(visibility, "nearby"))}</i>` : "";

  const resourceLines = location.resources
    .filter((r) => r.amount > 0 && (GATHERABLE_RESOURCE_KEYS as readonly string[]).includes(r.resourceType.key))
    .map((r) => {
      const amount = r.amount >= 20 ? "багато" : r.amount >= 8 ? "трохи" : "майже немає";
      return `- <i>${escapeHtml(r.resourceType.name)}</i>: ${escapeHtml(amount)}`;
    });
  const resourcesText = visibility.showResourceDetails
    ? resourceLines.length ? `\n\nВи помічаєте:\n${resourceLines.join("\n")}` : ""
    : resourceLines.length ? `\n\n<i>${escapeHtml(visibilityPresenceText(visibility, "resources"))}</i>` : "";

  const tracksHint = await visibleTracksHint(location.id);

  const corpses = location.creatures.filter(isVisibleCorpse);
  const groundItems = visibility.showGroundObjects ? location.resources.filter((r) => isVisibleGroundResource(r, location)) : [];
  const lyingLines = [
    ...(visibility.showGroundObjects ? corpses.map((c) => {
      const wasFreshened = isFreshenedCorpse(c.currentAction);
      const prefix = wasFreshened ? "рештки" : "труп";
      const suffix = wasFreshened ? "; м’ясо вже знято" : "";
      return `${prefix} ${creatureForms(c).genitive}; стан: ${lifetimeSummary(c.corpseDecayTicksLeft, c.species.corpseDecayTicks, { showTechnicalDetails })}${suffix}`;
    }) : []),
    ...groundItems.map(groundItemLine),
  ];
  const hiddenGroundText = !visibility.showGroundObjects && (corpses.length || location.resources.some((r) => isVisibleGroundResource(r, location)))
    ? `\n\n<i>${escapeHtml(visibilityPresenceText(visibility, "ground"))}</i>`
    : "";
  const lyingText = lyingLines.length
    ? `\n\nЛежить:\n${lyingLines
        .slice(0, 8)
        .map((line) => `- ${escapeHtml(line)}`)
        .join("\n")}${lyingLines.length > 8 ? `\n- ...і ще ${lyingLines.length - 8}` : ""}`
    : hiddenGroundText;
  const keyboard = new InlineKeyboard();
  const resources = visibility.showResourceDetails ? await resourceButtonData(location.resources, viewerPlayerId) : [];

  addFeatureButtons(keyboard, location.features, "details");

  if (resources.length === 1) {
    const resource = resources[0];
    keyboard.text(`🌿 Зібрати: ${resource.name}${resource.durationText}`, `gather:${resource.key}`).row();
  } else if (resources.length > 1) {
    keyboard.text("🌿 Зібрати", "gather:menu").row();
  }

  addGroundItemPickupButtons(keyboard, groundItems);
  addPickUpEverythingButton(keyboard, groundItems, corpses);

  if (tracksHint.hasTracks && visibility.showTracks) {
    addInlineRows(keyboard, buildExamineTracksKeyboard());
  }

  if (visibility.showNearbyDetails && targets.length > 0) {
    addInlineRows(keyboard, buildTargetListKeyboard(actionLabeledTargets, { page: options.targetPage, pageCallbackPrefix: "targetPage:details" }));
  }

  const technicalLocationText = showTechnicalDetails
    ? `\n\nКоординати: ${location.x}, ${location.y}, ${location.z}\nНебезпека: ${location.dangerLevel}`
    : "";

  const tracksText = tracksHint.hasTracks
    ? visibility.showTracks ? tracksHint.text : `\n\n<i>${escapeHtml(visibilityPresenceText(visibility, "tracks"))}</i>`
    : "";
  const descriptionText = visibility.showLocationDescription
    ? escapeHtml(location.description ?? "")
    : `<i>${escapeHtml(visibilityDarknessText(visibility))}</i>`;

  return {
    text: `<b>${escapeHtml(location.name)}</b>\n<i>Регіон: ${escapeHtml(location.region.name)}</i>\n\n${descriptionText}${featuresText(location, "details", showTechnicalDetails)}\n\n<i>Ви роздивляєтесь уважніше.</i>${technicalLocationText}\n\n${escapeHtml(detailedExitsText(location.exitsFrom, lockedExits))}${resourcesText}${charactersText}${tracksText}${lyingText}`,
    keyboard,
  };
}

export async function buildGatherMenuForLocation(locationId: number, viewerPlayerId?: number) {
  await ensureTutorialForagingResources(locationId);
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

export async function renderLocationFeatureInteraction(
  featureId: number,
  viewerPlayerId: number,
  returnMode: LocationViewMode = "details",
  detailMode: "brief" | "full" = "full",
) {
  const player = await prisma.player.findUnique({ where: { id: viewerPlayerId }, select: { currentLocationId: true } });
  let feature = await prisma.locationFeature.findUnique({ where: { id: featureId }, include: { location: true } });
  if (feature?.locationId) await expireTimedCampfires(feature.locationId);
  if (!player || !feature || !feature.isActive || player.currentLocationId !== feature.locationId || !isInteractiveFeature(feature)) return null;

  if (detailMode === "brief") {
    const showTechnicalDetails = await playerShowsTechnicalDetails(viewerPlayerId);
    const keyboard = new InlineKeyboard()
      .text("🔎 Роздивитися", `feature:${feature.id}:${returnMode}`)
      .row()
      .text("↩️ Назад", `location:${returnMode}`);
    return {
      text: featureBriefInspectionText(feature, showTechnicalDetails),
      keyboard,
      quoteMessages: [] satisfies VoiceQuoteMessage[],
      followupMessages: [] satisfies HtmlFollowupMessage[],
    };
  }

  let text = feature.description ?? "Тут є щось варте уваги.";
  let quoteMessages: VoiceQuoteMessage[] = [];
  let followupMessages: HtmlFollowupMessage[] = [];
  if (isDepletedVegetationFeature(feature)) {
    return renderDepletedVegetationInspection(feature.locationId, viewerPlayerId, returnMode);
  }
  if (isBeginnerCacheFeature(feature)) {
    feature = await prepareBeginnerCacheForInspection(feature.id) ?? feature;
    text = beginnerCacheInspectionText(feature, {
      catPresenceLine: await localCampSpiritCatCachePresenceLine(feature.locationId),
    });
  } else if (featureData(feature).gate_hunting_notice === true || featureData(feature).carcass_dropoff === true) {
    const showTechnicalDetails = await playerShowsTechnicalDetails(viewerPlayerId);
    const state = await getGateHuntingSaturationState(GATE_CARCASS_DROPOFF_FEATURE_KEY);
    text = featureData(feature).gate_hunting_notice === true
      ? gateHuntingNoticeText(feature.description, state, showTechnicalDetails)
      : gateHuntingDropoffText(feature.description, state, showTechnicalDetails);
  } else if (feature.type === "BORDER_MARKER") {
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
    if (isPreparedCampfire(feature)) {
      text = "Хмиз складено в сухе гніздо. Лишилося дати йому вогонь.";
      if (featureData(feature).wetPenalty === true) text += "\n\nМісцина мокра. Коли це вогнище займеться, вода швидко потягне жар униз.";
    } else if (isExtinguishedCampfire(feature)) {
      text = feature.name === "Ледь помітне вогнище"
        ? "Ледь помітне вогнище майже розсипалося в землю. Попіл змішався з пилом, чорні головешки кришаться під поглядом. Світла й тепла воно вже не дає."
        : "Згасле вогнище лишило по собі попіл і чорні головешки. Світла й тепла воно не дає.";
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
    const memoryText = oldCampfireMemoryInspectionText(feature);
    if (memoryText) text += `\n\n${memoryText}`;
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
  } else if (isTutorialInsideFeature(feature) || isTutorialOutsideFeature(feature)) {
    text = feature.description ?? "Кущі трохи розступаються. Будьте уважні: входи й виходи не завжди лежать за сторонами світу.";
  } else if (featureData(feature).tutorial_wake_prompt === true) {
    text = `${feature.description ?? "Десь збоку ворушаться майбутні уроки."}\n\nВи можете прокинутися зараз і повернутися до цього місця сну пізніше.`;
  } else if (isTorchSourceFeature(feature)) {
    text = feature.description ?? "Тут лежать сухі факели. Один можна взяти з собою.";
  } else if (isClimbTreeFeature(feature)) {
    text = `${feature.description ?? "Дерево стоїть досить близько, щоб узятися за кору."}\n\nКора шорстка, сучки міцні. Можна піднятися вгору й подивитися на луку з крони.`;
  } else if (isShakeTreeFeature(feature)) {
    const readyAt = treeShakeReadyAt(featureData(feature));
    text = readyAt
      ? `${feature.description ?? "Сухі гілки вже обсипалися вниз."}\n\nГілля порожньо потріскує. Так швидко дерево не віддає сухе вдруге.`
      : `${feature.description ?? "У кроні тримається сухе дрібне гілля."}\n\nЯкщо розхитати стовбур і нижні гілки, хмиз посиплеться донизу, під дерево.`;
  } else if (isOwlSignFeature(feature)) {
    const worldTime = await getCurrentWorldTimeSnapshot();
    text = owlSignInspectionText(worldTime.daypart, feature.description);
  } else if (isStrangeTotemFeature(feature)) {
    const worldTime = await getCurrentWorldTimeSnapshot();
    text = await strangeTotemInspectionText(feature, worldTime.absoluteMinute);
  }

  const keyboard = new InlineKeyboard();
  if (isCampfireFeature(feature)) {
    const torchState = await getPlayerTorchState(viewerPlayerId);
    if (isPreparedCampfire(feature)) {
      if (torchState.isLit) keyboard.text("🔥 Підпалити", `fire:light:${feature.id}`).row();
      keyboard.text("🧹 Розібрати", `fire:dismantle:${feature.id}`).row();
    } else if (isExtinguishedCampfire(feature)) {
      keyboard.text("🪵 Додати хмиз", `fire:addTwigs:${feature.id}`).row();
      if (torchState.isLit) keyboard.text("🔥 Підпалити", `fire:light:${feature.id}`).row();
      if (isDismantlableCampfire(feature)) keyboard.text("🧹 Розібрати", `fire:dismantle:${feature.id}`).row();
    } else {
      keyboard.text("🔥🧘 Відпочити", "rest:start").row();
      const rawMeatAmount = await playerRawMeatAmount(viewerPlayerId);
      if (rawMeatAmount > 0) {
        keyboard.text("🔥🥩 Посмажити м’ясо", "inventory:cook:meat");
        if (rawMeatAmount > 1) keyboard.text("🔥🥩 Посмажити все", "inventory:cook:all");
        keyboard.row();
      }
      if (feature.type !== "MAGIC_CAMPFIRE" && canAddTwigsToCampfire(feature)) keyboard.text("🪵 Додати хмиз", `fire:addTwigs:${feature.id}`).row();
      if (isHandmadeCampfire(feature)) keyboard.text("🫗 Погасити", `fire:douse:${feature.id}`).row();
      if (torchState.hasTorch) {
        keyboard.text(torchLightButtonText(torchState), `torch:light:${feature.id}`).row();
      }
    }
  }
  if (feature.type === "GATE" && isDreamGateFeature(feature)) keyboard.text("💬 Сказати «Відчинитися»", "tutorial:sayOpenGate").row();
  if (isTutorialRestSeatFeature(feature)) keyboard.text("🧘 Присісти і відпочити", "rest:start").row();
  if (isTutorialInsideFeature(feature)) keyboard.text("🕳️ Всередину", "move:INSIDE").row();
  if (isTutorialOutsideFeature(feature)) keyboard.text("🕳️ Назовні", "move:OUTSIDE").row();
  if (featureData(feature).tutorial_time_prompt === true) keyboard.text("🌒 Час", "time:show").row();
  if (isTutorialEndFeature(feature)) keyboard.text("✅ Закінчити навчання", "tutorial:end").row();
  if (featureData(feature).tutorial_wake_prompt === true) keyboard.text("🌅 Прокинутися", "tutorial:wake").row();
  if (isTorchSourceFeature(feature)) keyboard.text("🕯 Взяти факел", `torch:take:${feature.id}`).row();
  if (isBeginnerCacheFeature(feature)) {
    for (const key of beginnerCacheTakeKeys(feature.data)) {
      keyboard.text(`📦 Взяти ${beginnerCacheActionLabel(key)}`, `cache:take:${feature.id}:${key}`).row();
    }
    const contributionKeys = await playerBeginnerCacheContributionKeys(viewerPlayerId);
    for (const key of contributionKeys) {
      addBeginnerCacheContributionButtons(keyboard, feature.id, key);
    }
  }
  if (isClimbTreeFeature(feature)) keyboard.text("🌳 Залізти", "move:UP").row();
  const moveDirection = featureMoveDirection(feature);
  if (moveDirection) keyboard.text(featureMoveButtonLabelForFeature(feature, moveDirection), `move:${moveDirection}`).row();
  const yellDirection = featureYellPromptDirection(feature);
  if (yellDirection) keyboard.text(featureYellPromptButtonLabel(yellDirection), `yell:prompt:${yellDirection}`).row();
  if (isShakeTreeFeature(feature)) keyboard.text("🍃 Потрусити", `tree:shake:${feature.id}`).row();
  if (isStrangeTotemFeature(feature)) keyboard.text("🧹 Розібрати", `totem:dismantle:${feature.id}`).row();
  keyboard.text("↩️ Назад", `location:${returnMode}`);
  return { text, keyboard, quoteMessages, followupMessages };
}

export function addBeginnerCacheContributionButtons(keyboard: InlineKeyboard, featureId: number, key: BeginnerCacheResourceKey) {
  keyboard
    .text(`🤲 Лишити ${beginnerCacheActionLabel(key)}`, `cache:contribute:${featureId}:${key}`)
    .text(beginnerCacheContributeAllButtonLabel(key), `cache:contribute_all:${featureId}:${key}`)
    .row();
}

export async function renderLocationFeatureInteractionByQuery(
  locationId: number,
  viewerPlayerId: number,
  query: string,
  returnMode: LocationViewMode = "details",
  detailMode: "brief" | "full" = "full",
) {
  const feature = await resolveInteractiveLocationFeature(locationId, query);
  if (!feature) return null;
  return renderLocationFeatureInteraction(feature.id, viewerPlayerId, returnMode, detailMode);
}

export async function shakeTreeFeature(featureId: number, viewerPlayerId: number) {
  const player = await prisma.player.findUnique({
    where: { id: viewerPlayerId },
    select: { currentLocationId: true },
  });
  const feature = await prisma.locationFeature.findUnique({ where: { id: featureId } });
  if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");
  if (!feature || !feature.isActive || feature.locationId !== player.currentLocationId || !isShakeTreeFeature(feature)) {
    throw new Error("Тут немає дерева, яке можна потрусити.");
  }

  const data = featureData(feature);
  if (treeShakeReadyAt(data)) throw new Error("Гілля вже обсипане. Так швидко дерево не віддає сухе вдруге.");

  const dropLocationKey = typeof data.shake_drop_location_key === "string" ? data.shake_drop_location_key : null;
  const resourceKey = typeof data.shake_resource_key === "string" ? data.shake_resource_key : "twigs";
  const min = Number(data.shake_min ?? 5);
  const max = Number(data.shake_max ?? 8);
  const amount = treeShakeAmount(min, max);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const [dropLocation, resourceType] = await Promise.all([
      dropLocationKey
        ? tx.cellLocation.findUnique({ where: { key: dropLocationKey }, select: { id: true, name: true } })
        : tx.cellLocation.findUnique({ where: { id: feature.locationId }, select: { id: true, name: true } }),
      tx.resourceType.findUnique({ where: { key: resourceKey }, select: { id: true, key: true, name: true } }),
    ]);
    if (!dropLocation) throw new Error("Дерево труситься, але світ не знає, куди має падати хмиз.");
    if (!resourceType) throw new Error("Світ ще не знає такого ресурсу для дерева.");

    const existing = await tx.resourceNode.findUnique({
      where: { locationId_resourceTypeId: { locationId: dropLocation.id, resourceTypeId: resourceType.id } },
      select: { id: true, amount: true, maxAmount: true },
    });
    if (existing) {
      const nextAmount = existing.amount + amount;
      await tx.resourceNode.update({
        where: { id: existing.id },
        data: { amount: nextAmount, maxAmount: Math.max(existing.maxAmount, nextAmount) },
      });
    } else {
      await tx.resourceNode.create({
        data: { locationId: dropLocation.id, resourceTypeId: resourceType.id, amount, maxAmount: amount },
      });
    }

    await tx.locationFeature.update({
      where: { id: feature.id },
      data: { data: { ...data, lastShakenAt: now.toISOString() } },
    });
    await tx.worldEvent.create({
      data: {
        type: "PLAYER_ACTION",
        title: "Tree shaken",
        description: `player=${viewerPlayerId}; feature=${feature.key}; resource=${resourceType.key}; amount=${amount}; dropLocation=${dropLocation.id}`,
        playerId: viewerPlayerId,
        locationId: feature.locationId,
      },
    });
    return { dropLocationName: dropLocation.name, resourceName: resourceType.name };
  });

  return `Ви розхитали дерево. Сухе гілля затріщало, і вниз посипався хмиз: ${amount}.\n\nЙого можна підібрати біля підніжжя дерева, у місцині «${result.dropLocationName}».`;
}

export async function shakeTreeAtCurrentLocation(viewerPlayerId: number) {
  const player = await prisma.player.findUnique({ where: { id: viewerPlayerId }, select: { currentLocationId: true } });
  if (!player?.currentLocationId) throw new Error("Ти ще не увійшов у світ. Напиши /start");
  const feature = (await prisma.locationFeature.findMany({
    where: { locationId: player.currentLocationId, isActive: true },
    orderBy: { id: "asc" },
  })).find(isShakeTreeFeature);
  if (!feature) throw new Error("Тут немає дерева, яке можна потрусити.");
  return shakeTreeFeature(feature.id, viewerPlayerId);
}

export async function lightLocationCampfire(featureId: number, viewerPlayerId: number) {
  return lightCampfireFromTorch(viewerPlayerId, featureId);
}

export async function takeTorchFromLocationFeature(featureId: number, viewerPlayerId: number) {
  return takeTorchFromFeature(viewerPlayerId, featureId);
}
