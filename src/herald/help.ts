import type { Bot } from "grammy";
import { isHeraldAdminId } from "./admin";

type HeraldCommandInfo = {
  command: string;
  description: string;
  adminOnly?: boolean;
};

type HeraldWhoamiIdentity = {
  telegramUserId?: number | string;
  username?: string;
  chatId?: number | string;
  chatType?: string;
  threadId?: number;
};

export const HERALD_COMMANDS: HeraldCommandInfo[] = [
  { command: "/help", description: "показати відомі накази Канцелярії" },
  { command: "/ping", description: "перевірити, чи Канцелярія на місці" },
  { command: "/whoami", description: "показати печатку відправника й chat diagnostics" },
  { command: "/info", description: "показати безпечний запис про себе або людину, якій відповідаєте" },
  { command: "/info_full", description: "службово переглянути докладніший запис за іменем або печаткою", adminOnly: true },
  { command: "/news_updates", description: "перечитати news.md і показати записи, які ще не мають активної публікації", adminOnly: true },
  { command: "/preview_latest_news", description: "переглянути останній запис із news.md", adminOnly: true },
  { command: "/queue_latest_news", description: "поставити останній запис із news.md у чергу", adminOnly: true },
  { command: "/post_latest_news", description: "поставити й одразу передати останній запис із news.md", adminOnly: true },
  { command: "/backfill_news_preview", description: "перевірити, які записи news.md ще можна поставити архівом", adminOnly: true },
  { command: "/backfill_news_queue", description: "поставити старі записи news.md в архівну чергу", adminOnly: true },
  { command: "/backfill_news_status", description: "звірити стан архівної черги news.md", adminOnly: true },
  { command: "/backfill_news_reschedule_pending", description: "перепланувати очікувані архівні записи news.md з новим інтервалом", adminOnly: true },
  { command: "/backfill_news_cancel", description: "скасувати неопубліковані записи новин/архіву", adminOnly: true },
  { command: "/news_archive_list", description: "перечитати deployed news.md і показати архівні індекси від найстарішого", adminOnly: true },
  { command: "/news_archive_reload", description: "заново перечитати deployed news.md для ручного архіву", adminOnly: true },
  { command: "/news_archive_find", description: "знайти архівний індекс news.md за номером релізу", adminOnly: true },
  { command: "/news_archive_preview", description: "показати один архівний запис news.md без публікації", adminOnly: true },
  { command: "/news_archive_post", description: "вручну опублікувати один архівний запис news.md", adminOnly: true },
  { command: "/news_archive_force_post", description: "явно повторно передати архівний запис news.md за deployed індексом", adminOnly: true },
  { command: "/preview_world_digest", description: "переглянути світовий запис", adminOnly: true },
  { command: "/queue_world_digest", description: "поставити світовий запис у чергу", adminOnly: true },
  { command: "/post_world_digest", description: "поставити й одразу передати світовий запис", adminOnly: true },
  { command: "/pending_publications", description: "показати готові до публікації записи", adminOnly: true },
  { command: "/publish_pending", description: "передати готові записи до каналу", adminOnly: true },
  { command: "/pause_publications", description: "призупинити автоматичну публікацію черги", adminOnly: true },
  { command: "/resume_publications", description: "відновити автоматичну публікацію черги", adminOnly: true },
  { command: "/cancel_pending_publications", description: "скасувати неопубліковані записи новин/архіву", adminOnly: true },
  { command: "/list_publications", description: "показати останні записи книги публікацій", adminOnly: true },
  { command: "/show_publication", description: "показати збережений snapshot запису за номером", adminOnly: true },
  { command: "/repost_publication", description: "повторно передати збережений запис як архівний repost", adminOnly: true },
  { command: "/mark_publication_deleted", description: "позначити запис як вручну видалений із Telegram", adminOnly: true },
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

export function formatHeraldWhoami(identity: HeraldWhoamiIdentity) {
  const username = identity.username ? `@${identity.username.replace(/^@/, "")}` : "немає";
  const lines = [
    "Канцелярія впізнала вашу печатку.",
    "",
    `Telegram user ID: ${identity.telegramUserId ?? "невідомо"}`,
    `Username: ${username}`,
    `Chat ID: ${identity.chatId ?? "невідомо"}`,
    `Chat type: ${identity.chatType ?? "невідомо"}`,
  ];

  if (identity.threadId !== undefined) {
    lines.push(`Thread ID: ${identity.threadId}`);
  }

  return lines.join("\n");
}

export function registerHeraldHelpCommands(bot: Bot, heraldAdminIds: ReadonlySet<string>) {
  bot.command("help", async (ctx) => {
    const isAdmin = isHeraldAdminId(ctx.from?.id, heraldAdminIds);
    await ctx.reply(formatHeraldHelp(isAdmin));
  });

  bot.command("whoami", async (ctx) => {
    await ctx.reply(formatHeraldWhoami({
      telegramUserId: ctx.from?.id,
      username: ctx.from?.username,
      chatId: ctx.chat?.id,
      chatType: ctx.chat?.type,
      threadId: ctx.message?.message_thread_id,
    }));
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
