import { PlayerSleepState } from "@prisma/client";
import { prisma } from "../db";
import { playerForms } from "./grammar";
import { setPlayerFollowIntent } from "./following";

export const TRAVEL_GROUP_ROLE_LEADER = "LEADER";
export const TRAVEL_GROUP_ROLE_MEMBER = "MEMBER";
export const TRAVEL_GROUP_STATUS_INVITED = "INVITED";
export const TRAVEL_GROUP_STATUS_ACTIVE = "ACTIVE";
export const TRAVEL_GROUP_STATUS_LEFT = "LEFT";

const CURRENT_GROUP_STATUSES = [TRAVEL_GROUP_STATUS_ACTIVE, TRAVEL_GROUP_STATUS_INVITED];

type PlayerLabelInput = {
  id?: number | null;
  currentLocationId?: number | null;
  firstName?: string | null;
  nameNominative?: string | null;
  nameGenitive?: string | null;
  nameDative?: string | null;
  nameAccusative?: string | null;
  nameInstrumental?: string | null;
  nameLocative?: string | null;
  nameVocative?: string | null;
  username?: string | null;
};

type TravelGroupMemberLike = {
  role: string;
  status: string;
  player: PlayerLabelInput;
};

type TravelGroupLike = {
  leaderPlayer: PlayerLabelInput;
  members: TravelGroupMemberLike[];
};

export type TravelGroupStatusView =
  | { state: "none"; text: string }
  | { state: "invited"; text: string }
  | { state: "active"; text: string; isLeader: boolean };

export function travelGroupPlayerLabel(player: PlayerLabelInput | null | undefined) {
  return player ? playerForms(player).nominative : "невідомий мандрівник";
}

export function travelGroupUsageText() {
  return [
    "Ви ще не в дорожньому гурті.",
    "Створити: /group_create",
    "Запросити видимого мандрівника: /group_invite <ім'я>",
    "Якщо вас покликали: /group_accept або /group_decline",
  ].join("\n");
}

export function travelGroupCreateText() {
  return "Ви збираєте дорожній гурт. Поки що це домовленість про спільний шлях, не ланцюг і не наказ.";
}

export function travelGroupInviteText(targetLabel: string) {
  return `Ви кличете ${targetLabel} до дорожнього гурту. Вони мають прийняти це самі.`;
}

export function travelGroupInviteReceivedText(leaderLabel: string) {
  return [
    `${leaderLabel} кличе вас до дорожнього гурту.`,
    "Прийняти: /group_accept",
    "Відхилити: /group_decline",
  ].join("\n");
}

export function travelGroupAcceptText(leaderLabel: string) {
  return `Ви стаєте до гурту ${leaderLabel}. Триматися поруч — усе ще власний крок.`;
}

export function travelGroupDeclineText(leaderLabel: string) {
  return `Ви відхиляєте поклик до гурту ${leaderLabel}. Далі — власний темп.`;
}

export function travelGroupLeaveText() {
  return "Ви виходите з гурту. Далі — власний темп.\nСлід провідника лишається, якщо ви самі його не відпустите: /unfollow.";
}

export function travelGroupDisbandText() {
  return "Ви розпускаєте дорожній гурт. Домовленість стихає, а крок кожного знову належить йому самому.";
}

export function travelGroupFollowLeaderText(leaderLabel: string) {
  return `Ви тримаєтеся сліду провідника гурту: ${leaderLabel}. Це ще не спільна хода; для слідування увімкніть /follow_assist_on.`;
}

export function travelGroupNoRawIds(text: string) {
  return !/(?:groupId|playerId|#\d+|id=|\bID\b)/u.test(text);
}

export function travelGroupStatusText(group: TravelGroupLike, options: { viewerLocationId?: number | null } = {}) {
  const leader = travelGroupPlayerLabel(group.leaderPlayer);
  const activeMembers = group.members
    .filter((member) => member.status === TRAVEL_GROUP_STATUS_ACTIVE && member.role !== TRAVEL_GROUP_ROLE_LEADER);
  const nearbyMembers = options.viewerLocationId == null
    ? activeMembers
    : activeMembers.filter((member) => member.player.currentLocationId === options.viewerLocationId);
  const elsewhereMembers = options.viewerLocationId == null
    ? []
    : activeMembers.filter((member) => member.player.currentLocationId !== options.viewerLocationId);
  const invited = group.members
    .filter((member) => member.status === TRAVEL_GROUP_STATUS_INVITED)
    .map((member) => travelGroupPlayerLabel(member.player));
  const lines = [
    "Дорожній гурт:",
    `Провідник: ${leader}`,
  ];
  if (options.viewerLocationId == null) {
    const names = activeMembers.map((member) => travelGroupPlayerLabel(member.player));
    lines.push(`У гурті: ${names.length ? names.join(", ") : "поки нікого поруч із домовленістю"}`);
  } else {
    lines.push(`Поруч: ${nearbyMembers.length ? nearbyMembers.map((member) => travelGroupPlayerLabel(member.player)).join(", ") : "поки нікого"}`);
    if (elsewhereMembers.length) {
      lines.push(`Не поруч: ${elsewhereMembers.map((member) => travelGroupPlayerLabel(member.player)).join(", ")}`);
    }
  }
  if (invited.length) lines.push(`Запрошені: ${invited.join(", ")}`);
  lines.push("Триматися провідника: /group_follow_leader");
  lines.push("Вийти: /group_leave");
  return lines.join("\n");
}

function currentGroupInclude() {
  return {
    player: true,
    group: {
      include: {
        leaderPlayer: true,
        members: {
          where: { status: { in: CURRENT_GROUP_STATUSES } },
          include: { player: true },
          orderBy: { id: "asc" as const },
        },
      },
    },
  };
}

export async function activeTravelGroupMembership(playerId: number) {
  return prisma.travelGroupMember.findFirst({
    where: { playerId, status: TRAVEL_GROUP_STATUS_ACTIVE },
    include: currentGroupInclude(),
    orderBy: { joinedAt: "desc" },
  });
}

export async function pendingTravelGroupInvite(playerId: number) {
  return prisma.travelGroupMember.findFirst({
    where: { playerId, status: TRAVEL_GROUP_STATUS_INVITED },
    include: currentGroupInclude(),
    orderBy: { createdAt: "desc" },
  });
}

export async function travelGroupStatusForPlayer(playerId: number) {
  return (await travelGroupStatusViewForPlayer(playerId)).text;
}

export async function travelGroupStatusViewForPlayer(playerId: number): Promise<TravelGroupStatusView> {
  const active = await activeTravelGroupMembership(playerId);
  if (active) {
    return {
      state: "active",
      text: travelGroupStatusText(active.group, { viewerLocationId: active.player.currentLocationId }),
      isLeader: active.role === TRAVEL_GROUP_ROLE_LEADER || active.group.leaderPlayerId === playerId,
    };
  }
  const invite = await pendingTravelGroupInvite(playerId);
  if (invite) {
    return {
      state: "invited",
      text: [
      `Вас кличуть до дорожнього гурту ${travelGroupPlayerLabel(invite.group.leaderPlayer)}.`,
      "Прийняти: /group_accept",
      "Відхилити: /group_decline",
      ].join("\n"),
    };
  }
  return { state: "none", text: travelGroupUsageText() };
}

export async function createTravelGroupForPlayer(playerId: number) {
  const [active, pending] = await Promise.all([
    activeTravelGroupMembership(playerId),
    pendingTravelGroupInvite(playerId),
  ]);
  if (active) return { ok: false as const, text: travelGroupStatusText(active.group) };
  if (pending) return { ok: false as const, text: "Вас уже кличуть до іншого дорожнього гурту. Спершу прийміть або відхиліть поклик." };

  const group = await prisma.travelGroup.create({
    data: {
      leaderPlayerId: playerId,
      members: {
        create: {
          playerId,
          role: TRAVEL_GROUP_ROLE_LEADER,
          status: TRAVEL_GROUP_STATUS_ACTIVE,
          joinedAt: new Date(),
        },
      },
    },
  });
  return { ok: true as const, groupId: group.id, text: travelGroupCreateText() };
}

export async function invitePlayerToTravelGroup(input: {
  leaderPlayerId: number;
  targetPlayerId: number;
}) {
  if (input.leaderPlayerId === input.targetPlayerId) {
    return { ok: false as const, reason: "self", text: "Власний крок уже з вами. До гурту кличуть інших." };
  }

  const leaderMembership = await activeTravelGroupMembership(input.leaderPlayerId);
  if (!leaderMembership) return { ok: false as const, reason: "no-group", text: "Спершу створіть дорожній гурт: /group_create." };
  if (leaderMembership.role !== TRAVEL_GROUP_ROLE_LEADER || leaderMembership.group.leaderPlayerId !== input.leaderPlayerId) {
    return { ok: false as const, reason: "not-leader", text: "Кликати до гурту може тільки його провідник." };
  }

  const [target, targetActive, targetPending] = await Promise.all([
    prisma.player.findUnique({ where: { id: input.targetPlayerId } }),
    activeTravelGroupMembership(input.targetPlayerId),
    pendingTravelGroupInvite(input.targetPlayerId),
  ]);
  if (!target) return { ok: false as const, reason: "missing-target", text: "Не вдалося знайти цього мандрівника." };
  if (targetActive) return { ok: false as const, reason: "target-in-group", text: `${travelGroupPlayerLabel(target)} вже в дорожньому гурті.` };
  if (targetPending) return { ok: false as const, reason: "target-invited", text: `${travelGroupPlayerLabel(target)} уже має поклик до гурту.` };

  await prisma.travelGroupMember.create({
    data: {
      groupId: leaderMembership.groupId,
      playerId: input.targetPlayerId,
      role: TRAVEL_GROUP_ROLE_MEMBER,
      status: TRAVEL_GROUP_STATUS_INVITED,
      invitedByPlayerId: input.leaderPlayerId,
    },
  });

  const targetLabel = travelGroupPlayerLabel(target);
  return {
    ok: true as const,
    target,
    leader: leaderMembership.player,
    text: travelGroupInviteText(targetLabel),
    targetMessage: travelGroupInviteReceivedText(travelGroupPlayerLabel(leaderMembership.player)),
  };
}

export async function acceptTravelGroupInvite(playerId: number) {
  const [active, invite] = await Promise.all([
    activeTravelGroupMembership(playerId),
    pendingTravelGroupInvite(playerId),
  ]);
  if (active) return { ok: false as const, text: "Ви вже в дорожньому гурті." };
  if (!invite) return { ok: false as const, text: "До вас зараз не тягнеться жоден поклик до гурту." };

  await prisma.travelGroupMember.update({
    where: { id: invite.id },
    data: { status: TRAVEL_GROUP_STATUS_ACTIVE, joinedAt: new Date(), leftAt: null },
  });
  return { ok: true as const, text: travelGroupAcceptText(travelGroupPlayerLabel(invite.group.leaderPlayer)) };
}

export async function declineTravelGroupInvite(playerId: number) {
  const invite = await pendingTravelGroupInvite(playerId);
  if (!invite) return { ok: false as const, text: "До вас зараз не тягнеться жоден поклик до гурту." };
  await prisma.travelGroupMember.update({
    where: { id: invite.id },
    data: { status: TRAVEL_GROUP_STATUS_LEFT, leftAt: new Date() },
  });
  return { ok: true as const, text: travelGroupDeclineText(travelGroupPlayerLabel(invite.group.leaderPlayer)) };
}

async function markTravelGroupInactive(groupId: number) {
  await prisma.travelGroupMember.updateMany({
    where: { groupId, status: { in: CURRENT_GROUP_STATUSES } },
    data: { status: TRAVEL_GROUP_STATUS_LEFT, leftAt: new Date() },
  });
}

export async function leaveTravelGroup(playerId: number) {
  const membership = await activeTravelGroupMembership(playerId);
  if (!membership) return { ok: false as const, text: "Ви зараз не в дорожньому гурті." };
  if (membership.role === TRAVEL_GROUP_ROLE_LEADER || membership.group.leaderPlayerId === playerId) {
    await markTravelGroupInactive(membership.groupId);
    return { ok: true as const, disbanded: true, text: travelGroupDisbandText() };
  }
  await prisma.travelGroupMember.update({
    where: { id: membership.id },
    data: { status: TRAVEL_GROUP_STATUS_LEFT, leftAt: new Date() },
  });
  return { ok: true as const, disbanded: false, text: travelGroupLeaveText() };
}

export async function disbandTravelGroup(playerId: number) {
  const membership = await activeTravelGroupMembership(playerId);
  if (!membership) return { ok: false as const, text: "Ви зараз не ведете дорожній гурт." };
  if (membership.role !== TRAVEL_GROUP_ROLE_LEADER || membership.group.leaderPlayerId !== playerId) {
    return { ok: false as const, text: "Розпустити гурт може тільки його провідник." };
  }
  await markTravelGroupInactive(membership.groupId);
  return { ok: true as const, text: travelGroupDisbandText() };
}

export async function followTravelGroupLeader(playerId: number) {
  const membership = await activeTravelGroupMembership(playerId);
  if (!membership) return { ok: false as const, text: "Спершу треба стати до дорожнього гурту." };
  const leader = membership.group.leaderPlayer;
  if (leader.id === playerId) return { ok: false as const, text: "Ви й так провідник цього гурту." };
  if (!membership.player.currentLocationId || leader.currentLocationId !== membership.player.currentLocationId || leader.hp <= 0 || leader.sleepState !== PlayerSleepState.AWAKE) {
    return { ok: false as const, text: "Провідника гурту зараз не видно поруч." };
  }

  const forms = playerForms(leader);
  await setPlayerFollowIntent(playerId, {
    type: "player",
    id: leader.id,
    label: forms.nominative,
    forms,
  }, membership.player.currentLocationId);

  return { ok: true as const, leader, text: travelGroupFollowLeaderText(forms.nominative) };
}
