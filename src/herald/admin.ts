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
