const assert = require("node:assert/strict");

require("ts-node/register");

const { MINUTES_PER_WORLD_DAY } = require("../../src/data/worldClock");
const {
  EXTINGUISHED_CAMPFIRE_DECAY_MINUTES,
  EXTINGUISHED_CAMPFIRE_FADING_MINUTES,
  campfireAshExpiresAtMinute,
  isDecayableExtinguishedCampfire,
  isExtinguishedCampfireAshFading,
  shouldRemoveExtinguishedCampfireAsh,
} = require("../../src/services/fire");

assert.equal(EXTINGUISHED_CAMPFIRE_DECAY_MINUTES, 2 * MINUTES_PER_WORLD_DAY);
assert.equal(EXTINGUISHED_CAMPFIRE_FADING_MINUTES, 120);

const start = 185_340;
const handmadeAsh = {
  type: "CAMPFIRE",
  providesLight: false,
  data: {
    is_campfire: true,
    extinguished: true,
    ashFadingAtMinute: start + EXTINGUISHED_CAMPFIRE_DECAY_MINUTES - EXTINGUISHED_CAMPFIRE_FADING_MINUTES,
    ashExpiresAtMinute: start + EXTINGUISHED_CAMPFIRE_DECAY_MINUTES,
  },
};

const seededAsh = {
  ...handmadeAsh,
  data: { ...handmadeAsh.data, seeded: true },
};

assert.equal(isDecayableExtinguishedCampfire(handmadeAsh), true);
assert.equal(isDecayableExtinguishedCampfire(seededAsh), false);
assert.equal(campfireAshExpiresAtMinute(handmadeAsh), start + EXTINGUISHED_CAMPFIRE_DECAY_MINUTES);
assert.equal(isExtinguishedCampfireAshFading(handmadeAsh, start + EXTINGUISHED_CAMPFIRE_DECAY_MINUTES - 121), false);
assert.equal(isExtinguishedCampfireAshFading(handmadeAsh, start + EXTINGUISHED_CAMPFIRE_DECAY_MINUTES - 120), true);
assert.equal(shouldRemoveExtinguishedCampfireAsh(handmadeAsh, start + EXTINGUISHED_CAMPFIRE_DECAY_MINUTES - 1), false);
assert.equal(shouldRemoveExtinguishedCampfireAsh(handmadeAsh, start + EXTINGUISHED_CAMPFIRE_DECAY_MINUTES), true);
assert.equal(shouldRemoveExtinguishedCampfireAsh(seededAsh, start + EXTINGUISHED_CAMPFIRE_DECAY_MINUTES + 13), false);

console.log("Campfire decay helpers OK");
