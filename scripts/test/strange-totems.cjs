const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register");

const { MINUTES_PER_WORLD_DAY } = require("../../src/data/worldClock");
const {
  STRANGE_TOTEM_DESCRIPTION_POOLS,
  STRANGE_TOTEM_DISMANTLE_FLOURISHES,
  STRANGE_TOTEM_NPC_DISMANTLE_LINES,
  STRANGE_TOTEM_FRESH_TWIGS_MAX,
  STRANGE_TOTEM_FRESH_TWIGS_MIN,
  STRANGE_TOTEM_LAST_DAY_START_DAYS,
  STRANGE_TOTEM_LIFETIME_DAYS,
  STRANGE_TOTEM_OLD_TWIGS,
  STRANGE_TOTEM_PROTECTED_REGION_KEYS,
  STRANGE_TOTEM_REGION_CAPS,
  isStrangeTotemProtectedSpawnLocation,
  isStrangeTotemFeature,
  strangeTotemDescriptionForRegion,
  strangeTotemDescriptionPoolForRegion,
  strangeTotemAgeState,
  strangeTotemDailySpawnMarker,
  strangeTotemDetailLine,
  strangeTotemDismantleText,
  strangeTotemInspectionTextSync,
  strangeTotemNpcDismantleLine,
  strangeTotemRecoveredTwigs,
  strangeTotemRegionCap,
  strangeTotemSchedule,
} = require("../../src/services/strangeTotems");
const {
  NPC_TOTEM_DISMANTLE_PRIORITY,
  TOTEM_DISMANTLING_PROFESSION_KEYS,
  canProfessionNpcDismantleTotem,
} = require("../../src/services/npcTotemDismantling");

const ROOT = path.resolve(__dirname, "../..");
const exits = JSON.parse(fs.readFileSync(path.join(ROOT, "prisma/data/world/exits.json"), "utf8"));
const features = JSON.parse(fs.readFileSync(path.join(ROOT, "prisma/data/world/features.json"), "utf8"));
const locations = JSON.parse(fs.readFileSync(path.join(ROOT, "prisma/data/world/locations.json"), "utf8"));
const locationRegionByKey = new Map(locations.map((location) => [location.key, location.regionKey]));
const strangeTotemSource = fs.readFileSync(path.join(ROOT, "src/services/strangeTotems.ts"), "utf8");
const herbalistSource = fs.readFileSync(path.join(ROOT, "src/services/npcHerbalist.ts"), "utf8");
const hunterSource = fs.readFileSync(path.join(ROOT, "src/services/npcHunter.ts"), "utf8");

const seededTotems = features.filter((feature) => feature.data?.strange_totem === true);
const totemsByRegion = seededTotems.reduce((counts, feature) => {
  const regionKey = locationRegionByKey.get(feature.locationKey);
  counts.set(regionKey, (counts.get(regionKey) ?? 0) + 1);
  return counts;
}, new Map());

assert.equal(seededTotems.length, 4);
assert.equal(totemsByRegion.get("dry_luka"), 3);
assert.equal(totemsByRegion.get("riverbank"), 1);
assert.deepEqual(STRANGE_TOTEM_REGION_CAPS, {
  dry_luka: 13,
  riverbank: 3,
  chornolis_border: 5,
  willow_floodplain: 1,
});
assert.equal(strangeTotemRegionCap("dry_luka"), 13);
assert.equal(strangeTotemRegionCap("riverbank"), 3);
assert.equal(strangeTotemRegionCap("chornolis_border"), 5);
assert.equal(strangeTotemRegionCap("willow_floodplain"), 1);
assert.equal(strangeTotemRegionCap("starter_camp"), 0);
assert.equal(strangeTotemRegionCap("old_bridge"), 0);
assert.equal(strangeTotemRegionCap("closed_settlement_gate"), 0);
assert.equal(strangeTotemRegionCap("dream_tutorial"), 0);
assert.deepEqual([...STRANGE_TOTEM_PROTECTED_REGION_KEYS].sort(), [
  "closed_settlement_gate",
  "dream_tutorial",
  "old_bridge",
  "starter_camp",
]);

const cappedRegionKeys = Object.keys(STRANGE_TOTEM_REGION_CAPS).sort();
assert.deepEqual(cappedRegionKeys, ["chornolis_border", "dry_luka", "riverbank", "willow_floodplain"]);
const visibleExitFromKeys = new Set(exits.filter((exit) => exit.isHidden !== true).map((exit) => exit.fromKey));
const staticEligibleLocations = locations.filter((location) => {
  const region = { key: location.regionKey };
  return strangeTotemRegionCap(location.regionKey) > 0
    && !isStrangeTotemProtectedSpawnLocation({ key: location.key, region })
    && visibleExitFromKeys.has(location.key);
});
for (const regionKey of cappedRegionKeys) {
  assert.ok(staticEligibleLocations.some((location) => location.regionKey === regionKey), `${regionKey} should have at least one statically eligible spawn location`);
}
for (const location of staticEligibleLocations) {
  assert.ok(cappedRegionKeys.includes(location.regionKey), `unexpected eligible region: ${location.regionKey}`);
  assert.equal(isStrangeTotemProtectedSpawnLocation({ key: location.key, region: { key: location.regionKey } }), false);
}
const underBridge = locations.find((location) => location.key === "under_bridge_18_05");
assert.ok(underBridge, "under_bridge_18_05 should exist in world data");
assert.equal(underBridge.regionKey, "riverbank");
assert.equal(isStrangeTotemProtectedSpawnLocation({ key: underBridge.key, region: { key: underBridge.regionKey } }), false);
assert.ok(staticEligibleLocations.some((location) => location.key === "under_bridge_18_05"), "under_bridge_18_05 should be eligible as an ordinary riverbank location");
const starterCamp = locations.find((location) => location.key === "start_border_camp");
assert.ok(starterCamp, "start_border_camp should exist in world data");
assert.equal(starterCamp.regionKey, "starter_camp");
assert.equal(isStrangeTotemProtectedSpawnLocation({ key: starterCamp.key, region: { key: starterCamp.regionKey } }), true);
assert.doesNotMatch(
  strangeTotemSource,
  /players:\s*\{\s*where:\s*\{\s*sessionPresence:\s*"ACTIVE"/u,
  "strange totem spawning should not avoid active player presence",
);
assert.doesNotMatch(
  strangeTotemSource,
  /species:\s*\{\s*kind:\s*\{\s*not:\s*"ANIMAL"/u,
  "strange totem spawning should not avoid visible non-animal NPC/monster/spirit presence",
);

for (const regionKey of STRANGE_TOTEM_PROTECTED_REGION_KEYS) {
  const protectedRegionLocations = locations.filter((location) => location.regionKey === regionKey);
  assert.ok(protectedRegionLocations.length > 0, `${regionKey} should exist in world data`);
  for (const location of protectedRegionLocations) {
    assert.equal(isStrangeTotemProtectedSpawnLocation({ key: location.key, region: { key: location.regionKey } }), true);
    assert.equal(staticEligibleLocations.some((eligible) => eligible.key === location.key), false);
  }
}

const descriptionKeywordChecks = {
  dry_luka: /лук|трав|сух|стеб|полин|будяк|ковил|хмиз|стеж/u,
  riverbank: /берег|вод|мул|очерет|корін|річк|течі|вогк/u,
  chornolis_border: /ліс|корін|меж|поріг|дерев|тін/u,
  willow_floodplain: /верб|заплав|мокр|мул|вода|корін/u,
};
assert.ok(STRANGE_TOTEM_DESCRIPTION_POOLS.dry_luka.length >= 13, "dry_luka should support many totem variants");
assert.ok(STRANGE_TOTEM_DESCRIPTION_POOLS.riverbank.length >= 3, "riverbank should have several wet-edge variants");
assert.ok(STRANGE_TOTEM_DESCRIPTION_POOLS.chornolis_border.length >= 5, "chornolis_border should have forest-edge variants");
assert.equal(STRANGE_TOTEM_DESCRIPTION_POOLS.willow_floodplain.length, 1, "willow_floodplain should stay a rare one-flavor cap");
for (const [regionKey, pool] of Object.entries(STRANGE_TOTEM_DESCRIPTION_POOLS)) {
  assert.equal(strangeTotemDescriptionPoolForRegion(regionKey), pool);
  assert.equal(new Set(pool).size, pool.length, `${regionKey} totem descriptions should not repeat exactly`);
  for (const description of pool) {
    assert.equal(typeof description, "string");
    assert.ok(description.trim().length > 40, `${regionKey} description should be non-empty and descriptive`);
    assert.match(description, descriptionKeywordChecks[regionKey], `${regionKey} description should carry regional flavor: ${description}`);
  }
  for (let index = 0; index < 25; index += 1) {
    const selected = strangeTotemDescriptionForRegion(regionKey);
    assert.ok(pool.includes(selected), `${regionKey} selector should return one of its region descriptions`);
  }
}
assert.equal(strangeTotemDescriptionPoolForRegion("unknown_region"), STRANGE_TOTEM_DESCRIPTION_POOLS.dry_luka);

const day1Marker = strangeTotemDailySpawnMarker(1);
const day10Marker = strangeTotemDailySpawnMarker(10);
const day1AttemptDescription = `${day1Marker} chance=35`;
const day10AttemptDescription = `${day10Marker} chance=35`;
assert.equal(day1AttemptDescription.includes(day1Marker), true);
assert.equal(day10AttemptDescription.includes(day10Marker), true);
assert.equal(day10AttemptDescription.includes(day1Marker), false);
assert.equal(day1AttemptDescription.includes(day10Marker), false);

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
assert.equal(STRANGE_TOTEM_FRESH_TWIGS_MIN, 2);
assert.equal(STRANGE_TOTEM_FRESH_TWIGS_MAX, 3);
assert.equal(STRANGE_TOTEM_OLD_TWIGS, 1);
assert.equal(strangeTotemRecoveredTwigs(scheduledTotem, schedule.fadingAtMinute), STRANGE_TOTEM_OLD_TWIGS);
assert.equal(strangeTotemRecoveredTwigs({ ...scheduledTotem, data: { ...scheduledTotem.data, lastDayTwigDroppedAtMinute: schedule.fadingAtMinute } }, minute), STRANGE_TOTEM_OLD_TWIGS);

assert.match(strangeTotemDetailLine(scheduledTotem, minute), /розібрати|хмиз/u);
assert.match(strangeTotemDetailLine(scheduledTotem, schedule.fadingAtMinute), /давно|скоро/u);
assert.match(strangeTotemInspectionTextSync(scheduledTotem, schedule.fadingAtMinute), /давно|розвалиться|хмиз/u);
assert.doesNotMatch(strangeTotemDismantleText(1), /×1/u);
assert.match(strangeTotemDismantleText(3), /×3/u);
assert.equal(STRANGE_TOTEM_DISMANTLE_FLOURISHES.length, 13);
assert.equal(new Set(STRANGE_TOTEM_DISMANTLE_FLOURISHES).size, 13);
assert.equal(STRANGE_TOTEM_NPC_DISMANTLE_LINES.length, 13);
assert.equal(new Set(STRANGE_TOTEM_NPC_DISMANTLE_LINES).size, 13);
for (const line of STRANGE_TOTEM_NPC_DISMANTLE_LINES) {
  assert.match(line, /тотем|знак|постат|хмиз|лоз|вуз|кора/u);
}

const generatedDismantleFlourishes = new Set();
for (let index = 0; index < 500 && generatedDismantleFlourishes.size < STRANGE_TOTEM_DISMANTLE_FLOURISHES.length; index += 1) {
  const text = strangeTotemDismantleText(3, `test_totem_${index}`);
  generatedDismantleFlourishes.add(text.split("\n\n").at(-1));
}
assert.equal(generatedDismantleFlourishes.size, 13);
for (const line of STRANGE_TOTEM_DISMANTLE_FLOURISHES) {
  assert.ok(generatedDismantleFlourishes.has(line), `Expected generated dismantle text to include: ${line}`);
}

const generatedNpcDismantleLines = new Set();
for (let index = 0; index < 500 && generatedNpcDismantleLines.size < STRANGE_TOTEM_NPC_DISMANTLE_LINES.length; index += 1) {
  generatedNpcDismantleLines.add(strangeTotemNpcDismantleLine(`npc_totem_${index}`));
}
assert.equal(generatedNpcDismantleLines.size, 13);
assert.deepEqual([...TOTEM_DISMANTLING_PROFESSION_KEYS].sort(), ["hunter", "travnytsia", "znakhar"]);
assert.equal(canProfessionNpcDismantleTotem({ professionKey: "hunter" }), true);
assert.equal(canProfessionNpcDismantleTotem({ professionKey: "znakhar" }), true);
assert.equal(canProfessionNpcDismantleTotem({ professionKey: "travnytsia" }), true);
assert.equal(canProfessionNpcDismantleTotem({ professionKey: null }), false);
assert.equal(NPC_TOTEM_DISMANTLE_PRIORITY > 20, true, "profession NPC totem cleanup should outrank ordinary totem action priority");
assert.match(
  strangeTotemSource,
  /const recovered = strangeTotemRecoveredTwigs\(scheduledFeature, currentMinute\);/u,
  "profession NPC totem dismantle should use the same twig recovery calculation as player dismantle",
);
assert.match(
  strangeTotemSource,
  /tx\.creatureResource\.upsert/u,
  "profession NPC totem dismantle should recover twigs into creature carried resources",
);
assert.match(herbalistSource, /maybeQueueProfessionTotemDismantle\(bot, creature\)/u);
assert.match(hunterSource, /maybeQueueProfessionTotemDismantle\(bot, hunter\)/u);

console.log("Strange totems OK");
