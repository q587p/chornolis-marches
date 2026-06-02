const assert = require("node:assert/strict");

require("ts-node/register");

const { normalizeTrackQuery, normalizedTrackSearchKeys, trackMatchesQuery } = require("../../src/services/trackSearch");

const catTrack = {
  label: "слід: Кіт-бережник",
  creature: {
    name: "Кіт-бережник",
    species: {
      key: "camp_spirit_cat",
      name: "кіт",
    },
  },
};

const playerTrack = {
  label: "людський слід",
  player: {
    nameNominative: "Аїд",
    firstName: "Аїд",
    username: "clockworksnail",
  },
};

assert.equal(trackMatchesQuery(catTrack, normalizeTrackQuery("кіт")), true);
assert.equal(trackMatchesQuery(catTrack, normalizeTrackQuery("cat")), true);
assert.equal(trackMatchesQuery(catTrack, normalizeTrackQuery("бережник")), true);
assert.equal(trackMatchesQuery(catTrack, normalizeTrackQuery("миша")), false);

assert.equal(trackMatchesQuery(playerTrack, normalizeTrackQuery("аїд")), true);
assert.equal(trackMatchesQuery(playerTrack, normalizeTrackQuery("clockworksnail")), true);
assert.equal(trackMatchesQuery(playerTrack, normalizeTrackQuery("кіт")), false);

assert.ok(normalizedTrackSearchKeys(catTrack).includes("кіт"));

console.log("Track search helpers OK");
