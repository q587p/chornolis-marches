import { InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { ACTION_BASE_TICKS, TICK_MS, gatherConfig, playerStaminaCostConfig } from "../gameConfig";
import { directionLabels } from "../ui/labels";
import { buildMovementKeyboard, buildResourceMenuKeyboard, buildTargetListKeyboard } from "../ui/keyboards";
import { escapeHtml } from "../utils/text";

function isVisibleCorpse(c: any) {
  return !c.isAlive && !c.isGone && c.age === "CORPSE";
}

function isVisibleLivingCreature(c: any) {
  return c.isAlive && !c.isGone;
}

function visibleTargets(location: any, viewerPlayerId?: number) {
  const players = location.players
    .filter((p: any) => p.id !== viewerPlayerId)
    .map((p: any) => ({ type: "player" as const, id: p.id, label: p.firstName ?? p.username ?? "мандрівник", canGreet: true }));

  const livingCreatures = location.creatures
    .filter(isVisibleLivingCreature)
    .map((c: any) => ({ type: "creature" as const, id: c.id, label: c.name ?? c.species.name, canGreet: c.species.kind !== "ANIMAL" }));

  const corpses = location.creatures
    .filter(isVisibleCorpse)
    .map((c: any) => ({ type: "creature" as const, id: c.id, label: `труп: ${c.species.name}`, canGreet: false }));

  return [...players, ...livingCreatures, ...corpses];
}

function presenceText(location: any, viewerPlayerId?: number) {
  const targets = visibleTargets(location, viewerPlayerId);
  const hasCharacters = targets.some((t) => t.canGreet);
  const hasAnimals = location.creatures.some((c: any) => isVisibleLivingCreature(c) && c.species.kind === "ANIMAL");
  const hasCorpses = location.creatures.some(isVisibleCorpse);

  if (hasCharacters && hasAnimals) return "\n\n<i>Поруч хтось або щось є.</i>";
  if (hasCharacters) return "\n\n<i>Поруч хтось є.</i>";
  if (hasAnimals) return "\n\n<i>Поруч щось ворушиться.</i>";
  if (hasCorpses) return "\n\n<i>Поруч щось лежить нерухомо.</i>";
  return "";
}

function resourceSeconds(resourceKey: string) {
  return Math.ceil(((gatherConfig[resourceKey]?.ticks ?? playerStaminaCostConfig.GATHER_SPECIFIC ?? 1) * ACTION_BASE_TICKS * TICK_MS) / 1000);
}


function activeActionLabel(action: any) {
  if (!action) return undefined;
  if (action.type === "MOVE") return "йде";
  if (action.type === "GATHER" || action.type === "GATHER_SPECIFIC") return "збирає";
  if (action.type === "LOOK") return "придивляється";
  if (action.type === "INSPECT") return "оглядає";
  if (action.type === "GREET") return "вітається";
  if (action.type === "ATTACK") return "атакує";
  if (action.type === "FRESHEN") return "освіжує труп";
  if (action.type === "SAY") return "говорить";
  if (action.type === "TRACK") return "вистежує";
  if (action.type === "REST") return "відпочиває";
  if (action.type === "SET_TRAP") return "ставить пастку";
  return "зайнятий";
}

function visibleActionText(target: { type: "player" | "creature"; id: number }, activeActions: Map<string, any>, location: any) {
  const key = `${target.type}:${target.id}`;
  const queued = activeActionLabel(activeActions.get(key));
  if (queued) return ` — ${queued}`;

  if (target.type === "creature") {
    const creature = location.creatures.find((c: any) => c.id === target.id);
    if (creature?.currentAction) return ` — ${creature.currentAction}`;
  }

  return "";
}

function resourceButtonData(resources: any[]) {
  return resources
    .filter((r) => r.amount > 0)
    .map((resource) => ({
      key: resource.resourceType.key,
      name: resource.resourceType.name,
      durationText: ` (${resourceSeconds(resource.resourceType.key)} с)`,
    }));
}

export async function renderLocationBrief(locationId: number, viewerPlayerId?: number) {
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: {
      players: true,
      creatures: { where: { isGone: false }, include: { species: true } },
      region: true,
      exitsFrom: { where: { isHidden: false }, include: { toLocation: true }, orderBy: { direction: "asc" } },
    },
  });

  if (!location) throw new Error("Location not found");

  const exitsText = location.exitsFrom.length
    ? location.exitsFrom.map((exit) => `- ${directionLabels[exit.direction]} → ${exit.toLocation.name}`).join("\n")
    : "Виходів не видно.";

  return {
    text: `<b>${escapeHtml(location.name)}</b>\n<i>Регіон: ${escapeHtml(location.region.name)}</i>\n\n${escapeHtml(location.description ?? "")}${presenceText(location, viewerPlayerId)}\n\nВиходи:\n${escapeHtml(exitsText)}`,
    keyboard: buildMovementKeyboard(location.exitsFrom),
  };
}

export async function renderLocationDetails(locationId: number, viewerPlayerId?: number) {
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: {
      players: true,
      creatures: { where: { isGone: false }, include: { species: true } },
      resources: { include: { resourceType: true } },
      region: true,
      exitsFrom: { where: { isHidden: false }, include: { toLocation: true }, orderBy: { direction: "asc" } },
    },
  });

  if (!location) throw new Error("Location not found");

  const targets = visibleTargets(location, viewerPlayerId);
  const playerTargetIds = targets.filter((t) => t.type === "player").map((t) => t.id);
  const creatureTargetIds = targets.filter((t) => t.type === "creature").map((t) => t.id);
  const activeActionsRaw = await prisma.worldAction.findMany({
    where: {
      status: { in: ["QUEUED", "RUNNING"] },
      OR: [
        playerTargetIds.length ? { actorType: "PLAYER", playerId: { in: playerTargetIds } } : { id: -1 },
        creatureTargetIds.length ? { actorType: "CREATURE", creatureId: { in: creatureTargetIds } } : { id: -1 },
      ],
    },
    orderBy: [{ status: "desc" }, { position: "asc" }, { id: "asc" }],
  });
  const activeActions = new Map<string, any>();
  for (const action of activeActionsRaw) {
    const key = action.actorType === "PLAYER" ? `player:${action.playerId}` : `creature:${action.creatureId}`;
    if (!activeActions.has(key)) activeActions.set(key, action);
  }
  const charactersText = targets.length
    ? `\n\nПоруч:\n${targets.map((x) => `- ${escapeHtml(x.label)}${x.canGreet ? "" : " <i>(тварина/об’єкт)</i>"}${escapeHtml(visibleActionText(x, activeActions, location))}`).join("\n")}`
    : "";

  const resourceLines = location.resources
    .filter((r) => r.amount > 0)
    .map((r) => {
      const amount = r.amount >= 20 ? "багато" : r.amount >= 8 ? "трохи" : "майже немає";
      return `- <i>${escapeHtml(r.resourceType.name)}</i>: ${escapeHtml(amount)}`;
    });
  const resourcesText = resourceLines.length ? `\n\nВи помічаєте:\n${resourceLines.join("\n")}` : "";

  const livingAnimals = location.creatures.filter((c) => isVisibleLivingCreature(c) && c.species.kind === "ANIMAL");
  const tracksText = livingAnimals.length
    ? `\n\nСліди та рух:\n${livingAnimals
        .slice(0, 8)
        .map((c) => {
          const ageText = c.ageTicks !== undefined && c.age ? ` (${String(c.age).toLowerCase()}, ${c.ageTicks} тіків)` : "";
          return `- ${escapeHtml(`${c.species.name}${ageText}: ${c.currentAction ?? "проходить"}`)}`;
        })
        .join("\n")}${livingAnimals.length > 8 ? `\n- ...і ще ${livingAnimals.length - 8}` : ""}`
    : "";

  const corpses = location.creatures.filter(isVisibleCorpse);
  const corpsesText = corpses.length
    ? `\n\nПоруч лежить:\n${corpses
        .slice(0, 8)
        .map((c) => `- ${escapeHtml(`труп: ${c.species.name}; зникне приблизно за ${c.corpseDecayTicksLeft ?? "?"} тіків`)}`)
        .join("\n")}${corpses.length > 8 ? `\n- ...і ще ${corpses.length - 8}` : ""}`
    : "";

  const keyboard = new InlineKeyboard();
  const resources = resourceButtonData(location.resources);

  if (resources.length === 1) {
    const resource = resources[0];
    keyboard.text(`🌿 Зібрати: ${resource.name}${resource.durationText}`, `gather:${resource.key}`).row();
  } else if (resources.length > 1) {
    keyboard.text("🌿 Зібрати", "gather:menu").row();
  }

  if (targets.length > 0) {
    const targetKeyboard = buildTargetListKeyboard(targets);
    for (const row of targetKeyboard.inline_keyboard) {
      for (const button of row) if ("text" in button && "callback_data" in button) keyboard.text(button.text, button.callback_data);
      keyboard.row();
    }
  }

  const movement = buildMovementKeyboard(location.exitsFrom);
  for (const row of movement.inline_keyboard) {
    for (const button of row) if ("text" in button && "callback_data" in button) keyboard.text(button.text, button.callback_data);
    keyboard.row();
  }

  return {
    text: `<b>${escapeHtml(location.name)}</b>\n<i>Регіон: ${escapeHtml(location.region.name)}</i>\n\n${escapeHtml(location.description ?? "")}\n\n<i>Ви придивляєтесь.</i>\n\nКоординати: ${location.x}, ${location.y}, ${location.z}\nНебезпека: ${location.dangerLevel}${resourcesText}${charactersText}${tracksText}${corpsesText}`,
    keyboard,
  };
}

export async function buildGatherMenuForLocation(locationId: number) {
  const resources = await prisma.resourceNode.findMany({
    where: { locationId, amount: { gt: 0 } },
    include: { resourceType: true },
    orderBy: { id: "asc" },
  });

  return buildResourceMenuKeyboard(resourceButtonData(resources));
}
