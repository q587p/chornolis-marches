const latestKnownMessageByChat = new Map<string, number>();

export function noteKnownMessage(message: any) {
  const chatId = message?.chat?.id;
  const messageId = message?.message_id;
  if (chatId === undefined || typeof messageId !== "number") return;
  const key = String(chatId);
  latestKnownMessageByChat.set(key, Math.max(latestKnownMessageByChat.get(key) ?? 0, messageId));
}

export function canEditCallbackMessage(ctx: any) {
  const chatId = ctx.callbackQuery?.message?.chat?.id ?? ctx.chat?.id;
  const messageId = ctx.callbackQuery?.message?.message_id;
  if (chatId === undefined || typeof messageId !== "number") return false;
  const latestKnown = latestKnownMessageByChat.get(String(chatId));
  return latestKnown === undefined || messageId >= latestKnown;
}
