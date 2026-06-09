const assert = require("node:assert/strict");

require("ts-node/register");

const {
  applyResourceRecipeForPlayer,
  featureSatisfiesRecipeTag,
  formatMissingRecipeIngredients,
  normalizeResourceRecipe,
  validateRecipeInventory,
  validateResourceRecipe,
} = require("../../src/services/recipes");

const tinctureBaseRecipe = {
  key: "test_tincture_base",
  inputs: [
    { resourceKey: "herbs", amount: 2 },
    { resourceKey: "berries", amount: 1 },
    { resourceKey: "empty_bottle", amount: 1 },
  ],
  output: { resourceKey: "test_tincture", amount: 1 },
  actorTypes: ["player", "creature"],
};

assert.equal(validateResourceRecipe(tinctureBaseRecipe).ok, true);
assert.deepEqual(normalizeResourceRecipe(tinctureBaseRecipe).output, {
  resourceKey: "test_tincture",
  amount: 1,
});

assert.deepEqual(
  validateRecipeInventory(tinctureBaseRecipe, new Map([
    ["herbs", 2],
    ["berries", 1],
    ["empty_bottle", 1],
  ])),
  { ok: true },
);

assert.deepEqual(
  validateRecipeInventory(tinctureBaseRecipe, { herbs: 1, berries: 1, empty_bottle: 0 }),
  {
    ok: false,
    reason: "missing_ingredients",
    missing: [
      { resourceKey: "herbs", amount: 1 },
      { resourceKey: "empty_bottle", amount: 1 },
    ],
  },
);

assert.deepEqual(
  validateRecipeInventory(tinctureBaseRecipe, {}),
  {
    ok: false,
    reason: "missing_ingredients",
    missing: [
      { resourceKey: "herbs", amount: 2 },
      { resourceKey: "berries", amount: 1 },
      { resourceKey: "empty_bottle", amount: 1 },
    ],
  },
);

assert.deepEqual(
  validateRecipeInventory(tinctureBaseRecipe, { herbs: -4, berries: 0, empty_bottle: Number.NaN }),
  {
    ok: false,
    reason: "missing_ingredients",
    missing: [
      { resourceKey: "herbs", amount: 2 },
      { resourceKey: "berries", amount: 1 },
      { resourceKey: "empty_bottle", amount: 1 },
    ],
  },
);

const duplicateRecipe = {
  key: "duplicate_herbs",
  inputs: [
    { resourceKey: "herbs", amount: 1 },
    { resourceKey: "herbs", amount: 2 },
  ],
  output: { resourceKey: "pressed_herbs", amount: 1 },
};
assert.deepEqual(normalizeResourceRecipe(duplicateRecipe).inputs, [{ resourceKey: "herbs", amount: 3 }]);
assert.deepEqual(validateRecipeInventory(duplicateRecipe, { herbs: 2 }), {
  ok: false,
  reason: "missing_ingredients",
  missing: [{ resourceKey: "herbs", amount: 1 }],
});

for (const recipe of [
  { ...tinctureBaseRecipe, key: "" },
  { ...tinctureBaseRecipe, inputs: [] },
  { ...tinctureBaseRecipe, inputs: [{ resourceKey: "", amount: 1 }] },
  { ...tinctureBaseRecipe, inputs: [{ resourceKey: "herbs", amount: 0 }] },
  { ...tinctureBaseRecipe, inputs: [{ resourceKey: "herbs", amount: 1.5 }] },
  { ...tinctureBaseRecipe, output: { resourceKey: "", amount: 1 } },
  { ...tinctureBaseRecipe, output: { resourceKey: "test_tincture", amount: -1 } },
]) {
  assert.deepEqual(validateResourceRecipe(recipe), { ok: false, missing: [], reason: "invalid_recipe" });
}

assert.deepEqual(
  validateRecipeInventory({ ...tinctureBaseRecipe, actorTypes: ["creature"] }, { herbs: 2, berries: 1, empty_bottle: 1 }, { actorType: "player" }),
  { ok: false, missing: [], reason: "unsupported_actor" },
);

const stationRecipe = { ...tinctureBaseRecipe, requiredFeatureTag: "herbal_station" };
assert.deepEqual(
  validateRecipeInventory(stationRecipe, { herbs: 2, berries: 1, empty_bottle: 1 }),
  { ok: false, missing: [], reason: "missing_feature" },
);
assert.deepEqual(
  validateRecipeInventory(stationRecipe, { herbs: 2, berries: 1, empty_bottle: 1 }, { hasRequiredFeature: true }),
  { ok: true },
);
assert.equal(featureSatisfiesRecipeTag({ herbal_station: true }, "herbal_station"), true);
assert.equal(featureSatisfiesRecipeTag({ recipe_tags: ["herbal_station"] }, "herbal_station"), true);
assert.equal(featureSatisfiesRecipeTag({ tags: "herbal_station" }, "herbal_station"), true);
assert.equal(featureSatisfiesRecipeTag({ tags: ["other"] }, "herbal_station"), false);

assert.equal(
  formatMissingRecipeIngredients([
    { resourceKey: "herbs", amount: 1 },
    { resourceKey: "empty_bottle", amount: 1 },
  ]),
  "Бракує: лікарські трави x1, порожня пляшечка x1.",
);

assert.equal(typeof applyResourceRecipeForPlayer, "function");

console.log("Recipe helpers OK");
