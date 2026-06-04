const assert = require("node:assert/strict");

require("ts-node/register");

const {
  CAMPFIRE_BUILD_TWIG_COST,
  MAX_HANDMADE_CAMPFIRES_PER_LOCATION,
  adminHandmadeCampfireData,
  campfireIgnitionAtmosphereText,
  canBuildAnotherHandmadeCampfire,
  firstRelightableCampfireId,
  handmadeCampfireCount,
  isHandmadeCampfire,
  isPreparedCampfire,
} = require("../../src/services/fire");

const prepared = {
  type: "CAMPFIRE",
  isActive: true,
  providesLight: false,
  data: {
    is_campfire: true,
    handmade: true,
    created_by: "player",
    prepared: true,
    unlit: true,
    fuelTwigs: CAMPFIRE_BUILD_TWIG_COST,
  },
};

assert.equal(CAMPFIRE_BUILD_TWIG_COST, 5);
assert.equal(MAX_HANDMADE_CAMPFIRES_PER_LOCATION, 3);
assert.equal(isHandmadeCampfire(prepared), true);
assert.equal(isPreparedCampfire(prepared), true);
assert.equal(isHandmadeCampfire({ ...prepared, data: { ...prepared.data, seeded: true } }), false);
assert.equal(isHandmadeCampfire({ ...prepared, type: "MAGIC_CAMPFIRE" }), false);

const adminPrepared = { ...prepared, data: adminHandmadeCampfireData(1234) };
assert.equal(adminPrepared.data.created_by, "addCampfire");
assert.equal(adminPrepared.data.adminCreated, true);
assert.equal(isHandmadeCampfire(adminPrepared), true);
assert.equal(isPreparedCampfire(adminPrepared), true);
assert.equal(isPreparedCampfire({ ...adminPrepared, providesLight: true }), false);
assert.equal(adminPrepared.data.prepared, true);
assert.equal(adminPrepared.data.unlit, true);
assert.equal(adminPrepared.data.litAt, undefined);
assert.equal(adminPrepared.data.expiresAt, undefined);
assert.equal(isHandmadeCampfire({ ...prepared, data: { ...adminPrepared.data, debug: true, handmade: false } }), false);

assert.equal(handmadeCampfireCount([prepared, prepared]), 2);
assert.equal(canBuildAnotherHandmadeCampfire([prepared, prepared]), true);
assert.equal(canBuildAnotherHandmadeCampfire([prepared, prepared, prepared]), false);
assert.equal(firstRelightableCampfireId([
  {
    id: 10,
    type: "CAMPFIRE",
    providesLight: false,
    data: { is_campfire: true, handmade: true },
  },
  { ...prepared, id: 11 },
]), 11);

const firstDarkFireText = campfireIgnitionAtmosphereText({ wasFirstActiveCampfire: true, hadLocalLightBefore: false });
assert.match(firstDarkFireText, /затишніше/u);
assert.match(firstDarkFireText, /відновлювати швидше/u);
assert.match(firstDarkFireText, /легше помітити/u);

const firstLitFireText = campfireIgnitionAtmosphereText({ wasFirstActiveCampfire: true, hadLocalLightBefore: true });
assert.match(firstLitFireText, /затишніше/u);
assert.doesNotMatch(firstLitFireText, /легше помітити/u);

assert.equal(campfireIgnitionAtmosphereText({ wasFirstActiveCampfire: false, hadLocalLightBefore: false }), "");

console.log("Campfire build helpers OK");
