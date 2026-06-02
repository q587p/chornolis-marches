import type { Bot } from "grammy";
import { parseAlias } from "../input/aliases";
import { getPlayerByTelegramId } from "../services/players";
import { bestTargetMatch, targetListText, visibleTextTargets } from "../services/textTargets";
import { inventoryResourceKeyFromText } from "../services/inventoryUse";
import { RAW_MEAT_KEY } from "../services/meat";
import { GIVE_ITEM_STAMINA_COST, giveRawMeatToCampSpiritCat, isSupportedGiveResourceKey } from "../services/give";
import { assertCanPerformPhysicalAction } from "../services/postureRules";
import { recordVisibleItemAction } from "../services/visibleItemActions";
import { spendPlayerStaminaAmount } from "../services/actionRecovery";
import { replyToActionError } from "../utils/actionErrorReply";

const GIVE_USAGE_TEXT = "Напишіть так: give сире м'ясо коту або дати сире м'ясо коту.";

export function registerGiveHandlers(bot: Bot) {
  bot.command("give", async (ctx) => {
    const rest = String(ctx.match ?? "").trim();
    const parsed = parseAlias(rest ? `/give ${rest}` : "/give");
    if (parsed?.kind === "give-item") {
      await submitGiveItem(bot, ctx, parsed.item, parsed.target, parsed.amount);
      return;
    }

    await ctx.reply(GIVE_USAGE_TEXT);
  });
}

function unsupportedGiveItemText(item: string) {
  if (!item.trim()) return GIVE_USAGE_TEXT;
  return "Поки можна передати тільки сире м'ясо Коту-бережнику. Інші обміни лишаються на майбутнє.";
}

async function completeRawMeatGive(bot: Bot, ctx: any, player: any, targetCreatureId: number) {
  assertCanPerformPhysicalAction(player, "GIVE");
  const result = await giveRawMeatToCampSpiritCat(player.id, targetCreatureId);
  await spendPlayerStaminaAmount(bot, player.id, GIVE_ITEM_STAMINA_COST, ctx.chat?.id);
  await recordVisibleItemAction(bot, {
    playerId: player.id,
    locationId: result.locationId,
    observerText: result.observerText,
    eventTitle: "Player gave raw meat to camp spirit cat",
    eventDescription: `player=${player.id}; creature=${result.targetId}; item=${RAW_MEAT_KEY}; name=${result.itemName}`,
    actionNote: `передано: ${result.itemName}`,
  });
  await ctx.reply(result.text);
}

export async function submitGiveRawMeatToCreature(bot: Bot, ctx: any, targetCreatureId: number) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    await completeRawMeatGive(bot, ctx, player, targetCreatureId);
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося передати м'ясо.");
  }
}

export async function submitGiveItem(bot: Bot, ctx: any, item: string, target: string, amount?: number) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  if (!item.trim() || !target.trim()) return void (await ctx.reply(GIVE_USAGE_TEXT));
  if (amount !== undefined && amount !== 1) return void (await ctx.reply("Поки можна передати тільки одну річ за раз."));

  const resourceKey = inventoryResourceKeyFromText(item);
  if (!isSupportedGiveResourceKey(resourceKey)) return void (await ctx.reply(unsupportedGiveItemText(item)));

  const targets = await visibleTextTargets(player.currentLocationId, player.id);
  const match = bestTargetMatch(target, targets);
  if (match.kind === "none") {
    return void (await ctx.reply(`Поруч не видно, кому це передати.\n\n${GIVE_USAGE_TEXT}`));
  }
  if (match.kind === "many") {
    return void (await ctx.reply(`Знайшов кілька подібних цілей. Уточніть назвою або номером.\n\n${targetListText(match.targets)}`));
  }
  if (match.target.type !== "creature") {
    return void (await ctx.reply("Поки цю річ можна передати тільки Коту-бережнику."));
  }

  await submitGiveRawMeatToCreature(bot, ctx, match.target.id);
}
