import { prisma } from "../db";
import { resourceDisplayName } from "../utils/resourceText";

export type RecipeActorType = "player" | "creature";

export type RecipeIngredient = {
  resourceKey: string;
  amount: number;
};

export type ResourceRecipe = {
  key: string;
  output: RecipeIngredient;
  inputs: RecipeIngredient[];
  requiredFeatureTag?: string;
  actorTypes?: RecipeActorType[];
};

export type RecipeInventorySnapshot = Map<string, number> | Record<string, number>;

export type RecipeValidationReason =
  | "missing_ingredients"
  | "invalid_recipe"
  | "unsupported_actor"
  | "missing_feature";

export type RecipeValidationResult =
  | { ok: true }
  | {
      ok: false;
      missing: RecipeIngredient[];
      reason: RecipeValidationReason;
    };

export type RecipeApplyResult =
  | {
      ok: true;
      consumed: RecipeIngredient[];
      produced: RecipeIngredient;
    }
  | {
      ok: false;
      missing: RecipeIngredient[];
      reason: RecipeValidationReason;
    };

type RecipeValidationOptions = {
  actorType?: RecipeActorType;
  hasRequiredFeature?: boolean;
};

function cleanResourceKey(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isPositiveInteger(value: unknown) {
  return Number.isInteger(value) && Number(value) > 0;
}

function inventoryAmount(snapshot: RecipeInventorySnapshot, resourceKey: string) {
  const raw = snapshot instanceof Map
    ? snapshot.get(resourceKey)
    : Object.prototype.hasOwnProperty.call(snapshot, resourceKey)
      ? snapshot[resourceKey]
      : 0;
  return Number.isFinite(raw) ? Math.max(0, Math.floor(Number(raw))) : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

class RecipeInventoryRaceError extends Error {
  constructor(public readonly ingredient: RecipeIngredient) {
    super("recipe inventory changed before consumption");
  }
}

export function normalizeRecipeIngredients(ingredients: RecipeIngredient[]) {
  const byKey = new Map<string, number>();
  for (const ingredient of ingredients) {
    const resourceKey = cleanResourceKey(ingredient.resourceKey);
    byKey.set(resourceKey, (byKey.get(resourceKey) ?? 0) + ingredient.amount);
  }
  return [...byKey.entries()].map(([resourceKey, amount]) => ({ resourceKey, amount }));
}

export function normalizeResourceRecipe(recipe: ResourceRecipe): ResourceRecipe {
  return {
    ...recipe,
    key: recipe.key.trim(),
    output: {
      resourceKey: cleanResourceKey(recipe.output.resourceKey),
      amount: recipe.output.amount,
    },
    inputs: normalizeRecipeIngredients(recipe.inputs),
  };
}

export function validateResourceRecipe(recipe: ResourceRecipe): RecipeValidationResult {
  if (!recipe || typeof recipe.key !== "string" || recipe.key.trim().length === 0) {
    return { ok: false, missing: [], reason: "invalid_recipe" };
  }
  if (!recipe.output || cleanResourceKey(recipe.output.resourceKey).length === 0 || !isPositiveInteger(recipe.output.amount)) {
    return { ok: false, missing: [], reason: "invalid_recipe" };
  }
  if (!Array.isArray(recipe.inputs) || recipe.inputs.length === 0) {
    return { ok: false, missing: [], reason: "invalid_recipe" };
  }
  for (const ingredient of recipe.inputs) {
    if (!ingredient || cleanResourceKey(ingredient.resourceKey).length === 0 || !isPositiveInteger(ingredient.amount)) {
      return { ok: false, missing: [], reason: "invalid_recipe" };
    }
  }
  return { ok: true };
}

export function validateRecipeInventory(
  recipe: ResourceRecipe,
  snapshot: RecipeInventorySnapshot,
  options: RecipeValidationOptions = {},
): RecipeValidationResult {
  const definition = validateResourceRecipe(recipe);
  if (!definition.ok) return definition;

  if (options.actorType && recipe.actorTypes?.length && !recipe.actorTypes.includes(options.actorType)) {
    return { ok: false, missing: [], reason: "unsupported_actor" };
  }
  if (recipe.requiredFeatureTag && options.hasRequiredFeature !== true) {
    return { ok: false, missing: [], reason: "missing_feature" };
  }

  const normalized = normalizeResourceRecipe(recipe);
  const missing = normalized.inputs.flatMap((ingredient) => {
    const available = inventoryAmount(snapshot, ingredient.resourceKey);
    const amount = ingredient.amount - available;
    return amount > 0 ? [{ resourceKey: ingredient.resourceKey, amount }] : [];
  });
  return missing.length > 0
    ? { ok: false, missing, reason: "missing_ingredients" }
    : { ok: true };
}

export function featureSatisfiesRecipeTag(featureData: unknown, tag: string | undefined) {
  if (!tag) return true;
  const data = isRecord(featureData) ? featureData : {};
  if (data[tag] === true) return true;
  for (const key of ["recipe_tags", "feature_tags", "tags"]) {
    const value = data[key];
    if (Array.isArray(value) && value.includes(tag)) return true;
    if (typeof value === "string" && value === tag) return true;
  }
  return false;
}

export function formatMissingRecipeIngredients(missing: RecipeIngredient[]) {
  if (missing.length === 0) return "Бракує складників.";
  const normalized = normalizeRecipeIngredients(missing);
  return `Бракує: ${normalized.map((ingredient) => (
    `${resourceDisplayName({ key: ingredient.resourceKey, name: ingredient.resourceKey })} x${ingredient.amount}`
  )).join(", ")}.`;
}

export async function applyResourceRecipeForPlayer(
  playerId: number,
  recipe: ResourceRecipe,
  options: Omit<RecipeValidationOptions, "actorType"> = {},
): Promise<RecipeApplyResult> {
  const definition = validateResourceRecipe(recipe);
  if (!definition.ok) return definition;

  const normalized = normalizeResourceRecipe(recipe);
  const actorValidation = validateRecipeInventory(normalized, {}, { ...options, actorType: "player" });
  if (!actorValidation.ok && actorValidation.reason !== "missing_ingredients") return actorValidation;

  try {
    return await prisma.$transaction(async (tx) => {
      const resourceKeys = [...new Set([
        normalized.output.resourceKey,
        ...normalized.inputs.map((ingredient) => ingredient.resourceKey),
      ])];
      const resourceTypes = await tx.resourceType.findMany({
        where: { key: { in: resourceKeys } },
        select: { id: true, key: true },
      });
      const resourceByKey = new Map(resourceTypes.map((resource) => [resource.key, resource]));
      const outputType = resourceByKey.get(normalized.output.resourceKey);
      if (!outputType) return { ok: false, missing: [], reason: "invalid_recipe" };

      const inputTypeIds = normalized.inputs
        .map((ingredient) => resourceByKey.get(ingredient.resourceKey)?.id)
        .filter((id): id is number => typeof id === "number");
      const carried = await tx.playerResource.findMany({
        where: { playerId, resourceTypeId: { in: inputTypeIds } },
        select: { amount: true, resourceType: { select: { key: true } } },
      });
      const snapshot = new Map(carried.map((resource) => [resource.resourceType.key, resource.amount]));
      const inventoryValidation = validateRecipeInventory(normalized, snapshot, { ...options, actorType: "player" });
      if (!inventoryValidation.ok) return inventoryValidation;

      for (const ingredient of normalized.inputs) {
        const resourceType = resourceByKey.get(ingredient.resourceKey);
        if (!resourceType) throw new RecipeInventoryRaceError(ingredient);
        const updated = await tx.playerResource.updateMany({
          where: {
            playerId,
            resourceTypeId: resourceType.id,
            amount: { gte: ingredient.amount },
          },
          data: { amount: { decrement: ingredient.amount } },
        });
        if (updated.count !== 1) throw new RecipeInventoryRaceError(ingredient);
        await tx.playerResource.deleteMany({
          where: { playerId, resourceTypeId: resourceType.id, amount: { lte: 0 } },
        });
      }

      await tx.playerResource.upsert({
        where: { playerId_resourceTypeId: { playerId, resourceTypeId: outputType.id } },
        update: { amount: { increment: normalized.output.amount } },
        create: { playerId, resourceTypeId: outputType.id, amount: normalized.output.amount },
      });

      return {
        ok: true,
        consumed: normalized.inputs,
        produced: normalized.output,
      };
    });
  } catch (error) {
    if (error instanceof RecipeInventoryRaceError) {
      return { ok: false, missing: [error.ingredient], reason: "missing_ingredients" };
    }
    throw error;
  }
}
