import { Bot } from "grammy";
import { prisma } from "../db";
import { worldTick } from "../services/worldTick";

export function registerManualTickReportHandlers(bot: Bot) {
  bot.command("tick", async (ctx) => {
    await worldTick();

    const latestTickEvent = await prisma.worldEvent.findFirst({
      where: { title: "World Tick" },
      orderBy: { id: "desc" },
    });

    const summary = latestTickEvent?.description
      ? `\n\n${latestTickEvent.description}`
      : "";

    await ctx.reply(`✅ World tick запущено вручну.${summary}`);
  });
}
