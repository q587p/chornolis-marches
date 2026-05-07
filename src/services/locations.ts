import { InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { TICK_MS, gatherConfig } from "../gameConfig";
import { directionLabels } from "../ui/labels";
import { buildMovementKeyboard, buildTargetKeyboard } from "../ui/keyboards";
import { escapeHtml } from "../utils/text";

function visibleTargets(location: any, viewerPlayerId?: number) {
  const players = location.players
    .filter((p: any) => p.id !== viewerPlayerId)
    .map((p: any) => ({ type: "player" as const, id: p.id, label: p.firstName ?? p.username ?? "мандрівник", canGreet: true }));

  const creatures = location.creatures.map((c: any) => ({
    type: "creature" as const,
    id: c.id,
    label: c.name ?? c.species.name,
    canGreet: c.species.kind !== "ANIMAL",
  }));

  return [...players, ...creatures];
}

function presenceText(location: any, viewerPlayerId?: number) {
  const targets = visibleTargets(location, viewerPlayerId);
  const hasCharacters = targets.some((t) => t.canGreet);
  const hasAnimals = location.creatures.some((c: any) => c.species.kind === "ANIMAL");

  if (hasCharacters && hasAnimals) return "\n\n<i>Поруч хтось або щось є.</i>";
  if (hasCharacters) return "\n\n<i>Поруч хтось є.</i>";
  if (hasAnimals) return "\n\n<i>Поруч щось ворушиться.</i>";
  return "";
}

export async function renderLocationBrief(locationId: number, viewerPlayerId?: number) {
  const location = await prisma.cellLocation.findUnique({
    where: { id: locationId },
    include: {
      players: true,
      creatures: { where: { isAlive: true }, include: { species: true } },
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
      creatures: { where: { isAlive: true }, include: { species: true } },
      resources: { include: { resourceType: true } },
      exitsFrom: { where: { isHidden: false }, include: { toLocation: true }, orderBy: { direction: "asc" } },
    },
  });

  if (!location) throw new Error("Location not found");

  const targets = visibleTargets(location, viewerPlayerId);
  const charactersText = targets.length
    ? `\n\nПоруч:\n${targets.map((x) => `- ${escapeHtml(x.label)}${x.canGreet ? "" : " <i>(тварина)</i>"}`).join("\n")}`
    : "";

  const resourceLines = location.resources
    .filter((r) => r.amount > 0)
    .map((r) => {
      const amount = r.amount >= 20 ? "багато" : r.amount >= 8 ? "трохи" : "майже немає";
      return `- <i>${escapeHtml(r.resourceType.name)}</i>: ${escapeHtml(amount)}`;
    });
  const resourcesText = resourceLines.length ? `\n\nВи помічаєте:\n${resourceLines.join("\n")}` : "";

  const creatureHints = location.creatures
    .filter((c) => c.species.kind === "ANIMAL")
    .slice(0, 8)
    .map((c) => `${c.species.name}: ${c.currentAction ?? "проходить"}`);
  const tracksText = creatureHints.length
    ? `\n\nСліди та рух:\n${creatureHints.map((x) => `- ${escapeHtml(x)}`).join("\n")}`
    : "";

  const keyboard = new InlineKeyboard();
  for (const resource of location.resources.filter((r) => r.amount > 0)) {
    const cfg = gatherConfig[resource.resourceType.key];
    const durationText = cfg ? ` (${Math.round((cfg.ticks * TICK_MS) / 1000)} с)` : "";
    keyboard.text(`Зібрати: ${resource.resourceType.name}${durationText}`, `gather:${resource.resourceType.key}`).row();
  }

  const targetKeyboard = buildTargetKeyboard(targets);
  for (const row of targetKeyboard.inline_keyboard) {
    for (const button of row) if ("text" in button && "callback_data" in button) keyboard.text(button.text, button.callback_data);
    keyboard.row();
  }

  const movement = buildMovementKeyboard(location.exitsFrom);
  for (const row of movement.inline_keyboard) {
    for (const button of row) if ("text" in button && "callback_data" in button) keyboard.text(button.text, button.callback_data);
    keyboard.row();
  }

  return {
    text: `<b>${escapeHtml(location.name)}</b>\n\n${escapeHtml(location.description ?? "")}\n\n<i>Ви придивляєтесь.</i>\n\nКоординати: ${location.x}, ${location.y}, ${location.z}\nНебезпека: ${location.dangerLevel}${resourcesText}${charactersText}${tracksText}`,
    keyboard,
  };
}
