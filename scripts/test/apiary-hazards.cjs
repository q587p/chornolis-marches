const assert = require("node:assert/strict");

require("ts-node/register");

const {
  apiaryAuraDistanceFromLinks,
  apiaryAuraKind,
  apiaryCooldownWorldMinutes,
  apiaryEventAbsoluteMinute,
  apiaryEventDescriptionMatches,
  apiaryFeatureSummary,
  apiaryPassiveChancePermille,
  apiaryPassiveCooldownMs,
  apiaryPassiveDamageRange,
  apiaryRaidCooldownMs,
  apiaryRaidDamageRange,
  apiaryRaidHoneyAmount,
  apiaryRaidOutcome,
  apiaryRaidSuccessChancePermille,
  apiaryRaidWaxChancePermille,
  isApiaryCooldownActive,
  isApiaryWorldCooldownActive,
  isApiarySleepingForPassiveHazard,
  passiveApiaryDamageResult,
} = require("../../src/services/apiaryHazards");

const apiaryData = {
  aura_radius: 1,
  center_sting_chance_permille: 777,
  neighbor_sting_chance_permille: 130,
  center_damage: [2, 3],
  neighbor_damage: [1, 1],
  passive_cooldown_ms: 120_000,
  night_passive_sleeping: true,
  raid_cooldown_ms: 720_000,
  raid_success_chance_permille: 700,
  raid_wax_chance_permille: 350,
  raid_damage: [2, 5],
  raid_honey_amount: 1,
};

assert.equal(apiaryAuraDistanceFromLinks(10, 10, [11, 12], 1), 0);
assert.equal(apiaryAuraDistanceFromLinks(10, 11, [10, 12], 1), 1);
assert.equal(apiaryAuraDistanceFromLinks(10, 12, [11, 13], 1), null);
assert.equal(apiaryAuraDistanceFromLinks(10, 11, [10, 12], 0), null);

assert.equal(apiaryAuraKind(0, apiaryData), "center");
assert.equal(apiaryAuraKind(1, apiaryData), "neighbor");
assert.equal(apiaryAuraKind(2, apiaryData), "outside");
assert.equal(apiaryPassiveChancePermille("center", apiaryData), 777);
assert.equal(apiaryPassiveChancePermille("neighbor", apiaryData), 130);
assert.equal(apiaryPassiveChancePermille("outside", apiaryData), 0);
assert.deepEqual(apiaryPassiveDamageRange("center", apiaryData), [2, 3]);
assert.deepEqual(apiaryPassiveDamageRange("neighbor", apiaryData), [1, 1]);
assert.deepEqual(apiaryPassiveDamageRange("outside", apiaryData), [0, 0]);

assert.equal(isApiarySleepingForPassiveHazard("night", apiaryData), true);
assert.equal(isApiarySleepingForPassiveHazard("dusk", apiaryData), false);
assert.equal(isApiarySleepingForPassiveHazard("dawn", apiaryData), false);
assert.equal(isApiarySleepingForPassiveHazard("day", apiaryData), false);

assert.equal(apiaryPassiveCooldownMs(apiaryData), 120_000);
assert.equal(apiaryEventDescriptionMatches("apiaryKey=meadow_old_log_apiary_12_02; damage=1", "meadow_old_log_apiary_12_02"), true);
assert.equal(apiaryEventDescriptionMatches("apiaryKey=other; damage=1", "meadow_old_log_apiary_12_02"), false);

const now = new Date("2026-06-03T12:00:00.000Z");
assert.equal(isApiaryCooldownActive(new Date(now.getTime() - 60_000), now, 120_000), true);
assert.equal(isApiaryCooldownActive(new Date(now.getTime() - 120_001), now, 120_000), false);
assert.equal(isApiaryCooldownActive(null, now, 120_000), false);
assert.equal(apiaryCooldownWorldMinutes(120_000, 2_000), 60);
assert.equal(apiaryCooldownWorldMinutes(720_000, 2_000), 360);
assert.equal(apiaryEventAbsoluteMinute("apiaryKey=meadow_old_log_apiary_12_02; absoluteMinute=123456; damage=1"), 123456);
assert.equal(apiaryEventAbsoluteMinute("apiaryKey=meadow_old_log_apiary_12_02; damage=1"), null);
assert.equal(isApiaryWorldCooldownActive("apiaryKey=x; absoluteMinute=1000; damage=1", 1059, 120_000), true);
assert.equal(isApiaryWorldCooldownActive("apiaryKey=x; absoluteMinute=1000; damage=1", 1060, 120_000), false);
assert.equal(isApiaryWorldCooldownActive("apiaryKey=x; damage=1", 1001, 120_000), false);

assert.deepEqual(passiveApiaryDamageResult(2, 5), { appliedDamage: 1, nextHp: 1 });
assert.deepEqual(passiveApiaryDamageResult(20, 2), { appliedDamage: 2, nextHp: 18 });
assert.deepEqual(passiveApiaryDamageResult(1, 1), { appliedDamage: 0, nextHp: 1 });

assert.equal(apiaryRaidCooldownMs(apiaryData), 720_000);
assert.equal(apiaryRaidSuccessChancePermille(apiaryData), 700);
assert.equal(apiaryRaidWaxChancePermille(apiaryData), 350);
assert.deepEqual(apiaryRaidDamageRange(apiaryData), [2, 5]);
assert.equal(apiaryRaidHoneyAmount(apiaryData), 1);
assert.equal(apiaryFeatureSummary({ examine_summary: "гуде важким джмелиним життям" }), "гуде важким джмелиним життям");
assert.match(apiaryFeatureSummary({ examine_summary: "гуде важким джмелиним життям" }, true), /стривожена/u);
assert.match(apiaryFeatureSummary({ examine_summary: "гуде важким джмелиним життям" }, true), /меду зараз не дасть/u);
assert.doesNotMatch(apiaryFeatureSummary({ examine_summary: "гуде важким джмелиним життям" }, true), /гуде важким/u);

function scriptedRandom(values) {
  let index = 0;
  return () => values[index++] ?? 0;
}

assert.deepEqual(apiaryRaidOutcome(apiaryData, 10, scriptedRandom([0.1, 0.2, 0.0])), {
  success: true,
  honey: 1,
  beeswax: 1,
  appliedDamage: 2,
  nextHp: 8,
});

assert.deepEqual(apiaryRaidOutcome(apiaryData, 3, scriptedRandom([0.9, 0.0])), {
  success: false,
  honey: 0,
  beeswax: 0,
  appliedDamage: 2,
  nextHp: 1,
});

console.log("Apiary hazard helpers OK");
