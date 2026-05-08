import { InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { TICK_MS, gatherConfig } from "../gameConfig";
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
    .map((p: any) => ({
      type: "player" as const,
      id: p.id,
      label: p.firstName ?? p.username ?? "мандрівник",
      canGreet: true,
    }));

  const livingCreatures = location.creatures
    .filter(isVisibleLivingCreature)
    .map((c: any) => ({
      type: "creature" as const,
      id: c.id,
      label: c.name ?? c.species.name,
      canGreet: c.species.kind !== "ANIMAL",
    }));

  const corpses = location.creatures
    .filter(isVisibleCorpse)
    .map((c: any) => ({
      type: "creature" as const,
      id: c.id,
      label: `труп: ${c.species.name}`,
      canGreet: false,
    }));

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

function resourceButtonData(resources: any[]) {
  return resources
    .filter((r) => r.amount > 0)
    .map((resource) => {
      const cfg = gatherConfig[resource.resourceType.key];
      const durationText = cfg ? ` (${Math.round((cfg.ticks * TICK_MS) / 1000)} с)` : "";
      return { key: resource.resourceType.key, name: resource.resourceType.name, durationText };
    });
}

export async function renderLocationBrief(locationId: number, viewerPlayerId?: number) {
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: {
      players: true,
      creatures: { where: { isGone: false }, include: { species: true } },
      exitsFrom: { where: { isHidden: false }, include: { toLocation: true }, orderBy: { direction: "asc" } },
    },
  });

  if (!location) throw new Error("Location not found");

  const exitsText = location.exitsFrom.length
    ? location.exitsFrom.map((exit) => `- ${directionLabels[exit.direction]} → ${exit.toLocation.name}`).join("\n")
    : "Виходів не видно.";

  return {
    text: `<b>${escapeHtml(location.name)}</b>\n\n${escapeHtml(location.description ?? "")}${presenceText(location, viewerPlayerId)}\n\nВиходи:\n${escapeHtml(exitsText)}`,
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
      exitsFrom: { where: { isHidden: false }, include: { toLocation: true }, orderBy: { direction: "asc" } },
    },
  });

  if (!location) throw new Error("Location not found");

  const targets = visibleTargets(location, viewerPlayerId);
  const charactersText = targets.length
    ? `\n\nПоруч:\n${targets.map((x) => `- ${escapeHtml(x.label)}${x.canGreet ? "" : " <i>(тварина/об’єкт)</i>"}`).join("\n")}`
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
    text: `<b>${escapeHtml(location.name)}</b>\n\n${escapeHtml(location.description ?? "")}\n\n<i>Ви придивляєтесь.</i>\n\nКоординати: ${location.x}, ${location.y}, ${location.z}\nНебезпека: ${location.dangerLevel}${resourcesText}${charactersText}${tracksText}${corpsesText}`,
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
