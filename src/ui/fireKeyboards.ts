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

export async function campfireRelightReplyOptionsAfterBuild(playerId: number, featureId: number) {
  return campfireRelightReplyOptionsAfterTwigs(playerId, featureId);
}

export function buildCampfireDismantleKeyboard(featureId: number) {
  return new InlineKeyboard().text("🧹 Розібрати", `fire:dismantle:${featureId}`);
}

export function campfireDismantleReplyOptions(featureId: number) {
  return { reply_markup: buildCampfireDismantleKeyboard(featureId) };
}

export function buildWetCampfireConfirmKeyboard() {
  return new InlineKeyboard().text("🪵 Скласти все одно", "fire:build:confirmWet");
}
