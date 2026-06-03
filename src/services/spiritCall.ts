export const SPIRIT_CALL_SOURCE = "spirit_call";
export const SPIRIT_CALL_LABEL = "🌫️ Поклик духа";

export type SpiritCallPayloadMarker = {
  spiritCall: true;
  source: typeof SPIRIT_CALL_SOURCE;
};

export function markSpiritCallPayload<T extends Record<string, unknown>>(payload: T): T & SpiritCallPayloadMarker {
  return {
    ...payload,
    spiritCall: true,
    source: SPIRIT_CALL_SOURCE,
  };
}

export function isSpiritCallPayload(payload: unknown): payload is SpiritCallPayloadMarker {
  if (!payload || typeof payload !== "object") return false;
  const data = payload as Record<string, unknown>;
  return data.spiritCall === true || data.source === SPIRIT_CALL_SOURCE;
}

export function spiritGuidedTargetHint(isEnabled?: boolean | null) {
  return isEnabled ? "за кроком тягнеться тихий поклик" : undefined;
}

export function spiritGuidedInspectionLine(isEnabled?: boolean | null) {
  return isEnabled ? "За кроком відчувається тихий поклик духа: ніби хтось час від часу підказує простий рух." : undefined;
}

export function spiritCallActionPrefix(payload: unknown) {
  return isSpiritCallPayload(payload) ? "дух веде: " : "";
}
