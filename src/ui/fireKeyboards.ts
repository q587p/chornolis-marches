import { InlineKeyboard } from "grammy";
import { relightableCampfireFromTorchId } from "../services/fire";

export async function buildCampfireRelightKeyboardAfterTwigs(playerId: number, featureId?: number) {
  const relightFeatureId = await relightableCampfireFromTorchId(playerId, featureId);
  return relightFeatureId ? new InlineKeyboard().text("🔥 Підпалити", `fire:light:${relightFeatureId}`) : undefined;
}

export async function campfireRelightReplyOptionsAfterTwigs(playerId: number, featureId?: number) {
  const keyboard = await buildCampfireRelightKeyboardAfterTwigs(playerId, featureId);
  return keyboard ? { reply_markup: keyboard } : undefined;
}
