import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { BASE_HP, BASE_STAMINA } from "../gameConfig";
import { normalizeChatLogMode, normalizeChatLogWindow } from "../services/chatLog";
import { parseAlias, normalizeInput, type QueueAliasMode, type RestAliasMode, type SocialSignalAlias, type TargetAction } from "../input/aliases";
import {
  accelerateFirstQueuedPlayerAction,
  actionDurationMs,
  cancelCurrentPlayerAction,
  clearQueuedPlayerActions,
  hasPlayerActionQueueControls,
  performOrQueuePlayerAction,
  playerRestStatusText,
  queuePlayerRest,
  renderPlayerActionQueue,
  startPlayerRest,
  stopPlayerRest,
} from "../services/actionQueue";
import { getPlayerByTelegramId } from "../services/players";
import { resolveTarget, type ResolvedTarget } from "../services/targets";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { buildExamineLocationKeyboard, buildRestWithQueueChoiceKeyboard } from "../ui/keyboards";
import { actionQueueReplyOptions, sendActionSubmitFeedback } from "../utils/actionQueueUi";
import { durationSecondsSuffix } from "../utils/durationText";
import { stripUnsafeText } from "../utils/text";
import { normalizeCreatureActionText } from "../utils/creatureActionText";
import { sendHelp } from "./help";
import { disablePlayerAuto, isPlayerAutoEnabled, requestOrEnablePlayerAuto } from "./auto";
import { showCharacter, showInventory, showLocationForPlayer } from "./player";
import { buildAllPage, buildChatLogPage, buildStatBrief, buildWhoPage } from "./status";
import { buildNewsIndexPage } from "./news";
import { backToMain, showMenu } from "./menu";
import { showTime } from "./time";
import { submitMove as submitCanonicalMove } from "./movement";
import { submitGather as submitCanonicalGather } from "./gather";
import { addCorpseToInventory, resourceTypeDisplayName } from "../services/corpses";
import { performSocialSignal } from "../services/socialSignals";
import { addTwigsPlaceholderText } from "../services/fire";
import { requireScribeAdmin } from "../services/adminAccess";
import { pickUpFirstGroundResourceByKey } from "../services/groundItems";
import { parseSpeechTarget } from "../services/speechTargets";

type TextTargetRef = {
  type: "player" | "creature";
  id: number;
  label: string;
  actionLabel?: string;
  canGreet: boolean;
  searchKeys: string[];
};

function normalizeTargetKey(value: string) {
  return normalizeInput(value)
    .replace(/^#/, "")
    .replace(/^ціль\s+/, "")
    .replace(/^target\s+/, "")
    .trim();
}

function uniqueKeys(keys: Array<string | null | undefined>) {
  return [...new Set(keys.filter(Boolean).map((key) => normalizeTargetKey(String(key))).filter(Boolean))];
}

function targetSearchKeysForPlayer(player: any) {
  return uniqueKeys([
    String(player.id),
    `#${player.id}`,
    player.nameNominative,
    player.firstName,
    player.lastName,
    player.username,
    "гравець",
    "персонаж",
    "мандрівник",
  ]);
}

function targetSearchKeysForCreature(creature: any) {
  const isCorpse = !creature.isAlive && creature.age === "CORPSE";
  const species = creature.species;
  const baseKeys = uniqueKeys([
    String(creature.id),
    `#${creature.id}`,
    creature.name,
    creature.nameGenitive,
    creature.nameDative,
    creature.nameAccusative,
    creature.nameInstrumental,
    creature.nameLocative,
    creature.nameVocative,
    species.name,
    species.nameGenitive,
    species.nameDative,
    species.nameAccusative,
    species.nameInstrumental,
    species.nameLocative,
    species.nameVocative,
  ]);

  if (!isCorpse) return baseKeys;
  return uniqueKeys([
    ...baseKeys,
    "труп",
    `труп ${species.name}`,
    `труп: ${species.name}`,
    species.nameGenitive ? `труп ${species.nameGenitive}` : undefined,
  ]);
}

function targetDisplayLabel(target: TextTargetRef) {
  return target.actionLabel ? `${target.label} — ${target.actionLabel}` : target.label;
}

async function visibleTextTargets(locationId: number, viewerPlayerId: number): Promise<TextTargetRef[]> {
  const [players, creatures] = await Promise.all([
    prisma.player.findMany({ where: { currentLocationId: locationId, id: { not: viewerPlayerId } }, orderBy: { id: "asc" } }),
    prisma.creature.findMany({
      where: {
        locationId,
        isGone: false,
        OR: [
          { isAlive: true, isHidden: false },
          { isAlive: false, age: "CORPSE" },
        ],
      },
      include: { species: true },
      orderBy: [{ isAlive: "desc" }, { id: "asc" }],
    }),
  ]);

  const playerTargets = players.map((player) => ({
    type: "player" as const,
    id: player.id,
    label: player.nameNominative ?? player.firstName ?? player.username ?? "мандрівник",
    canGreet: true,
    searchKeys: targetSearchKeysForPlayer(player),
  }));

  const creatureTargets = creatures.map((creature) => {
    const isCorpse = !creature.isAlive && creature.age === "CORPSE";
    return {
      type: "creature" as const,
      id: creature.id,
      label: isCorpse ? `труп: ${creature.species.name}` : creature.name ?? creature.species.name,
      actionLabel: normalizeCreatureActionText(creature.currentAction),
      canGreet: !isCorpse && creature.species.kind !== "ANIMAL",
      searchKeys: targetSearchKeysForCreature(creature),
    };
  });

  return [...playerTargets, ...creatureTargets];
}

function targetListText(targets: TextTargetRef[]) {
  return targets.map((target, index) => `${index + 1}. ${targetDisplayLabel(target)}`).join("\n");
}

function bestTargetMatch(query: string, targets: TextTargetRef[]) {
  const target = normalizeTargetKey(query);
  if (!target) return { kind: "none" as const };

  const asIndex = target.match(/^\d+$/) ? Number(target) : NaN;
  if (Number.isSafeInteger(asIndex) && asIndex >= 1 && asIndex <= targets.length) {
    return { kind: "one" as const, target: targets[asIndex - 1] };
  }

  const exact = targets.filter((candidate) => candidate.searchKeys.some((key) => key === target));
  if (exact.length === 1) return { kind: "one" as const, target: exact[0] };
  if (exact.length > 1) return { kind: "many" as const, targets: exact };

  const fuzzy = targets.filter((candidate) =>
    candidate.searchKeys.some((key) => key.length > 2 && (key.includes(target) || target.includes(key)))
  );
  if (fuzzy.length === 1) return { kind: "one" as const, target: fuzzy[0] };
  if (fuzzy.length > 1) return { kind: "many" as const, targets: fuzzy };

  return { kind: "none" as const };
}

async function replyWithNews(ctx: any) {
  const page = await buildNewsIndexPage(0);
  await ctx.reply(page.text, page.keyboard ? { reply_markup: page.keyboard } : undefined);
}

async function replyWithStat(ctx: any) {
  const stat = await buildStatBrief();
  await ctx.reply(stat.text, { reply_markup: stat.keyboard });
}

async function replyWithWho(ctx: any) {
  const page = await buildWhoPage(0);
  await ctx.reply(page.text, page.keyboard ? { reply_markup: page.keyboard } : undefined);
}

async function replyWithChat(ctx: any, mode?: string, window?: string) {
  const page = await buildChatLogPage(normalizeChatLogMode(mode), normalizeChatLogWindow(window), 0);
  await ctx.reply(page.text, { reply_markup: page.keyboard });
}

async function replyWithAll(ctx: any, showDead?: boolean) {
  if (!(await requireScribeAdmin(ctx))) return;
  const page = await buildAllPage(Boolean(showDead), 0);
  await ctx.reply(page.text, { reply_markup: page.keyboard });
}

async function submitLookAction(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const durationMs = actionDurationMs("LOOK", player.stamina);
  try {
    const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "LOOK", payload: {}, durationMs, chatId: ctx.chat?.id });
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося виконати дію.");
  }
}

async function beginRestNow(ctx: any, playerId: number) {
  const hadQueue = await hasPlayerActionQueueControls(playerId);
  await startPlayerRest(playerId);
  const suffix = hadQueue ? "\n\nПоточну дію та чергу скасовано." : "";
  await ctx.reply(`${await playerRestStatusText(playerId)}${suffix}`);
}

async function submitRest(ctx: any, mode: RestAliasMode = "start") {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  if (mode === "queue") {
    await queuePlayerRest(player.id, ctx.chat?.id);
    await ctx.reply(await renderPlayerActionQueue(player.id), await actionQueueReplyOptions(player.id));
    return;
  }

  if (mode === "interrupt") {
    await stopPlayerRest(player.id);
    const accelerated = await accelerateFirstQueuedPlayerAction(player.id);
    await ctx.reply(`Ви перервали відпочинок.${accelerated ? "\n\nНаступна дія починається." : ""}\n\n${await renderPlayerActionQueue(player.id)}`, await actionQueueReplyOptions(player.id));
    return;
  }

  const staminaMax = player.staminaMax ?? BASE_STAMINA;
  const hpMax = player.hpMax ?? BASE_HP;
  if (player.stamina >= staminaMax && player.hp >= hpMax && !player.isResting) {
    await ctx.reply(`Ви вже відпочили й готові до дій. Життя: ${player.hp}/${hpMax}. Снага: ${player.stamina}/${staminaMax}.`);
    return;
  }

  if (player.hp > 0 && await hasPlayerActionQueueControls(player.id)) {
    await ctx.reply("У вас зараз є черга дій. Почати відпочинок зараз і скасувати її, чи додати відпочинок у кінець черги?", {
      reply_markup: buildRestWithQueueChoiceKeyboard(),
    });
    return;
  }

  await beginRestNow(ctx, player.id);
}

async function submitAuto(bot: Bot, ctx: any, mode: "start" | "stop") {
  if (mode === "start") {
    await requestOrEnablePlayerAuto(bot, ctx);
    return;
  }

  const stopped = await disablePlayerAuto(ctx.from.id);
  await ctx.reply(stopped ? "Авто-режим зупинено." : "Авто-режим не був увімкнений.", {
    reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
  });
}

async function showQueue(ctx: any, playerId: number, prefix?: string) {
  const text = `${prefix ? `${prefix}\n\n` : ""}${await renderPlayerActionQueue(playerId)}`;
  await ctx.reply(text, await actionQueueReplyOptions(playerId));
}

async function submitQueue(ctx: any, mode: QueueAliasMode) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  if (mode === "clear") {
    const result = await clearQueuedPlayerActions(player.id);
    await showQueue(ctx, player.id, `Прибрано з черги: ${result.count}.`);
    return;
  }

  if (mode === "cancel-current") {
    const result = await cancelCurrentPlayerAction(player.id);
    await showQueue(ctx, player.id, `Скасовано поточних дій/відпочинку: ${result.count}.`);
    return;
  }

  await showQueue(ctx, player.id);
}

async function submitTrack(bot: Bot, ctx: any, detail = false) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const durationMs = actionDurationMs("TRACK", player.stamina);
  try {
    const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "TRACK", payload: { detail }, durationMs, chatId: ctx.chat?.id, interruptQueued: true });
    await ctx.reply(result.mode === "immediate" ? "Ви вдивляєтесь у сліди." : `Вистежування додано в чергу${durationSecondsSuffix(player, durationMs)}.`);
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося додати дію.");
  }
}

async function submitWait(bot: Bot, ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const durationMs = actionDurationMs("WAIT", player.stamina);
  try {
    const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "WAIT", payload: {}, durationMs, chatId: ctx.chat?.id });
    await ctx.reply(result.mode === "immediate" ? "Ви чекаєте." : `Очікування додано в чергу${durationSecondsSuffix(player, durationMs)}.`);
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося додати дію.");
  }
}

async function submitSay(bot: Bot, ctx: any, text: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const safeText = stripUnsafeText(text).slice(0, 300);
  if (!safeText) return void (await ctx.reply("Напиши так: сказати текст"));

  const durationMs = actionDurationMs("SAY", player.stamina);
  try {
    const payload = await parseSpeechTarget(safeText, player.currentLocationId, player.id);
    const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "SAY", payload, durationMs, chatId: ctx.chat?.id });
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося виконати дію.");
  }
}

function validateTargetAction(action: TargetAction, target: ResolvedTarget) {
  if (action === "greet" && !target.canGreet) return "Ця ціль не відповість на привітання.";
  if (action === "attack" && !target.canAttack) {
    if (target.isCorpse) return "Це вже труп.";
    if (target.kind === "player" || !target.isAnimal || !target.canAttack) return "Бій із хижаками й іншими персонажами ще не реалізований.";
    return "Цю ціль зараз не можна затоптати.";
  }
  if (action === "freshen" && (!target.isCorpse || !target.canFreshen)) return "Труп уже не підходить.";
  return null;
}

async function submitTargetAction(bot: Bot, ctx: any, action: TargetAction, targetQuery: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const locationId = player.currentLocationId;
  const visibleTargets = await visibleTextTargets(locationId, player.id);
  if (!visibleTargets.length) return void (await ctx.reply("Поруч немає видимих цілей."));

  const match = bestTargetMatch(targetQuery, visibleTargets);
  if (match.kind === "none") {
    await ctx.reply(`Не бачу такої цілі поруч. Видимі цілі:\n${targetListText(visibleTargets)}`);
    return;
  }

  if (match.kind === "many") {
    const keyboard = new InlineKeyboard();
    match.targets.forEach((target, index) => keyboard.text(`${index + 1}. ${targetDisplayLabel(target)}`, `target:${target.type}:${target.id}`).row());
    await ctx.reply(`Знайшов кілька схожих цілей. Уточни назвою або номером із повного списку поруч.\n\nВидимі цілі:\n${targetListText(visibleTargets)}`, { reply_markup: keyboard });
    return;
  }

  const target = await resolveTarget(match.target.type, match.target.id, locationId);
  if (!target) {
    return void (await ctx.reply("Цілі вже немає поруч. Можна роздивитися місцину ще раз.", { reply_markup: buildExamineLocationKeyboard() }));
  }

  const validationError = validateTargetAction(action, target);
  if (validationError) return void (await ctx.reply(validationError));

  const typeMap = { greet: "GREET", inspect: "INSPECT", attack: "ATTACK", freshen: "FRESHEN" } as const;
  const durationMs = actionDurationMs(typeMap[action], player.stamina);

  try {
    const result = await performOrQueuePlayerAction(bot, {
      playerId: player.id,
      type: typeMap[action],
      payload: { targetType: match.target.type, targetId: match.target.id, mode: "known" },
      durationMs,
      chatId: ctx.chat?.id,
      interruptCurrent: action === "attack",
      interruptQueued: action === "attack",
    });
    await ctx.reply(result.mode === "immediate" ? "Дію виконано." : `Дію додано в чергу${durationSecondsSuffix(player, durationMs)}.`);
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося додати дію.");
  }
}

async function resolveVisibleTargetForAlias(ctx: any, targetQuery: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) {
    await ctx.reply("Ти ще не увійшов у світ. Напиши /start");
    return null;
  }

  const locationId = player.currentLocationId;
  const visibleTargets = await visibleTextTargets(locationId, player.id);
  if (!visibleTargets.length) {
    await ctx.reply("Поруч немає видимих цілей.");
    return null;
  }

  const match = bestTargetMatch(targetQuery, visibleTargets);
  if (match.kind === "none") {
    await ctx.reply(`Не бачу такої цілі поруч. Видимі цілі:\n${targetListText(visibleTargets)}`);
    return null;
  }

  if (match.kind === "many") {
    await ctx.reply(`Знайшов кілька схожих цілей. Уточни назвою або номером.\n\nВидимі цілі:\n${targetListText(visibleTargets)}`);
    return null;
  }

  const target = await resolveTarget(match.target.type, match.target.id, locationId);
  if (!target) {
    await ctx.reply("Цілі вже немає поруч. Можна роздивитися місцину ще раз.", { reply_markup: buildExamineLocationKeyboard() });
    return null;
  }

  return { player, locationId, targetRef: match.target, target };
}

async function submitPickupTarget(ctx: any, targetQuery: string) {
  const normalizedTarget = normalizeTargetKey(targetQuery);
  if (["torch", "torches", "факел", "факели", "факела", "факелів"].includes(normalizedTarget)) {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    try {
      const item = await pickUpFirstGroundResourceByKey(player.id, "torch");
      await ctx.reply(`Ви підняли ${item.name}.`);
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : "Не вдалося підняти це.");
    }
    return;
  }

  const resolved = await resolveVisibleTargetForAlias(ctx, targetQuery);
  if (!resolved) return;

  const { target } = resolved;
  if (target.kind !== "creature" || !target.isCorpse) return void (await ctx.reply("Підібрати зараз можна тільки видимий труп поруч."));

  const creature = await prisma.creature.findFirst({
    where: {
      id: target.id,
      locationId: resolved.locationId,
      isAlive: false,
      isGone: false,
      isHidden: false,
      age: "CORPSE",
    },
    include: { species: true },
  });
  if (!creature) return void (await ctx.reply("Трупа вже немає поруч. Можна роздивитися місцину ще раз.", { reply_markup: buildExamineLocationKeyboard() }));

  try {
    const resourceType = await addCorpseToInventory(resolved.player.id, { ...creature, species: creature.species });
    await ctx.reply(`Ви підібрали ${resourceTypeDisplayName(resourceType)}.`);
  } catch {
    await ctx.reply("Трупа вже немає поруч. Можна роздивитися місцину ще раз.", { reply_markup: buildExamineLocationKeyboard() });
  }
}

async function submitSocialSignal(bot: Bot, ctx: any, signal: SocialSignalAlias, targetQuery: string) {
  const resolved = await resolveVisibleTargetForAlias(ctx, targetQuery);
  if (!resolved) return;
  if (resolved.target.isCorpse) return void (await ctx.reply("Ця ціль не відповість на сигнал."));

  try {
    await performSocialSignal(bot, resolved.player, resolved.target, signal, ctx.chat?.id);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося подати сигнал.");
  }
}

export function registerAliasHandlers(bot: Bot) {
  bot.on("message:text", async (ctx, next) => {
    if (!ctx.from || !ctx.message?.text) return next();

    const parsed = parseAlias(ctx.message.text);
    if (!parsed) return next();

    if (parsed.kind === "location") return showLocationForPlayer(ctx.from.id, (text, options) => ctx.reply(text, options));
    if (parsed.kind === "look-action") return submitLookAction(bot, ctx);
    if (parsed.kind === "me") return showCharacter(ctx.from.id, (text, options) => ctx.reply(text, options));
    if (parsed.kind === "inventory") return showInventory(ctx.from.id, (text, options) => ctx.reply(text, options));
    if (parsed.kind === "help") return sendHelp(ctx);
    if (parsed.kind === "news") return replyWithNews(ctx);
    if (parsed.kind === "stat") return replyWithStat(ctx);
    if (parsed.kind === "who") return replyWithWho(ctx);
    if (parsed.kind === "chat") return replyWithChat(ctx, parsed.mode, parsed.window);
    if (parsed.kind === "all") return replyWithAll(ctx, parsed.showDead);
    if (parsed.kind === "time") return showTime(ctx);
    if (parsed.kind === "menu") return showMenu(ctx);
    if (parsed.kind === "back") return backToMain(ctx);
    if (parsed.kind === "move") return submitCanonicalMove(bot, ctx, parsed.direction, false);
    if (parsed.kind === "gather") return submitCanonicalGather(bot, ctx, parsed.resourceKey, false);
    if (parsed.kind === "rest") return submitRest(ctx, parsed.mode);
    if (parsed.kind === "auto") return submitAuto(bot, ctx, parsed.mode);
    if (parsed.kind === "queue") return submitQueue(ctx, parsed.mode);
    if (parsed.kind === "track") return submitTrack(bot, ctx, Boolean(parsed.detail));
    if (parsed.kind === "wait") return submitWait(bot, ctx);
    if (parsed.kind === "add-twigs-campfire") return ctx.reply(addTwigsPlaceholderText());
    if (parsed.kind === "say") return submitSay(bot, ctx, parsed.text);
    if (parsed.kind === "target-action") return submitTargetAction(bot, ctx, parsed.action, parsed.target);
    if (parsed.kind === "pickup-target") return submitPickupTarget(ctx, parsed.target);
    if (parsed.kind === "social-signal") return submitSocialSignal(bot, ctx, parsed.signal, parsed.target);
  });
}
