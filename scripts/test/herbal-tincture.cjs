const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register");

const {
  HERBAL_TINCTURE_KEY,
  HERBAL_TINCTURE_RECIPE,
  HERBAL_TINCTURE_RECIPE_KEY,
  HERBAL_TINCTURE_STAMINA_RESTORE,
  formatHerbalTinctureMissingIngredients,
  herbalTinctureBrewText,
  herbalTinctureConsumedInputsForOutcome,
  herbalTinctureDrinkPlan,
  herbalTinctureMissingAmount,
  validateHerbalTinctureRecipeInventory,
} = require("../../src/services/tinctures");
const { EMPTY_BOTTLE_KEY } = require("../../src/services/bottles");
const { HERBALISM_HERBAL_TINCTURE_CONTEXT_KEY, herbalismPracticeAmountForOutcome } = require("../../src/services/herbalism");
const { parseAlias } = require("../../src/input/aliases");
const { inventoryResourceKeyFromText } = require("../../src/services/inventoryUse");
const { resourceDisplayName } = require("../../src/utils/resourceText");

const root = path.join(__dirname, "..", "..");

function assertAlias(input, expected) {
  assert.deepEqual(parseAlias(input), expected, `Unexpected alias parse for: ${input}`);
}

function inputMap(inputs) {
  return Object.fromEntries(inputs.map((input) => [input.resourceKey, input.amount]));
}

assert.equal(HERBAL_TINCTURE_KEY, "herbal_tincture");
assert.equal(HERBAL_TINCTURE_RECIPE_KEY, "herbal_tincture");
assert.equal(HERBAL_TINCTURE_STAMINA_RESTORE, 36);
assert.equal(HERBALISM_HERBAL_TINCTURE_CONTEXT_KEY, "brew:herbal_tincture");

assert.deepEqual(HERBAL_TINCTURE_RECIPE.output, { resourceKey: HERBAL_TINCTURE_KEY, amount: 1 });
assert.deepEqual(inputMap(HERBAL_TINCTURE_RECIPE.inputs), {
  [EMPTY_BOTTLE_KEY]: 1,
  herbs: 2,
  berries: 1,
});
assert.deepEqual(HERBAL_TINCTURE_RECIPE.actorTypes, ["player"]);

assert.deepEqual(
  validateHerbalTinctureRecipeInventory({ [EMPTY_BOTTLE_KEY]: 1, herbs: 2, berries: 1 }),
  { ok: true },
);
assert.deepEqual(
  validateHerbalTinctureRecipeInventory({ [EMPTY_BOTTLE_KEY]: 1, herbs: 1, berries: 1 }),
  { ok: false, reason: "missing_ingredients", missing: [{ resourceKey: "herbs", amount: 1 }] },
);
assert.deepEqual(
  validateHerbalTinctureRecipeInventory({}),
  {
    ok: false,
    reason: "missing_ingredients",
    missing: [
      { resourceKey: EMPTY_BOTTLE_KEY, amount: 1 },
      { resourceKey: "herbs", amount: 2 },
      { resourceKey: "berries", amount: 1 },
    ],
  },
);
assert.deepEqual(
  validateHerbalTinctureRecipeInventory({ [EMPTY_BOTTLE_KEY]: -1, herbs: 0, berries: Number.NaN }),
  {
    ok: false,
    reason: "missing_ingredients",
    missing: [
      { resourceKey: EMPTY_BOTTLE_KEY, amount: 1 },
      { resourceKey: "herbs", amount: 2 },
      { resourceKey: "berries", amount: 1 },
    ],
  },
);
assert.equal(herbalTinctureMissingAmount({ [EMPTY_BOTTLE_KEY]: 1, herbs: 1, berries: 1 }, "herbs"), 1);
assert.equal(herbalTinctureMissingAmount({ [EMPTY_BOTTLE_KEY]: 1, herbs: 2, berries: 1 }, "herbs"), 0);
assert.equal(herbalTinctureMissingAmount({}, "unknown"), 0);

assert.equal(
  formatHerbalTinctureMissingIngredients([
    { resourceKey: "herbs", amount: 1 },
    { resourceKey: EMPTY_BOTTLE_KEY, amount: 1 },
  ]),
  "Бракує складників для настоянки: лікарські трави x1, порожня пляшечка x1.",
);

assert.deepEqual(inputMap(herbalTinctureConsumedInputsForOutcome("success")), {
  [EMPTY_BOTTLE_KEY]: 1,
  herbs: 2,
  berries: 1,
});
assert.deepEqual(inputMap(herbalTinctureConsumedInputsForOutcome("ordinary_failure")), {
  herbs: 2,
  berries: 1,
});
assert.deepEqual(inputMap(herbalTinctureConsumedInputsForOutcome("critical_failure")), {
  [EMPTY_BOTTLE_KEY]: 1,
  herbs: 2,
  berries: 1,
});

assert.equal(herbalismPracticeAmountForOutcome("success"), 2);
assert.equal(herbalismPracticeAmountForOutcome("ordinary_failure"), 1);
assert.equal(herbalismPracticeAmountForOutcome("critical_failure"), 2);

for (const outcome of ["success", "ordinary_failure", "critical_failure"]) {
  const text = herbalTinctureBrewText(outcome);
  assert.doesNotMatch(text, /%|ordinary_failure|critical_failure|\bsuccess\b|level|chance/i);
}
assert.match(herbalTinctureBrewText("success"), /трав'яна настоянка|трав’яна настоянка/u);
assert.match(herbalTinctureBrewText("ordinary_failure"), /Пляшечка лишається цілою/u);
assert.match(herbalTinctureBrewText("critical_failure"), /Пляшечка тріснула/u);

assert.deepEqual(herbalTinctureDrinkPlan({ stamina: 42, staminaMax: 42 }), {
  canDrink: false,
  restored: 0,
  nextStamina: 42,
  staminaMax: 42,
});
assert.deepEqual(herbalTinctureDrinkPlan({ stamina: 10, staminaMax: 42 }), {
  canDrink: true,
  restored: 32,
  nextStamina: 42,
  staminaMax: 42,
});
assert.deepEqual(herbalTinctureDrinkPlan({ stamina: 5, staminaMax: 50 }), {
  canDrink: true,
  restored: 36,
  nextStamina: 41,
  staminaMax: 50,
});

assertAlias("/brew tincture", { kind: "brew-tincture" });
assertAlias("/brew herbal_tincture", { kind: "brew-tincture" });
assertAlias("/make_tincture", { kind: "brew-tincture" });
assertAlias("зробити настоянку", { kind: "brew-tincture" });
assertAlias("приготувати зілля", { kind: "brew-tincture" });
assertAlias("/drink tincture", { kind: "use-item", item: HERBAL_TINCTURE_KEY });
assertAlias("/use tincture", { kind: "use-item", item: HERBAL_TINCTURE_KEY });
assertAlias("випити настоянку", { kind: "use-item", item: HERBAL_TINCTURE_KEY });
assert.equal(inventoryResourceKeyFromText("трав’яна настоянка"), HERBAL_TINCTURE_KEY);
assert.equal(inventoryResourceKeyFromText("трав’яну настоянку"), HERBAL_TINCTURE_KEY);
assert.equal(resourceDisplayName(HERBAL_TINCTURE_KEY), "трав’яна настоянка");
assert.equal(resourceDisplayName(HERBAL_TINCTURE_KEY, "accusative"), "трав’яну настоянку");

const handlersSource = fs.readFileSync(path.join(root, "src", "handlers", "aliases.ts"), "utf8");
assert.match(handlersSource, /bot\.command\("brew"/);
assert.match(handlersSource, /bot\.command\("make_tincture"/);
assert.match(handlersSource, /bot\.command\("drink"/);
assert.match(handlersSource, /bot\.command\("use"/);
assert.match(handlersSource, /attemptHerbalTinctureBrewForPlayer/);

const playerHandlerSource = fs.readFileSync(path.join(root, "src", "handlers", "player.ts"), "utf8");
assert.match(playerHandlerSource, /inventory:use:\(berries\|herbs\|mushrooms\|cooked_meat\|herbal_tincture\)/);

const keyboardSource = fs.readFileSync(path.join(root, "src", "ui", "inventoryItemKeyboard.ts"), "utf8");
assert.match(keyboardSource, /Випити настоянку/u);
assert.match(keyboardSource, /inventory:use:\$\{HERBAL_TINCTURE_KEY\}/);

const serviceSource = fs.readFileSync(path.join(root, "src", "services", "tinctures.ts"), "utf8");
assert.match(serviceSource, /applyResourceRecipeForPlayer/);
assert.match(serviceSource, /recordLearningProgress/);
assert.match(serviceSource, /prisma\.\$transaction/);

console.log("Herbal tincture helpers OK");
