import type { Bot } from "grammy";
import { isHeraldAdminId } from "./admin";

type HeraldCommandInfo = {
  command: string;
  description: string;
  adminOnly?: boolean;
};

export const HERALD_COMMANDS: HeraldCommandInfo[] = [
  { command: "/help", description: "показати відомі накази Канцелярії" },
  { command: "/ping", description: "перевірити, чи Канцелярія на місці" },
  { command: "/whoami", description: "перевірити печатку відправника" },
  { command: "/info", description: "переглянути особовий запис; службові печатки можуть уточнювати ім’я" },
  { command: "/preview_latest_news", description: "переглянути останній запис із news.md", adminOnly: true },
  { command: "/queue_latest_news", description: "поставити останній запис із news.md у чергу", adminOnly: true },
  { command: "/post_latest_news", description: "поставити й одразу передати останній запис із news.md", adminOnly: true },
  { command: "/preview_world_digest", description: "переглянути світовий запис", adminOnly: true },
  { command: "/queue_world_digest", description: "поставити світовий запис у чергу", adminOnly: true },
  { command: "/post_world_digest", description: "поставити й одразу передати світовий запис", adminOnly: true },
  { command: "/pending_publications", description: "показати готові до публікації записи", adminOnly: true },
  { command: "/publish_pending", description: "передати готові записи до каналу", adminOnly: true },
];

export function formatHeraldCommandList(isAdmin: boolean) {
  return HERALD_COMMANDS
    .filter((command) => isAdmin || !command.adminOnly)
    .map((command) => `${command.command} — ${command.description}`)
    .join("\n");
}

export function formatHeraldHelp(isAdmin: boolean) {
  return [
    "Канцелярія Межового Знаку тримає окрему книгу наказів.",
    "",
    "Відомі команди:",
    formatHeraldCommandList(isAdmin),
    "",
    "Для службових команд потрібна впізнана печатка.",
  ].join("\n");
}

export function formatUnknownHeraldCommand(isAdmin: boolean) {
  return [
    "Канцелярія переглянула печатку, але не знайшла такого наказу.",
    "",
    "Відомі команди:",
    formatHeraldCommandList(isAdmin),
    "",
    "Для службових команд потрібна впізнана печатка.",
  ].join("\n");
}

export function registerHeraldHelpCommands(bot: Bot, heraldAdminIds: ReadonlySet<string>) {
  bot.command("help", async (ctx) => {
    const isAdmin = isHeraldAdminId(ctx.from?.id, heraldAdminIds);
    await ctx.reply(formatHeraldHelp(isAdmin));
  });

  bot.command("whoami", async (ctx) => {
    const isAdmin = isHeraldAdminId(ctx.from?.id, heraldAdminIds);
    await ctx.reply(isAdmin
      ? "Канцелярія впізнала вашу печатку."
      : "Канцелярія бачить печатку, але не має її у службовій книзі.");
  });
}

export function registerHeraldUnknownCommandFallback(bot: Bot, heraldAdminIds: ReadonlySet<string>) {
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim();
    if (!text.startsWith("/")) return;

    const isAdmin = isHeraldAdminId(ctx.from?.id, heraldAdminIds);
    await ctx.reply(formatUnknownHeraldCommand(isAdmin));
  });
}
