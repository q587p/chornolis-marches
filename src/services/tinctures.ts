import { prisma } from "../db";
import { BASE_STAMINA } from "../gameConfig";
import { EMPTY_BOTTLE_KEY } from "./bottles";
import {
  HERBALISM_HERBAL_TINCTURE_CONTEXT_KEY,
  HERBALISM_PRACTICE_SOURCE_KEY,
  HERBALISM_SKILL_KEY,
  herbalismBrewConsumptionPolicy,
  herbalismBrewOutcomeText,
  herbalismPracticeAmountForOutcome,
  randomHerbalismBrewOutcome,
  rollHerbalismBrewOutcome,
  type HerbalismBrewOutcome,
} from "./herbalism";
import { recordLearningProgress } from "./learning";
import {
  applyResourceRecipeForPlayer,
  formatMissingRecipeIngredients,
  normalizeResourceRecipe,
  validateRecipeInventory,
  validateResourceRecipe,
  type RecipeApplyResult,
  type RecipeIngredient,
  type RecipeInventorySnapshot,
  type RecipeValidationReason,
  type ResourceRecipe,
} from "./recipes";

export const HERBAL_TINCTURE_KEY = "herbal_tincture";
export const HERBAL_TINCTURE_RECIPE_KEY = "herbal_tincture";
export const HERBAL_TINCTURE_STAMINA_RESTORE = 36;

export const HERBAL_TINCTURE_RECIPE: ResourceRecipe = {
  key: HERBAL_TINCTURE_RECIPE_KEY,
  output: { resourceKey: HERBAL_TINCTURE_KEY, amount: 1 },
  inputs: [
    { resourceKey: EMPTY_BOTTLE_KEY, amount: 1 },
    { resourceKey: "herbs", amount: 2 },
    { resourceKey: "berries", amount: 1 },
  ],
  actorTypes: ["player"],
};

export type HerbalTinctureBrewResult =
  | {
      ok: true;
      outcome: HerbalismBrewOutcome;
      text: string;
      practiceAmount: number;
      produced?: RecipeIngredient;
      consumed: RecipeIngredient[];
    }
  | {
      ok: false;
      reason: RecipeValidationReason | "no_player";
      text: string;
      missing?: RecipeIngredient[];
    };

export type HerbalTinctureDrinkResult =
  | {
      ok: true;
      text: string;
      restored: number;
      stamina: number;
      staminaMax: number;
    }
  | {
      ok: false;
      reason: "no_player" | "missing_tincture" | "stamina_full" | "invalid_resource";
      text: string;
    };

class TinctureInventoryRaceError extends Error {
  constructor(public readonly ingredient: RecipeIngredient) {
    super("tincture inventory changed before consumption");
  }
}

function inventoryAmount(snapshot: RecipeInventorySnapshot, resourceKey: string) {
  const raw = snapshot instanceof Map
    ? snapshot.get(resourceKey)
    : Object.prototype.hasOwnProperty.call(snapshot, resourceKey)
      ? snapshot[resourceKey]
      : 0;
  return Number.isFinite(raw) ? Math.max(0, Math.floor(Number(raw))) : 0;
}

function recipeInput(resourceKey: string) {
  return normalizeResourceRecipe(HERBAL_TINCTURE_RECIPE).inputs.find((input) => input.resourceKey === resourceKey);
}

export function validateHerbalTinctureRecipeInventory(snapshot: RecipeInventorySnapshot) {
  return validateRecipeInventory(HERBAL_TINCTURE_RECIPE, snapshot, { actorType: "player" });
}

export function formatHerbalTinctureMissingIngredients(missing: RecipeIngredient[]) {
  const generic = formatMissingRecipeIngredients(missing);
  return generic.replace(/^Бракує:\s*/u, "Бракує складників для настоянки: ");
}

export function herbalTinctureConsumedInputsForOutcome(outcome: HerbalismBrewOutcome) {
  const normalized = normalizeResourceRecipe(HERBAL_TINCTURE_RECIPE);
  const policy = herbalismBrewConsumptionPolicy(outcome);
  if (policy.produceOutput) return normalized.inputs;
  if (!policy.consumeNonBottleIngredients) return [];
  return normalized.inputs.filter((input) => policy.consumeEmptyBottle || input.resourceKey !== EMPTY_BOTTLE_KEY);
}

export function herbalTinctureBrewText(outcome: HerbalismBrewOutcome) {
  const resultLine = outcome === "success"
    ? "У речах з'являється трав'яна настоянка."
    : outcome === "ordinary_failure"
      ? "Пляшечка лишається цілою, але трави й ягоди вже не врятувати."
      : "Пляшечка тріснула. Нової настоянки не буде.";
  return `${herbalismBrewOutcomeText(outcome)}\n\n${resultLine}`;
}

export function herbalTinctureDrinkPlan(input: { stamina: number; staminaMax?: number | null }) {
  const staminaMax = input.staminaMax ?? BASE_STAMINA;
  const stamina = Math.max(0, Math.floor(Number.isFinite(input.stamina) ? input.stamina : 0));
  if (stamina >= staminaMax) {
    return { canDrink: false, restored: 0, nextStamina: stamina, staminaMax };
  }
  const nextStamina = Math.min(staminaMax, stamina + HERBAL_TINCTURE_STAMINA_RESTORE);
  return { canDrink: true, restored: nextStamina - stamina, nextStamina, staminaMax };
}

export async function herbalismBrewLevelForPlayer(playerId: number) {
  const rows = await prisma.characterLearningProgress.findMany({
    where: {
      playerId,
      skillKey: HERBALISM_SKILL_KEY,
      contextKey: HERBALISM_HERBAL_TINCTURE_CONTEXT_KEY,
    },
    select: { level: true },
  });
  return Math.max(0, ...rows.map((row) => row.level ?? 0));
}

async function resourceSnapshotForPlayer(playerId: number, resourceKeys: string[]) {
  const carried = await prisma.playerResource.findMany({
    where: { playerId, resourceType: { key: { in: resourceKeys } } },
    select: { amount: true, resourceType: { select: { key: true } } },
  });
  return new Map(carried.map((resource) => [resource.resourceType.key, resource.amount]));
}

async function applyHerbalTinctureFailureForPlayer(
  playerId: number,
  outcome: Exclude<HerbalismBrewOutcome, "success">,
): Promise<RecipeApplyResult> {
  const definition = validateResourceRecipe(HERBAL_TINCTURE_RECIPE);
  if (!definition.ok) return definition;

  const normalized = normalizeResourceRecipe(HERBAL_TINCTURE_RECIPE);
  const consumed = herbalTinctureConsumedInputsForOutcome(outcome);

  try {
    return await prisma.$transaction(async (tx) => {
      const resourceTypes = await tx.resourceType.findMany({
        where: { key: { in: normalized.inputs.map((input) => input.resourceKey) } },
        select: { id: true, key: true },
      });
      const resourceByKey = new Map(resourceTypes.map((resource) => [resource.key, resource]));
      const carried = await tx.playerResource.findMany({
        where: {
          playerId,
          resourceTypeId: { in: resourceTypes.map((resource) => resource.id) },
        },
        select: { amount: true, resourceType: { select: { key: true } } },
      });
      const snapshot = new Map(carried.map((resource) => [resource.resourceType.key, resource.amount]));
      const inventoryValidation = validateRecipeInventory(normalized, snapshot, { actorType: "player" });
      if (!inventoryValidation.ok) return inventoryValidation;

      for (const ingredient of consumed) {
        const resourceType = resourceByKey.get(ingredient.resourceKey);
        if (!resourceType) throw new TinctureInventoryRaceError(ingredient);
        const updated = await tx.playerResource.updateMany({
          where: {
            playerId,
            resourceTypeId: resourceType.id,
            amount: { gte: ingredient.amount },
          },
          data: { amount: { decrement: ingredient.amount } },
        });
        if (updated.count !== 1) throw new TinctureInventoryRaceError(ingredient);
        await tx.playerResource.deleteMany({
          where: { playerId, resourceTypeId: resourceType.id, amount: { lte: 0 } },
        });
      }

      return { ok: true, consumed, produced: { resourceKey: HERBAL_TINCTURE_KEY, amount: 0 } };
    });
  } catch (error) {
    if (error instanceof TinctureInventoryRaceError) {
      return { ok: false, missing: [error.ingredient], reason: "missing_ingredients" };
    }
    throw error;
  }
}

export async function attemptHerbalTinctureBrewForPlayer(
  playerId: number,
  options: { rollOverride?: number; rng?: () => number } = {},
): Promise<HerbalTinctureBrewResult> {
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { id: true } });
  if (!player) return { ok: false, reason: "no_player", text: "Ти ще не увійшов у світ. Напиши /start" };

  const normalized = normalizeResourceRecipe(HERBAL_TINCTURE_RECIPE);
  const snapshot = await resourceSnapshotForPlayer(playerId, normalized.inputs.map((input) => input.resourceKey));
  const validation = validateHerbalTinctureRecipeInventory(snapshot);
  if (!validation.ok) {
    return {
      ok: false,
      reason: validation.reason,
      missing: validation.missing,
      text: validation.reason === "missing_ingredients"
        ? formatHerbalTinctureMissingIngredients(validation.missing)
        : "З цієї спроби настоянки нічого не вийде.",
    };
  }

  const level = await herbalismBrewLevelForPlayer(playerId);
  const outcome = typeof options.rollOverride === "number"
    ? rollHerbalismBrewOutcome(level, options.rollOverride)
    : randomHerbalismBrewOutcome(level, options.rng);
  const mutation = outcome === "success"
    ? await applyResourceRecipeForPlayer(playerId, HERBAL_TINCTURE_RECIPE)
    : await applyHerbalTinctureFailureForPlayer(playerId, outcome);

  if (!mutation.ok) {
    return {
      ok: false,
      reason: mutation.reason,
      missing: mutation.missing,
      text: mutation.reason === "missing_ingredients"
        ? formatHerbalTinctureMissingIngredients(mutation.missing)
        : "З цієї спроби настоянки нічого не вийде.",
    };
  }

  const practiceAmount = herbalismPracticeAmountForOutcome(outcome);
  await recordLearningProgress({
    playerId,
    skillKey: HERBALISM_SKILL_KEY,
    sourceKey: HERBALISM_PRACTICE_SOURCE_KEY,
    contextKey: HERBALISM_HERBAL_TINCTURE_CONTEXT_KEY,
    amount: practiceAmount,
  });

  return {
    ok: true,
    outcome,
    text: herbalTinctureBrewText(outcome),
    practiceAmount,
    consumed: mutation.consumed,
    produced: outcome === "success" ? mutation.produced : undefined,
  };
}

export async function drinkHerbalTinctureForPlayer(playerId: number): Promise<HerbalTinctureDrinkResult> {
  return prisma.$transaction(async (tx) => {
    const [player, tinctureType, bottleType] = await Promise.all([
      tx.player.findUnique({
        where: { id: playerId },
        select: { id: true, stamina: true, staminaMax: true },
      }),
      tx.resourceType.findUnique({ where: { key: HERBAL_TINCTURE_KEY }, select: { id: true } }),
      tx.resourceType.findUnique({ where: { key: EMPTY_BOTTLE_KEY }, select: { id: true } }),
    ]);

    if (!player) return { ok: false, reason: "no_player", text: "Ти ще не увійшов у світ. Напиши /start" };
    if (!tinctureType || !bottleType) {
      return { ok: false, reason: "invalid_resource", text: "Ця настоянка ще не готова для світу." };
    }

    const plan = herbalTinctureDrinkPlan(player);
    if (!plan.canDrink) {
      return { ok: false, reason: "stamina_full", text: "Снаги й так досить. Настоянку краще лишити на потім." };
    }

    const carried = await tx.playerResource.findUnique({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: tinctureType.id } },
      select: { id: true, amount: true },
    });
    if (!carried || carried.amount <= 0) {
      return { ok: false, reason: "missing_tincture", text: "У ваших речах немає трав'яної настоянки." };
    }

    if (carried.amount > 1) {
      await tx.playerResource.update({ where: { id: carried.id }, data: { amount: { decrement: 1 } } });
    } else {
      await tx.playerResource.delete({ where: { id: carried.id } });
    }
    await tx.playerResource.upsert({
      where: { playerId_resourceTypeId: { playerId, resourceTypeId: bottleType.id } },
      update: { amount: { increment: 1 } },
      create: { playerId, resourceTypeId: bottleType.id, amount: 1 },
    });
    await tx.player.update({
      where: { id: playerId },
      data: { stamina: plan.nextStamina },
    });

    return {
      ok: true,
      restored: plan.restored,
      stamina: plan.nextStamina,
      staminaMax: plan.staminaMax,
      text: "Настоянка гірка, аж щелепи стискаються. За кілька вдихів у тіло повертається дорога.\n\nПорожня пляшечка лишається у ваших речах.",
    };
  });
}

export function herbalTinctureMissingAmount(snapshot: RecipeInventorySnapshot, resourceKey: string) {
  const input = recipeInput(resourceKey);
  return input ? Math.max(0, input.amount - inventoryAmount(snapshot, resourceKey)) : 0;
}
