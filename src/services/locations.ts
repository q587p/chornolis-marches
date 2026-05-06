import { InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { TICK_MS, gatherConfig } from "../gameConfig";
import { directionLabels } from "../ui/labels";
import { buildMovementKeyboard } from "../ui/keyboards";
import { escapeHtml } from "../utils/text";

function visibleCounts(location: any, viewerPlayerId?: number) {
  const otherPlayers = location.players.filter((p: any) => p.id !== viewerPlayerId).length;
  const nonAnimalCreatures = location.creatures.filter((c: any) => c.species.kind !== "ANIMAL").length;
  const animals = location.creatures.filter((c: any) => c.species.kind === "ANIMAL").length;
  return { otherPlayers, nonAnimalCreatures, animals };
}

function hasVisibleCharacters(location: any, viewerPlayerId?: number) {
  const counts = visibleCounts(location, viewerPlayerId);
  return counts.otherPlayers + counts.nonAnimalCreatures > 0;
}

function hasVisibleAnimals(location: any) {
  const counts = visibleCounts(location);
  return counts.animals > 0;
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

  const peopleText = hasVisibleCharacters(location, viewerPlayerId) ? "\n\n<i>Поруч хтось є.</i>" : "";
  const animalText = hasVisibleAnimals(location) ? "\n<i>Поруч щось є.</i>" : "";

  return {
    text: `<b>${escapeHtml(location.name)}</b>\n\n${escapeHtml(location.description ?? "")}${peopleText}${animalText}\n\nВиходи:\n${escapeHtml(exitsText)}`,
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

  const otherPlayers = location.players.filter((p) => p.id !== viewerPlayerId);
  const npcs = location.creatures.filter((c) => c.species.kind !== "ANIMAL");
  const animals = location.creatures.filter((c) => c.species.kind === "ANIMAL");
  const visibleCharacters = [
    ...otherPlayers.map((p) => p.firstName ?? p.username ?? "мандрівник"),
    ...npcs.map((c) => c.name ?? c.species.name),
  ];

  const charactersText = visibleCharacters.length
    ? `\n\nПоруч:\n${visibleCharacters.map((x) => `- ${x}`).join("\n")}`
    : "";

  const animalsText = animals.length
    ? `\n\nПоруч рухається щось живе:\n${animals.slice(0, 8).map((c) => `- ${c.species.name}: ${c.currentAction ?? "проходить"}`).join("\n")}${animals.length > 8 ? `\n- ...і ще ${animals.length - 8}` : ""}`
    : "";

  const resourceLines = location.resources
    .filter((r) => r.amount > 0)
    .map((r) => {
      const amount = r.amount >= 20 ? "багато" : r.amount >= 8 ? "трохи" : "майже немає";
      return `- <i>${escapeHtml(r.resourceType.name)}</i>: ${escapeHtml(amount)}`;
    });
  const resourcesText = resourceLines.length ? `\n\nВи помічаєте:\n${resourceLines.join("\n")}` : "";

  const keyboard = new InlineKeyboard();
  for (const resource of location.resources.filter((r) => r.amount > 0)) {
    const cfg = gatherConfig[resource.resourceType.key];
    const durationText = cfg ? ` (${Math.round((cfg.ticks * TICK_MS) / 1000)} с)` : "";
    keyboard.text(`Зібрати: ${resource.resourceType.name}${durationText}`, `gather:${resource.resourceType.key}`).row();
  }

  if (visibleCharacters.length > 0) {
    keyboard.text("👋 Привітатися", "social:greet")
      .text("👁 Придивитися", "social:inspect")
      .row()
      .text("⚔️ Атакувати", "social:attack")
      .row();
  }

  if (animals.length > 0) {
    keyboard.text("👁 Оглянути", "social:inspect")
      .text("⚔️ Атакувати", "social:attack")
      .row();
  }

  const movement = buildMovementKeyboard(location.exitsFrom);
  for (const row of movement.inline_keyboard) {
    for (const button of row) {
      if ("text" in button && "callback_data" in button) keyboard.text(button.text, button.callback_data);
    }
    keyboard.row();
  }

  return {
    text: `<b>${escapeHtml(location.name)}</b>\n\n${escapeHtml(location.description ?? "")}\n\n<i>Ви придивляєтесь.</i>\n\nКоординати: ${location.x}, ${location.y}, ${location.z}\nНебезпека: ${location.dangerLevel}${resourcesText}${charactersText ? escapeHtml(charactersText) : ""}${animalsText ? escapeHtml(animalsText) : ""}`,
    keyboard,
  };
}
