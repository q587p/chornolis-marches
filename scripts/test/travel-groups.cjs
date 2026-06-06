const assert = require("node:assert/strict");
const fs = require("node:fs");

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
  acceptTravelGroupInvite,
  createTravelGroupForPlayer,
  declineTravelGroupInvite,
  disbandTravelGroup,
  followTravelGroupLeader,
  invitePlayerToTravelGroup,
  leaveTravelGroup,
} = require("../../src/services/travelGroups");

const leader = { nameNominative: "Орина", firstName: "Орина" };
const member = { nameNominative: "Левко", firstName: "Левко", currentLocationId: 10 };
const elsewhereMember = { nameNominative: "Марена", firstName: "Марена", currentLocationId: 11 };
const invited = { nameNominative: "Нестор", firstName: "Нестор" };

const status = travelGroupStatusText({
  leaderPlayer: leader,
  members: [
    { role: TRAVEL_GROUP_ROLE_LEADER, status: TRAVEL_GROUP_STATUS_ACTIVE, player: leader },
    { role: TRAVEL_GROUP_ROLE_MEMBER, status: TRAVEL_GROUP_STATUS_ACTIVE, player: member },
    { role: TRAVEL_GROUP_ROLE_MEMBER, status: TRAVEL_GROUP_STATUS_ACTIVE, player: elsewhereMember },
    { role: TRAVEL_GROUP_ROLE_MEMBER, status: TRAVEL_GROUP_STATUS_INVITED, player: invited },
  ],
});

assert.match(status, /Дорожній гурт:/);
assert.match(status, /Провідник: Орина/);
assert.match(status, /У гурті: Левко, Марена/);
assert.match(status, /Запрошені: Нестор/);
assert.match(status, /\/group_follow_leader/);
assert.equal(travelGroupNoRawIds(status), true);

const locatedStatus = travelGroupStatusText({
  leaderPlayer: { ...leader, currentLocationId: 10 },
  members: [
    { role: TRAVEL_GROUP_ROLE_LEADER, status: TRAVEL_GROUP_STATUS_ACTIVE, player: { ...leader, currentLocationId: 10 } },
    { role: TRAVEL_GROUP_ROLE_MEMBER, status: TRAVEL_GROUP_STATUS_ACTIVE, player: member },
    { role: TRAVEL_GROUP_ROLE_MEMBER, status: TRAVEL_GROUP_STATUS_ACTIVE, player: elsewhereMember },
    { role: TRAVEL_GROUP_ROLE_MEMBER, status: TRAVEL_GROUP_STATUS_INVITED, player: invited },
  ],
}, { viewerLocationId: 10 });
assert.match(locatedStatus, /Поруч: Левко/);
assert.match(locatedStatus, /Не поруч: Марена/);
assert.match(locatedStatus, /Запрошені: Нестор/);
assert.equal(travelGroupNoRawIds(locatedStatus), true);

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
for (const entrypoint of [
  acceptTravelGroupInvite,
  createTravelGroupForPlayer,
  declineTravelGroupInvite,
  disbandTravelGroup,
  followTravelGroupLeader,
  invitePlayerToTravelGroup,
  leaveTravelGroup,
]) {
  assert.equal(typeof entrypoint, "function", "travel group service entrypoint stays exported");
}

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

const aliasesSource = fs.readFileSync("src/handlers/aliases.ts", "utf8");
for (const callback of [
  "travelGroup:accept",
  "travelGroup:decline",
  "travelGroup:leave",
  "travelGroup:disband",
  "travelGroup:follow-leader",
]) {
  assert.match(aliasesSource, new RegExp(callback.replace("-", "\\-")));
}

console.log("Travel group helpers OK");
