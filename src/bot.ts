import { Bot } from "grammy";
import * as dotenv from "dotenv";

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command("start", (ctx) => {
  ctx.reply("🌲 Порубіжжя Чорнолісу ожили. Вітаю, мандрівнику.");
});

bot.on("message", (ctx) => {
  ctx.reply("Я ще вчуся, але світ уже дихає.");
});

console.log("Bot starting...");
bot.start();