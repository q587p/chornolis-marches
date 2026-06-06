const assert = require("node:assert/strict");

require("ts-node/register");

const {
  TRAVEL_GROUP_ROLE_LEADER,
  TRAVEL_GROUP_ROLE_MEMBER,
  TRAVEL_GROUP_STATUS_ACTIVE,
  TRAVEL_GROUP_STATUS_INVITED,
  travelGroupAcceptText,
  travelGroupCreateText,
  travelGroupDisbandText,
  travelGroupFollowLeaderText,
  travelGroupInviteReceivedText,
  travelGroupInviteText,
  travelGroupLeaveText,
  travelGroupNoRawIds,
  travelGroupStatusText,
  travelGroupUsageText,
} = require("../../src/services/travelGroups");

const leader = { nameNominative: "Орина", firstName: "Орина" };
const member = { nameNominative: "Левко", firstName: "Левко" };
const invited = { nameNominative: "Нестор", firstName: "Нестор" };

const status = travelGroupStatusText({
  leaderPlayer: leader,
  members: [
    { role: TRAVEL_GROUP_ROLE_LEADER, status: TRAVEL_GROUP_STATUS_ACTIVE, player: leader },
    { role: TRAVEL_GROUP_ROLE_MEMBER, status: TRAVEL_GROUP_STATUS_ACTIVE, player: member },
    { role: TRAVEL_GROUP_ROLE_MEMBER, status: TRAVEL_GROUP_STATUS_INVITED, player: invited },
  ],
});

assert.match(status, /Дорожній гурт:/);
assert.match(status, /Провідник: Орина/);
assert.match(status, /У гурті: Левко/);
assert.match(status, /Запрошені: Нестор/);
assert.match(status, /\/group_follow_leader/);
assert.equal(travelGroupNoRawIds(status), true);

const usage = travelGroupUsageText();
assert.match(usage, /\/group_create/);
assert.match(usage, /\/group_invite <ім'я>/);
assert.match(usage, /\/group_accept/);
assert.match(usage, /\/group_decline/);

assert.match(travelGroupCreateText(), /домовленість про спільний шлях/);
assert.match(travelGroupInviteText("Левко"), /Левко/);
assert.match(travelGroupInviteReceivedText("Орина"), /\/group_accept/);
assert.match(travelGroupAcceptText("Орина"), /власний крок/);
assert.match(travelGroupLeaveText(), /\/unfollow/);
assert.match(travelGroupDisbandText(), /розпускаєте дорожній гурт/);
assert.match(travelGroupFollowLeaderText("Орина"), /\/follow_assist on/);

for (const text of [
  travelGroupCreateText(),
  travelGroupInviteText("Левко"),
  travelGroupInviteReceivedText("Орина"),
  travelGroupAcceptText("Орина"),
  travelGroupLeaveText(),
  travelGroupDisbandText(),
  travelGroupFollowLeaderText("Орина"),
]) {
  assert.doesNotMatch(text.toLowerCase(), /party|raid/u);
  assert.equal(travelGroupNoRawIds(text), true);
}

console.log("Travel group helpers OK");
