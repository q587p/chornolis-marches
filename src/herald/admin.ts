import type { Context } from "grammy";

export function parseHeraldAdminIds(values: readonly string[]) {
  return new Set(
    values
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

export function isHeraldAdminId(telegramId: number | string | undefined, adminIds: ReadonlySet<string>) {
  if (telegramId === undefined) return false;
  return adminIds.has(String(telegramId));
}

export async function requireHeraldAdmin(ctx: Context, adminIds: ReadonlySet<string>) {
  if (isHeraldAdminId(ctx.from?.id, adminIds)) return true;
  await ctx.reply("Канцелярія мовчить перед незнайомими печатками.");
  return false;
}
