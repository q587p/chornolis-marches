const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register");

const { MINUTES_PER_WORLD_DAY } = require("../../src/data/worldClock");
const {
  STRANGE_TOTEM_FRESH_TWIGS_MAX,
  STRANGE_TOTEM_FRESH_TWIGS_MIN,
  STRANGE_TOTEM_LAST_DAY_START_DAYS,
  STRANGE_TOTEM_LIFETIME_DAYS,
  STRANGE_TOTEM_OLD_TWIGS,
  isStrangeTotemFeature,
  strangeTotemAgeState,
  strangeTotemDailySpawnMarker,
  strangeTotemDetailLine,
  strangeTotemDismantleText,
  strangeTotemInspectionTextSync,
  strangeTotemRecoveredTwigs,
  strangeTotemRegionCap,
  strangeTotemSchedule,
} = require("../../src/services/strangeTotems");

const ROOT = path.resolve(__dirname, "../..");
const features = JSON.parse(fs.readFileSync(path.join(ROOT, "prisma/data/world/features.json"), "utf8"));
const locations = JSON.parse(fs.readFileSync(path.join(ROOT, "prisma/data/world/locations.json"), "utf8"));
const locationRegionByKey = new Map(locations.map((location) => [location.key, location.regionKey]));

const seededTotems = features.filter((feature) => feature.data?.strange_totem === true);
const totemsByRegion = seededTotems.reduce((counts, feature) => {
  const regionKey = locationRegionByKey.get(feature.locationKey);
  counts.set(regionKey, (counts.get(regionKey) ?? 0) + 1);
  return counts;
}, new Map());

assert.equal(seededTotems.length, 4);
assert.equal(totemsByRegion.get("dry_luka"), 3);
assert.equal(totemsByRegion.get("riverbank"), 1);
assert.equal(strangeTotemRegionCap("dry_luka"), 5);
assert.equal(strangeTotemRegionCap("riverbank"), 2);
assert.equal(strangeTotemRegionCap("chornolis_border"), 0);

const day1Marker = strangeTotemDailySpawnMarker(1);
const day10Marker = strangeTotemDailySpawnMarker(10);
assert.equal(`${day1Marker} chance=35`.includes(day1Marker), true);
assert.equal(`${day10Marker} chance=35`.includes(day10Marker), true);
assert.equal(`${day10Marker} chance=35`.includes(day1Marker), false);

const freshTotem = {
  id: 13,
  key: "test_totem",
  type: "LANDMARK",
  isActive: true,
  description: "Тестовий тотем.",
  data: { strange_totem: true, twigsFreshMin: 2, twigsFreshMax: 3, twigsOld: 1 },
};
const inactiveTotem = { ...freshTotem, isActive: false };
const wrongTypeTotem = { ...freshTotem, type: "CAMPFIRE" };

assert.equal(isStrangeTotemFeature(freshTotem), true);
assert.equal(isStrangeTotemFeature(inactiveTotem), false);
assert.equal(isStrangeTotemFeature(wrongTypeTotem), false);

const minute = 1000;
const schedule = strangeTotemSchedule(freshTotem, minute);
assert.equal(schedule.spawnedAtMinute, minute);
assert.equal(schedule.fadingAtMinute, minute + STRANGE_TOTEM_LAST_DAY_START_DAYS * MINUTES_PER_WORLD_DAY);
assert.equal(schedule.expiresAtMinute, minute + STRANGE_TOTEM_LIFETIME_DAYS * MINUTES_PER_WORLD_DAY);
const scheduledTotem = { ...freshTotem, data: { ...freshTotem.data, ...schedule } };

assert.equal(strangeTotemAgeState(scheduledTotem, minute), "fresh");
assert.equal(strangeTotemAgeState(scheduledTotem, schedule.fadingAtMinute), "old");
assert.equal(strangeTotemAgeState(scheduledTotem, schedule.expiresAtMinute), "expired");

const freshReward = strangeTotemRecoveredTwigs(scheduledTotem, minute);
assert.ok(freshReward >= STRANGE_TOTEM_FRESH_TWIGS_MIN && freshReward <= STRANGE_TOTEM_FRESH_TWIGS_MAX);
assert.equal(strangeTotemRecoveredTwigs(scheduledTotem, schedule.fadingAtMinute), STRANGE_TOTEM_OLD_TWIGS);
assert.equal(strangeTotemRecoveredTwigs({ ...scheduledTotem, data: { ...scheduledTotem.data, lastDayTwigDroppedAtMinute: schedule.fadingAtMinute } }, minute), STRANGE_TOTEM_OLD_TWIGS);

assert.match(strangeTotemDetailLine(scheduledTotem, minute), /розібрати|хмиз/u);
assert.match(strangeTotemDetailLine(scheduledTotem, schedule.fadingAtMinute), /давно|скоро/u);
assert.match(strangeTotemInspectionTextSync(scheduledTotem, schedule.fadingAtMinute), /давно|розвалиться|хмиз/u);
assert.doesNotMatch(strangeTotemDismantleText(1), /×1/u);
assert.match(strangeTotemDismantleText(3), /×3/u);

console.log("Strange totems OK");
