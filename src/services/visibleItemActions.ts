import type { Bot } from "grammy";
import { prisma } from "../db";
import { notifyLocationExcept } from "./notifications";
import { actorPastVerb, playerForms } from "./grammar";
import { logEvent } from "./worldEvents";

export function pickupObserverText(player: any, itemName: string) {
  return `${playerForms(player).nominative} ${actorPastVerb(player, "підняв", "підняла", "підняли")} ${itemName}.`;
}

export function dropObserverText(player: any, itemName: string) {
  return `${playerForms(player).nominative} ${actorPastVerb(player, "викинув", "викинула", "викинули")} ${itemName}.`;
}

export async function recordVisibleItemAction(
  bot: Bot,
  input: {
    playerId: number;
    locationId: number;
    observerText: string;
    eventTitle: string;
    eventDescription: string;
    actionNote: string;
  },
) {
  try {
    await notifyLocationExcept(bot, input.locationId, [input.playerId], input.observerText);
  } catch (error) {
    console.warn("[visible-item-action] failed to notify location", error);
  }

  await logEvent("PLAYER_ACTION", input.eventTitle, input.eventDescription, input.locationId);

  try {
    await prisma.worldAction.create({
      data: {
        actorType: "PLAYER",
        playerId: input.playerId,
        type: "WAIT",
        status: "DONE",
        priority: 0,
        interruptible: true,
        note: input.actionNote,
        payload: {},
        position: 0,
        durationMs: 0,
        startedAt: new Date(),
        executeAt: new Date(),
      },
    });
  } catch (error) {
    console.warn("[visible-item-action] failed to record player action", error);
  }
}
