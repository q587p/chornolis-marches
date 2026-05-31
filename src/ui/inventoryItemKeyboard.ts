import { InlineKeyboard } from "grammy";
import {
  canAddTwigsToNearbyCampfire,
  canDousePlayerTorchFromInventory,
  canLightPlayerTorchFromInventory,
} from "../services/fire";
import { canCookPlayerMeat, COOKED_MEAT_KEY, RAW_MEAT_KEY } from "../services/meat";

function inventoryItemDropLabel(resourceKey: string) {
  if (resourceKey === "berries") return "Викинути ягоди";
  if (resourceKey === "mushrooms") return "Викинути гриби";
  if (resourceKey === "herbs") return "Викинути трави";
  if (resourceKey === COOKED_MEAT_KEY || resourceKey === RAW_MEAT_KEY) return "Викинути м’ясо";
  if (resourceKey === "twigs") return "Викинути хмиз";
  if (resourceKey === "torch" || resourceKey === "doused_torch" || resourceKey === "lit_torch") return "Викинути факел";
  return "Викинути";
}

export function buildCookMeatAgainKeyboard() {
  return new InlineKeyboard().text("🔥 Підсмажити м’ясо", "inventory:cook:meat");
}

export function cookingResultReplyOptions(result: { rawMeatRemaining?: number | null }) {
  return result.rawMeatRemaining && result.rawMeatRemaining > 0
    ? { reply_markup: buildCookMeatAgainKeyboard() }
    : undefined;
}

export async function buildInventoryItemKeyboard(playerId: number, resourceKey: string) {
  const [canAddTwigs, canDouseTorch, canLightTorch, canCookMeat] = await Promise.all([
    canAddTwigsToNearbyCampfire(playerId),
    canDousePlayerTorchFromInventory(playerId),
    canLightPlayerTorchFromInventory(playerId),
    canCookPlayerMeat(playerId),
  ]);

  const keyboard = new InlineKeyboard();
  if (resourceKey === "berries") keyboard.text("🫐 З’їсти ягоди", "inventory:use:berries").row();
  if (resourceKey === "mushrooms") keyboard.text("🍄 З’їсти гриби", "inventory:use:mushrooms").row();
  if (resourceKey === "herbs") keyboard.text("🌿 З’їсти лікарські трави", "inventory:use:herbs").row();
  if (resourceKey === COOKED_MEAT_KEY) keyboard.text("🥩 З’їсти м’ясо", `inventory:use:${COOKED_MEAT_KEY}`).row();
  if (resourceKey === RAW_MEAT_KEY && canCookMeat) keyboard.text("🔥 Підсмажити м’ясо", "inventory:cook:meat").row();
  if (resourceKey === "twigs" && canAddTwigs) keyboard.text("🪵 Підкинути хмиз", "inventory:add-twigs").row();
  if (resourceKey === "torch" && canLightTorch) keyboard.text("🔥 Запалити факел", "inventory:light:torch").row();
  if (resourceKey === "doused_torch" && canLightTorch) keyboard.text("🔥 Запалити факел", "inventory:light:torch").row();
  if (resourceKey === "lit_torch" && canDouseTorch) keyboard.text("🫧 Притушити факел", "inventory:douse:torch").row();
  keyboard.text(inventoryItemDropLabel(resourceKey), `inventory:drop:${resourceKey}`).row();
  return keyboard.text("↩️ До речей", "character:inventory");
}
