import { InlineKeyboard } from "grammy";
import {
  canAddTwigsToNearbyCampfire,
  canDousePlayerTorchFromInventory,
  canLightPlayerTorchFromInventory,
} from "../services/fire";
import { canCookPlayerMeat, COOKED_MEAT_KEY, playerRawMeatAmount, RAW_MEAT_KEY } from "../services/meat";
import { getPlayerEquippedWeapon, isWeaponResourceKey } from "../services/weapons";

function inventoryItemDropLabel(resourceKey: string) {
  if (resourceKey === "berries") return "Викинути ягоди";
  if (resourceKey === "mushrooms") return "Викинути гриби";
  if (resourceKey === "herbs") return "Викинути трави";
  if (resourceKey === COOKED_MEAT_KEY || resourceKey === RAW_MEAT_KEY) return "Викинути м’ясо";
  if (resourceKey === "twigs") return "Викинути хмиз";
  if (resourceKey === "torch" || resourceKey === "doused_torch" || resourceKey === "lit_torch") return "Викинути факел";
  return "Викинути";
}

export function buildCookMeatAgainKeyboard(rawMeatRemaining = 0) {
  const keyboard = new InlineKeyboard().text("🔥 Підсмажити м’ясо", "inventory:cook:meat");
  if (rawMeatRemaining > 1) keyboard.text("🔥 Посмажити все", "inventory:cook:all");
  return keyboard;
}

export function cookingResultReplyOptions(result: { rawMeatRemaining?: number | null }) {
  return result.rawMeatRemaining && result.rawMeatRemaining > 0
    ? { reply_markup: buildCookMeatAgainKeyboard(result.rawMeatRemaining) }
    : undefined;
}

export async function buildInventoryItemKeyboard(playerId: number, resourceKey: string) {
  const [canAddTwigs, canDouseTorch, canLightTorch, canCookMeat, equippedWeapon, rawMeatAmount] = await Promise.all([
    canAddTwigsToNearbyCampfire(playerId),
    canDousePlayerTorchFromInventory(playerId),
    canLightPlayerTorchFromInventory(playerId),
    canCookPlayerMeat(playerId),
    getPlayerEquippedWeapon(playerId),
    resourceKey === RAW_MEAT_KEY ? playerRawMeatAmount(playerId) : Promise.resolve(0),
  ]);

  const keyboard = new InlineKeyboard();
  if (resourceKey === "berries") keyboard.text("🫐 З’їсти ягоди", "inventory:use:berries").row();
  if (resourceKey === "mushrooms") keyboard.text("🍄 З’їсти гриби", "inventory:use:mushrooms").row();
  if (resourceKey === "herbs") keyboard.text("🌿 З’їсти лікарські трави", "inventory:use:herbs").row();
  if (resourceKey === COOKED_MEAT_KEY) keyboard.text("🥩 З’їсти м’ясо", `inventory:use:${COOKED_MEAT_KEY}`).row();
  if (resourceKey === RAW_MEAT_KEY && canCookMeat) {
    keyboard.text("🔥 Підсмажити м’ясо", "inventory:cook:meat");
    if (rawMeatAmount > 1) keyboard.text("🔥 Посмажити все", "inventory:cook:all");
    keyboard.row();
  }
  if (resourceKey === "twigs" && canAddTwigs) keyboard.text("🪵 Підкинути хмиз", "inventory:add-twigs").row();
  if (resourceKey === "torch" && canLightTorch) keyboard.text("🔥 Запалити факел", "inventory:light:torch").row();
  if (resourceKey === "doused_torch" && canLightTorch) keyboard.text("🔥 Запалити факел", "inventory:light:torch").row();
  if (resourceKey === "lit_torch" && canDouseTorch) keyboard.text("🫧 Притушити факел", "inventory:douse:torch").row();
  if (isWeaponResourceKey(resourceKey)) {
    if (equippedWeapon?.key === resourceKey) keyboard.text("✋ Зняти з руки", `inventory:unequip:${resourceKey}`).row();
    else keyboard.text("✋ Взяти в руку", `inventory:equip:${resourceKey}`).row();
  }
  keyboard.text(inventoryItemDropLabel(resourceKey), `inventory:drop:${resourceKey}`).row();
  return keyboard.text("↩️ До речей", "character:inventory");
}
