import type { Bot } from "grammy";
import { config } from "../config";
import { prisma } from "../db";
import {
  CHRONICLE_TITLE_PREFIX,
  latestChronicleEvents,
  renderSingleChronicleRelay,
} from "../services/chronicles";
import { getCurrentWorldState } from "../services/worldTime";
import { parseTelegramChannelId } from "./safety";
import { publicationErrorMessage } from "./publications";

export const HERALD_CHRONICLE_RELAY_MARKER_TITLE = "Herald chronicle relayed";

export function chronicleRelayMarkerDescription(eventId: number) {
  return `chronicleEventId=${eventId}`;
}

export function isChronicleRelayMarkerForEvent(description: string | null | undefined, eventId: number) {
  return (description ?? "").split(";").map((part) => part.trim()).includes(chronicleRelayMarkerDescription(eventId));
}

export function formatChronicleRelayDisabledReason() {
  if (!config.heraldChronicleRelayEnabled) return "HERALD_CHRONICLE_RELAY_ENABLED is not true";
  if (!config.heraldChronicleRelayChatId) return "HERALD_CHRONICLE_RELAY_CHAT_ID is not set";
  return "";
}

export async function pendingChronicleRelayEvents(limit = config.heraldChronicleRelayMaxPerTick) {
  const candidates = await latestChronicleEvents(120);
  const oldestFirst = [...candidates].reverse();
  const pending = [];

  for (const event of oldestFirst) {
    if (!event.id || !event.title.startsWith(CHRONICLE_TITLE_PREFIX)) continue;
    const marker = await prisma.worldEvent.findFirst({
      where: {
        title: HERALD_CHRONICLE_RELAY_MARKER_TITLE,
        description: { contains: chronicleRelayMarkerDescription(event.id) },
      },
      select: { id: true },
    });
    if (marker) continue;
    pending.push(event);
    if (pending.length >= limit) break;
  }

  return pending;
}

export async function publishPendingChronicleRelays(bot: Bot, options: { limit?: number } = {}) {
  const disabledReason = formatChronicleRelayDisabledReason();
  if (disabledReason) {
    return { published: 0, failed: 0, skipped: true, reason: disabledReason };
  }

  const chatId = parseTelegramChannelId(config.heraldChronicleRelayChatId!);
  const pending = await pendingChronicleRelayEvents(options.limit ?? config.heraldChronicleRelayMaxPerTick);
  const worldState = pending.length ? await getCurrentWorldState() : null;
  let published = 0;
  let failed = 0;

  for (const event of pending) {
    try {
      await bot.api.sendMessage(chatId, renderSingleChronicleRelay(event, worldState!));
      await prisma.worldEvent.create({
        data: {
          type: "SYSTEM",
          title: HERALD_CHRONICLE_RELAY_MARKER_TITLE,
          description: chronicleRelayMarkerDescription(event.id),
          playerId: event.playerId ?? undefined,
          locationId: event.locationId ?? undefined,
        },
      });
      published += 1;
    } catch (error) {
      failed += 1;
      console.warn(`Herald chronicle relay ${event.id} failed:`, publicationErrorMessage(error));
    }
  }

  if (pending.length > 0 && (published > 0 || failed > 0)) {
    console.log(`Herald chronicle relay tick: checked=${pending.length}, published=${published}, failed=${failed}.`);
  }

  return { published, failed, skipped: false, checked: pending.length };
}

export function startHeraldChronicleRelayLoop(bot: Bot) {
  const disabledReason = formatChronicleRelayDisabledReason();
  if (disabledReason) {
    console.log(`Herald chronicle relay disabled: ${disabledReason}.`);
    return;
  }

  const run = () => {
    publishPendingChronicleRelays(bot).catch((error) => {
      console.warn("Herald chronicle relay loop failed:", publicationErrorMessage(error));
    });
  };

  run();
  setInterval(run, config.heraldChronicleRelayIntervalMs);
  console.log(`Herald chronicle relay loop started: interval=${config.heraldChronicleRelayIntervalMs}ms, max=${config.heraldChronicleRelayMaxPerTick}.`);
}
