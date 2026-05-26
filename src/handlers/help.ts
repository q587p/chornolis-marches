import { Bot } from "grammy";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { isPlayerAutoEnabled } from "./auto";

export const HELP_TEXT = [
  "🧭 <b>Що робити в Порубіжжі Чорнолісу</b>",
  "",
  "<b>Перші кроки</b>",
  "1. Натисніть 👀 Озирнутися, щоб згадати, де ви стоїте.",
  "2. Натисніть 👁 Роздивитися в картці місцини, щоб побачити ресурси, істот, трупи й сліди руху.",
  "3. Оберіть напрямок або команду /north, /south, /west, /east. Коротко: /n, /s, /w, /e.",
  "4. Якщо бачите ягоди, гриби чи лікарські трави — спробуйте /gather або кнопку 🌿 Зібрати.",
  "5. Коли втомилися або поранені — /rest чи 🛌 Відпочити.",
  "",
  "<b>Корисні команди</b>",
  "• /me — стан персонажа, HP, витривалість, голод, інвентар і статистика.",
  "• /location або /loc — озирнутися в поточній місцині.",
  "• /look — роздивитися уважніше.",
  "• /queue — поточний план дій.",
  "• /queue cancel — скасувати поточну дію.",
  "• /queue clear — очистити чергу.",
  "• /track — пошукати свіжі сліди поруч.",
  "• /say текст — сказати щось у локації.",
  "• /news — остання новина й заголовки попередніх.",
  "• /stat — коротка екологічна статистика світу й посилання на повну веб-сторінку.",
  "• /help — показати цю підказку знову.",
  "",
  "<b>Важливе</b>",
  "• Якщо HP падає до 0, персонаж непритомніє: черга очищається, починається відпочинок, а інші дії тимчасово недоступні.",
  "• Коли HP підніметься хоча б до 1, дії знову доступні, але персонаж лишається дуже слабким.",
  "• Голод зараз переважно debug-показник: він росте від виснажливих дій, але ще не має окремих штрафів для гравця.",
].join("\n");

async function sendHelp(ctx: any) {
  const auto = ctx.from ? isPlayerAutoEnabled(ctx.from.id) : false;
  await ctx.reply(HELP_TEXT, {
    parse_mode: "HTML",
    reply_markup: ctx.from ? await buildMainReplyKeyboardForTelegramId(ctx.from.id, auto) : undefined,
  });
}

export function registerHelpHandlers(bot: Bot) {
  bot.command("help", sendHelp);
  bot.hears(["❔ Допомога", "🧭 Допомога", "Допомога"], sendHelp);
}
