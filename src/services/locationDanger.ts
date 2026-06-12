const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

const CROWD_DANGER_THRESHOLD = Number(env.WORLD_CROWD_DANGER_THRESHOLD || 13);
const CROWD_DANGER_INITIAL_BONUS = Number(env.WORLD_CROWD_DANGER_INITIAL_BONUS || 4);
const CROWD_DANGER_STEP = Number(env.WORLD_CROWD_DANGER_STEP || 4);
const CROWD_DANGER_STEP_BONUS = Number(env.WORLD_CROWD_DANGER_STEP_BONUS || 1);
const RECENT_ATTACK_FEATURE_PREFIX = "recent_attack_";

type DangerFeatureLike = {
  key?: string | null;
  isActive?: boolean | null;
  data?: unknown | null;
};

function featureData(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function crowdDangerBonus(presenceCount: number) {
  if (presenceCount <= CROWD_DANGER_THRESHOLD) return 0;
  const extra = presenceCount - CROWD_DANGER_THRESHOLD;
  return CROWD_DANGER_INITIAL_BONUS + Math.ceil(extra / Math.max(1, CROWD_DANGER_STEP)) * CROWD_DANGER_STEP_BONUS;
}

export function activeRecentAttackFeature(feature: DangerFeatureLike) {
  if (!feature?.isActive || !String(feature.key ?? "").startsWith(RECENT_ATTACK_FEATURE_PREFIX)) return false;
  const expiresAt = featureData(feature.data).expiresAt;
  return !expiresAt || new Date(String(expiresAt)).getTime() > Date.now();
}

export function recentAttackDangerBonus(features: readonly DangerFeatureLike[] | undefined) {
  return features?.some(activeRecentAttackFeature) ? 5 : 0;
}

export function effectiveLocationDanger(baseDangerLevel: number, presenceCount: number, features?: readonly DangerFeatureLike[]) {
  return Math.max(0, Math.floor(baseDangerLevel)) + crowdDangerBonus(presenceCount) + recentAttackDangerBonus(features);
}

export function locationDangerTechnicalSummary(baseDangerLevel: number, presenceCount: number, features?: readonly DangerFeatureLike[]) {
  const baseDanger = Math.max(0, Math.floor(baseDangerLevel));
  const crowdBonus = crowdDangerBonus(presenceCount);
  const attackBonus = recentAttackDangerBonus(features);
  const tensionBonus = crowdBonus + attackBonus;

  if (tensionBonus <= 0) {
    return `Небезпека: ${baseDanger}`;
  }

  const sources = [
    crowdBonus > 0 ? `+${crowdBonus} від скупчення живих` : null,
    attackBonus > 0 ? `+${attackBonus} від недавнього нападу` : null,
  ].filter(Boolean);
  const sourceText = sources.length ? ` (${sources.join(", ")})` : "";

  return `Небезпека: ${baseDanger}; напруга зараз: +${tensionBonus}${sourceText}; відчувається як ${baseDanger + tensionBonus}`;
}

export function locationDangerExamineCue(dangerLevel: number) {
  if (dangerLevel >= 7) {
    return "Земля, трава й тиша складаються в одне відчуття: тут варто бути обережнішими. Місцина не просто темна чи дика — вона насторожена.";
  }

  if (dangerLevel >= 4) {
    return "У повітрі тримається гострий запах неспокою. Тут недавно щось лякало живе, і це ще не зовсім розвіялося.";
  }

  if (dangerLevel >= 2) {
    return "Місцина ніби стишується навколо вас: не порожня, а уважна.";
  }

  return null;
}
