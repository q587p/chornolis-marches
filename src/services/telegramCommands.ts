import { Bot } from "grammy";
import { isScribeAdmin } from "./adminAccess";

type TelegramCommandApi = Pick<Bot["api"], "setMyCommands" | "deleteMyCommands">;

export const DEFAULT_BOT_COMMANDS = [
  { command: "start", description: "🌲 Увійти / Повернути кнопки" },
  { command: "afk", description: "🌙 AFK / відійти" },
  { command: "help", description: "❔ Допомога новачку" },
  { command: "respawn", description: "🏕️ Повернення до табору" },
  { command: "me", description: "🧍 Персонаж" },
  { command: "look", description: "👀 Озирнутися" },
  { command: "follow_step", description: "👣 Йти слідом" },
  { command: "menu", description: "☰ Меню" },
  { command: "news", description: "📰 Останні новини світу" },
  { command: "chronicles", description: "📜 Хроніки світу" },
  { command: "end_session", description: "🚪 Завершити сесію" },
];

export const SCRIBE_BOT_COMMANDS = [
  ...DEFAULT_BOT_COMMANDS,
  { command: "stat", description: "📊 Службова статистика світу" },
  { command: "adminhelp", description: "🛠 Команди писарів Порубіжжя" },
];

export async function setDefaultBotCommandsWithRetry(bot: Bot, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await bot.api.setMyCommands(DEFAULT_BOT_COMMANDS);
      console.log("Telegram bot commands updated.");
      return;
    } catch (error) {
      console.warn(`Failed to set bot commands, attempt ${i}/${attempts}:`, error);
      await new Promise((resolve) => setTimeout(resolve, i * 3000));
    }
  }
}

export async function syncChatBotCommandsForTelegramId(api: TelegramCommandApi, chatId: number, telegramId: number | string | null | undefined) {
  const scope = { type: "chat" as const, chat_id: chatId };
  try {
    if (await isScribeAdmin(telegramId)) {
      await api.setMyCommands(SCRIBE_BOT_COMMANDS, { scope });
      return;
    }

    await api.deleteMyCommands({ scope });
  } catch (error) {
    console.warn("Failed to sync chat-scoped Telegram commands:", error);
  }
}
