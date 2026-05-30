import { prisma } from "../db";

export type ScribeActionAuditParams = {
  actionKey: string;
  scribePlayerId?: number | null;
  scribeTelegramId?: number | string | null;
  scribeName?: string | null;
  target?: string | null;
  mode?: string | null;
  outcome?: string | null;
  details?: string | null;
  locationId?: number | null;
};

export function formatScribeActionAuditDescription(params: ScribeActionAuditParams) {
  return [
    params.scribePlayerId ? `scribePlayer=${params.scribePlayerId}` : null,
    params.scribeTelegramId != null ? `scribeTelegram=${params.scribeTelegramId}` : null,
    params.scribeName ? `scribeName=${params.scribeName}` : null,
    params.target ? `target=${params.target}` : null,
    params.mode ? `mode=${params.mode}` : null,
    params.outcome ? `outcome=${params.outcome}` : null,
    params.details,
  ].filter(Boolean).join("; ");
}

export async function logScribeAction(params: ScribeActionAuditParams) {
  try {
    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: `Scribe action: ${params.actionKey}`,
        description: formatScribeActionAuditDescription(params),
        playerId: params.scribePlayerId ?? undefined,
        locationId: params.locationId ?? undefined,
      },
    });
  } catch (error) {
    console.warn("Failed to write scribe audit event:", error);
  }
}
