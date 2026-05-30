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
import { buildExamineLocationKeyboard, buildRestWithQueueChoiceKeyboard, buildStandUpKeyboard } from "../ui/keyboards";
import { buildInventoryItemKeyboard } from "../ui/inventoryItemKeyboard";
import { actionQueueReplyOptions, sendActionSubmitFeedback } from "../utils/actionQueueUi";
import { durationSecondsSuffix } from "../utils/durationText";
import { escapeHtml, stripUnsafeText } from "../utils/text";
import { normalizeCreatureActionText } from "../utils/creatureActionText";
import { sendHelp } from "./help";
import { disablePlayerAuto, isPlayerAutoEnabled, requestOrEnablePlayerAuto } from "./auto";
import { showCharacter, showInventory, showLocationForPlayer } from "./player";
import { buildAllPage, buildChatLogPage, buildStatBrief, buildWhoPage } from "./status";
import { renderDepletedVegetationInspection, renderLocationBrief, renderLocationExits, renderLocationFeatureInteraction, renderLocationFeatureInteractionByQuery, renderLocationGlance } from "../services/locations";
import { buildNewsIndexPage } from "./news";
import { hideReplyKeyboard, showMainKeyboard, showMenu } from "./menu";
import { showTime } from "./time";
import { submitMove as submitCanonicalMove } from "./movement";
import { submitGather as submitCanonicalGather } from "./gather";
import { submitPosture } from "./posture";
import { addCorpseToInventory, resourceTypeDisplayName } from "../services/corpses";
import { performSocialSignal } from "../services/socialSignals";
import { addTwigsToCampfire, dousePlayerTorchFromInventory, lightPlayerTorchFromInventory } from "../services/fire";
import { requireScribeAdmin } from "../services/adminAccess";
import { pickUpAllVisibleGroundResources, pickUpFirstGroundResourceByKey, pickUpFirstVisibleGroundResourceByKey, type VisibleGroundResourceKey } from "../services/groundItems";
import { parseSpeechTarget } from "../services/speechTargets";
import { dropInventoryResourceDetailed, inspectInventoryResource, inventoryResourceKeyFromText, useInventoryResource, type UsableInventoryResource } from "../services/inventoryUse";
import { enterTutorialDream, hasCompletedTutorial, openDreamGate, rememberTutorialCommandHintIfInTutorial, wakeFromTutorialDream } from "../services/tutorial";
import { dropObserverText, pickupObserverText, recordVisibleItemAction } from "../services/visibleItemActions";
import { noteKnownMessage } from "../utils/messageTracker";
import { cookRawMeat, isFreshenedCorpse } from "../services/meat";
import { creatureForms, playerForms } from "../services/grammar";
import { putInventoryIntoLocalFeature } from "../services/carcassDropoff";
import { latestRememberedReplyTarget } from "../services/replyTargets";
import { replyToActionError } from "../utils/actionErrorReply";
import { assertCanPerformPhysicalAction } from "../services/postureRules";

type TextTargetRef = {
  type: "player" | "creature";
  id: number;
  label: string;
  actionLabel?: string;
  canGreet: boolean;
  searchKeys: string[];
};

function quoteBlock(text: string) {
  return `<blockquote>${escapeHtml(text)}</blockquote>`;
}

async function sendFeatureFollowups(ctx: any, view: any) {
  for (const message of view.quoteMessages ?? []) {
    noteKnownMessage(await ctx.reply(`${escapeHtml(message.title)}:\n${quoteBlock(message.text)}`, { parse_mode: "HTML" }));
  }
  for (const message of view.followupMessages ?? []) {
    noteKnownMessage(await ctx.reply(message.text, { parse_mode: "HTML" }));
  }
}

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
    const wasFreshened = isCorpse && isFreshenedCorpse(creature.currentAction);
    return {
      type: "creature" as const,
      id: creature.id,
      label: isCorpse ? `${wasFreshened ? "рештки" : "труп"}: ${creatureForms(creature).genitive}` : creature.name ?? creature.species.name,
      actionLabel: wasFreshened ? "м’ясо вже знято" : normalizeCreatureActionText(creature.currentAction),
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
  if (!(await requireScribeAdmin(ctx))) return;
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

async function replyWithLocationGlance(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const view = await renderLocationGlance(player.currentLocationId, player.id);
  await ctx.reply(view.text, { parse_mode: "HTML" });
}

async function replyWithLocationExits(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const view = await renderLocationExits(player.currentLocationId);
  await ctx.reply(view.text, { parse_mode: "HTML" });
}

async function replyWithVegetationInspection(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const view = await renderDepletedVegetationInspection(player.currentLocationId, player.id);
  if (!view) return void (await ctx.reply("Тут не видно винищеної трави, яку можна оцінити."));
  await ctx.reply(view.text, { reply_markup: view.keyboard });
}

async function replyWithBorderMarkerInspection(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const feature = await prisma.locationFeature.findFirst({
    where: { locationId: player.currentLocationId, isActive: true, type: "BORDER_MARKER" },
    orderBy: { id: "asc" },
  });
  if (!feature) return void (await ctx.reply("Тут не видно межового знака, який можна роздивитися."));

  const view = await renderLocationFeatureInteraction(feature.id, player.id);
  if (!view) return void (await ctx.reply("Тут не видно межового знака, який можна роздивитися."));
  noteKnownMessage(await ctx.reply(view.text, { reply_markup: view.keyboard }));
  await sendFeatureFollowups(ctx, view);
}

async function submitFeatureInspection(bot: Bot, ctx: any, targetQuery: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player?.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const view = await renderLocationFeatureInteractionByQuery(player.currentLocationId, player.id, targetQuery);
  if (!view) return submitTargetAction(bot, ctx, "inspect", targetQuery);

  await rememberTutorialCommandHintIfInTutorial(player.id, "examine", player.currentLocationId);
  noteKnownMessage(await ctx.reply(view.text, { reply_markup: view.keyboard }));
  await sendFeatureFollowups(ctx, view);
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
  await ctx.reply(`${await playerRestStatusText(playerId)}${suffix}`, {
    reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false),
  });
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
    await ctx.reply("Ви лишаєтеся сидіти.", {
      reply_markup: buildStandUpKeyboard(),
    });
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
    await replyToActionError(ctx, error, "Не вдалося додати дію.");
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
    await replyToActionError(ctx, error, "Не вдалося додати дію.");
  }
}

async function submitUseItem(ctx: any, item: UsableInventoryResource) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    await ctx.reply(await useInventoryResource(player.id, item));
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося використати це.");
  }
}

async function submitLightTorch(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  try {
    assertCanPerformPhysicalAction(player, "TORCH");
    await ctx.reply(await lightPlayerTorchFromInventory(player.id));
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося запалити факел.");
  }
}

async function submitDouseTorch(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  try {
    assertCanPerformPhysicalAction(player, "TORCH");
    await ctx.reply(await dousePlayerTorchFromInventory(player.id));
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося притушити факел.");
  }
}

async function submitCookMeat(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  try {
    assertCanPerformPhysicalAction(player, "COOK");
    await ctx.reply(await cookRawMeat(player.id));
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося підсмажити м'ясо.");
  }
}

async function replyWithInventoryInspection(ctx: any, playerId: number, target: string) {
  const text = await inspectInventoryResource(playerId, target);
  const resourceKey = inventoryResourceKeyFromText(target);
  const keyboard = await buildInventoryItemKeyboard(playerId, resourceKey);
  await ctx.reply(text, { reply_markup: keyboard });
}

async function tryReplyWithInventoryInspection(ctx: any, playerId: number, target: string) {
  try {
    await replyWithInventoryInspection(ctx, playerId, target);
    return true;
  } catch {
    return false;
  }
}

async function submitInventoryInspect(ctx: any, target: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    await replyWithInventoryInspection(ctx, player.id, target);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося роздивитися це.");
  }
}

async function submitInventoryDrop(bot: Bot, ctx: any, target: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    assertCanPerformPhysicalAction(player, "DROP");
    const result = await dropInventoryResourceDetailed(player.id, target);
    await recordVisibleItemAction(bot, {
      playerId: player.id,
      locationId: result.locationId,
      observerText: dropObserverText(player, result.droppedName),
      eventTitle: "Player dropped item",
      eventDescription: `player=${player.id}; item=${result.resourceKey}; name=${result.droppedName}`,
      actionNote: `викинуто: ${result.droppedName}`,
    });
    await ctx.reply(result.text);
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося викинути це.");
  }
}

async function submitPutItem(bot: Bot, ctx: any, item: string, amount: number | "all" | undefined, container: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  try {
    assertCanPerformPhysicalAction(player, "PUT");
    const result = await putInventoryIntoLocalFeature({
      playerId: player.id,
      itemQuery: item,
      amount,
      containerQuery: container,
    });
    await recordVisibleItemAction(bot, {
      playerId: player.id,
      locationId: result.locationId,
      observerText: `${playerForms(player).nominative} складає здобич до падального рову біля воріт.`,
      eventTitle: "Player contributed carcass",
      eventDescription: `player=${player.id}; dropoff=${result.featureKey}; amount=${result.amount}; total=${result.contributionTotal}`,
      actionNote: `покладено здобич до падального рову: ${result.amount}`,
    });
    await ctx.reply(result.text);
  } catch (error) {
    await replyToActionError(ctx, error, "Не вдалося покласти це.");
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

async function submitWhisper(bot: Bot, ctx: any, text: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const safeText = stripUnsafeText(text);
  if (!safeText) return void (await ctx.reply("Напиши так: whisper персонаж текст"));

  const durationMs = actionDurationMs("SAY", player.stamina);
  try {
    const payload = await parseSpeechTarget(safeText, player.currentLocationId, player.id);
    if (!payload.targetId) return void (await ctx.reply("Напиши так: whisper персонаж текст. Ціль має бути видимим персонажем поруч."));
    if (payload.targetType !== "player") return void (await ctx.reply("Шепіт зараз можна спрямувати тільки персонажу поруч."));
    const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "SAY", payload: { ...payload, mode: "whisper" }, durationMs, chatId: ctx.chat?.id });
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося прошепотіти.");
  }
}

const REPLY_SPEECH_SPLITTERS = [
  /\s+сказав\b/u,
  /\s+сказала\b/u,
  /\s+сказали\b/u,
  /\s+відповів\b/u,
  /\s+відповіла\b/u,
  /\s+відповіли\b/u,
];

function speechSpeakerFromTitle(title: string) {
  for (const splitter of REPLY_SPEECH_SPLITTERS) {
    const match = title.match(splitter);
    if (match?.index && match.index > 0) return title.slice(0, match.index).trim();
  }
  return "";
}

async function lastAddressedSpeakerName(player: any) {
  const forms = playerForms(player);
  const selfKeys = [forms.nominative, forms.dative, player.firstName, player.username].filter(Boolean).map((value) => normalizeInput(String(value)));
  const remembered = await latestRememberedReplyTarget(player.id);
  if (remembered && !selfKeys.includes(normalizeInput(remembered.speakerName))) return remembered;

  const addressedForms = [forms.dative, forms.nominative, player.firstName].filter(Boolean);
  const events = await prisma.worldEvent.findMany({
    where: {
      type: "SAY",
      locationId: player.currentLocationId,
      OR: addressedForms.map((form) => ({ title: { contains: String(form) } })),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 10,
  });

  for (const event of events) {
    const speaker = speechSpeakerFromTitle(event.title);
    if (!speaker) continue;
    if (selfKeys.includes(normalizeInput(speaker))) continue;
    return { speakerName: speaker };
  }
  return null;
}

async function submitReply(bot: Bot, ctx: any, text: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const safeText = stripUnsafeText(text);
  if (!safeText) return void (await ctx.reply("Напиши так: reply текст"));

  const target = await lastAddressedSpeakerName(player);
  if (!target) return void (await ctx.reply("Поки немає репліки, на яку можна відповісти. Спробуйте звичайне /say або зверніться до видимого персонажа."));

  const durationMs = actionDurationMs("SAY", player.stamina);
  try {
    const result = await performOrQueuePlayerAction(bot, {
      playerId: player.id,
      type: "SAY",
      payload: {
        text: safeText,
        mode: "reply",
        targetName: target.speakerName,
        ...(target.speakerPlayerId ? { targetType: "player", targetId: target.speakerPlayerId } : {}),
      },
      durationMs,
      chatId: ctx.chat?.id,
    });
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося відповісти.");
  }
}

async function submitShout(bot: Bot, ctx: any, text: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || !player.currentLocationId) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const safeText = stripUnsafeText(text);
  if (!safeText) return void (await ctx.reply("Напиши так: shout текст"));

  const durationMs = actionDurationMs("SAY", player.stamina) * 2;
  try {
    const result = await performOrQueuePlayerAction(bot, { playerId: player.id, type: "SAY", payload: { text: safeText, mode: "shout" }, durationMs, chatId: ctx.chat?.id });
    await sendActionSubmitFeedback(ctx, player.id, result);
  } catch (error) {
    await ctx.reply(error instanceof Error ? error.message : "Не вдалося гукнути.");
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
  if (!visibleTargets.length) {
    if (action === "inspect" && (await tryReplyWithInventoryInspection(ctx, player.id, targetQuery))) return;
    return void (await ctx.reply("Поруч немає видимих цілей."));
  }

  const match = bestTargetMatch(targetQuery, visibleTargets);
  if (match.kind === "none") {
    if (action === "inspect" && (await tryReplyWithInventoryInspection(ctx, player.id, targetQuery))) return;
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
    await replyToActionError(ctx, error, "Не вдалося додати дію.");
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

function pickupResourceKey(target: string): VisibleGroundResourceKey | null {
  if (["torch", "torches", "факел", "факели", "факела", "факелів"].includes(target)) return "torch";
  if (["lit torch", "lit_torch", "burning torch", "запалений факел", "палаючий факел"].includes(target)) return "lit_torch";
  if (["twigs", "twig", "хмиз"].includes(target)) return "twigs";
  if (["raw meat", "raw_meat", "сире м'ясо", "сире м’ясо", "м'ясо", "м’ясо"].includes(target)) return "raw_meat";
  if (["cooked meat", "cooked_meat", "смажене м'ясо", "смажене м’ясо"].includes(target)) return "cooked_meat";
  if (["berries", "berry", "ягоди", "ягід"].includes(target)) return "berries";
  if (["mushrooms", "mushroom", "гриби", "грибів"].includes(target)) return "mushrooms";
  if (["herbs", "herb", "трави", "трав", "лікарські трави", "лікарських трав", "зілля", "зіллячко"].includes(target)) return "herbs";
  return null;
}

function naturalResourcePickupHint(key: VisibleGroundResourceKey) {
  if (key === "berries") return "Ягоди тут не лежать окремо. Якщо вони ростуть у цій місцині, їх можна зібрати: напишіть «зібрати ягоди».";
  if (key === "mushrooms") return "Гриби тут не лежать окремо. Якщо вони ростуть у цій місцині, їх можна зібрати: напишіть «зібрати гриби».";
  if (key === "herbs") return "Лікарські трави тут не лежать окремо. Якщо вони ростуть у цій місцині, їх можна зібрати: напишіть «зібрати трави».";
  return null;
}

function isPickupAllTarget(target: string) {
  return ["all", "everything", "все", "усе", "всі", "усі"].includes(target);
}

function pickedItemsText(items: Array<{ name: string; amount: number }>) {
  return items.map((item) => `${item.name}${item.amount > 1 ? ` ×${item.amount}` : ""}`).join(", ");
}

async function submitPickupTarget(bot: Bot, ctx: any, targetQuery: string) {
  const normalizedTarget = normalizeTargetKey(targetQuery);
  if (isPickupAllTarget(normalizedTarget)) {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

    try {
      assertCanPerformPhysicalAction(player, "PICK_UP");
      const result = await pickUpAllVisibleGroundResources(player.id);
      const text = pickedItemsText(result.items);
      await recordVisibleItemAction(bot, {
        playerId: player.id,
        locationId: result.locationId,
        observerText: pickupObserverText(player, `кілька речей: ${text}`),
        eventTitle: "Player picked up all visible ground items",
        eventDescription: `player=${player.id}; items=${result.items.map((item) => `${item.key}:${item.amount}`).join(",")}`,
        actionNote: `піднято все: ${text}`,
      });
      await ctx.reply(`Ви підняли: ${text}.`);
    } catch (error) {
      await replyToActionError(ctx, error, "Не вдалося підняти це.");
    }
    return;
  }

  const resourceKey = pickupResourceKey(normalizedTarget);
  if (resourceKey) {
    const player = await getPlayerByTelegramId(ctx.from.id);
    if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
    try {
      assertCanPerformPhysicalAction(player, "PICK_UP");
      const item = resourceKey === "berries" || resourceKey === "mushrooms" || resourceKey === "herbs"
        ? await pickUpFirstVisibleGroundResourceByKey(player.id, resourceKey)
        : await pickUpFirstGroundResourceByKey(player.id, resourceKey);
      await recordVisibleItemAction(bot, {
        playerId: player.id,
        locationId: item.locationId,
        observerText: pickupObserverText(player, item.name),
        eventTitle: "Player picked up item",
        eventDescription: `player=${player.id}; item=${item.key}; name=${item.name}`,
        actionNote: `піднято: ${item.name}`,
      });
      await ctx.reply(`Ви підняли ${item.name}.`);
    } catch (error) {
      const hint = naturalResourcePickupHint(resourceKey);
      const message = error instanceof Error ? error.message : "Не вдалося підняти це.";
      if (hint && message === "Цього вже немає поруч.") await ctx.reply(hint);
      else await replyToActionError(ctx, error, "Не вдалося підняти це.");
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
    assertCanPerformPhysicalAction(resolved.player, "PICK_UP");
    const resourceType = await addCorpseToInventory(resolved.player.id, { ...creature, species: creature.species });
    const itemName = resourceTypeDisplayName(resourceType);
    await recordVisibleItemAction(bot, {
      playerId: resolved.player.id,
      locationId: resolved.locationId,
      observerText: pickupObserverText(resolved.player, itemName),
      eventTitle: "Player picked up corpse",
      eventDescription: `player=${resolved.player.id}; creature=${creature.id}; item=${resourceType.key}; name=${itemName}`,
      actionNote: `піднято: ${itemName}`,
    });
    await ctx.reply(`Ви підібрали ${itemName}.`);
  } catch (error) {
    await replyToActionError(ctx, error, "Трупа вже немає поруч. Можна роздивитися місцину ще раз.");
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

async function submitSleep(ctx: any, tutorial = false) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  if (!tutorial && await hasCompletedTutorial(player.id)) {
    return void (await ctx.reply("Звичайний сон ще не вплетений у правила світу. Для навчального сну використайте /sleep tutorial.", {
      reply_markup: new InlineKeyboard().text("🌙 Навчальний сон", "tutorial:sleep"),
    }));
  }

  await disablePlayerAuto(ctx.from.id);
  const result = await enterTutorialDream(player.id);
  await ctx.reply(result.text, { reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) });
  const view = await renderLocationBrief(result.locationId, player.id);
  await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
}

async function submitWake(ctx: any) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));

  const result = await wakeFromTutorialDream(player.id);
  await ctx.reply(result.text, { reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) });
  if (result.woke) {
    const view = await renderLocationBrief(result.locationId, player.id);
    await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
  }
}

async function submitOpen(ctx: any, target?: string) {
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
  await ctx.reply(await openDreamGate(player.id, target), { reply_markup: await buildMainReplyKeyboardForTelegramId(ctx.from.id, false) });
}

export function registerAliasHandlers(bot: Bot) {
  bot.on("message:text", async (ctx, next) => {
    if (!ctx.from || !ctx.message?.text) return next();

    const parsed = parseAlias(ctx.message.text);
    if (!parsed) return next();

    if (parsed.kind === "location") return showLocationForPlayer(ctx.from.id, (text, options) => ctx.reply(text, options));
    if (parsed.kind === "glance") return replyWithLocationGlance(ctx);
    if (parsed.kind === "exits") return replyWithLocationExits(ctx);
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
    if (parsed.kind === "back") return showMainKeyboard(ctx);
    if (parsed.kind === "hide-keyboard") return hideReplyKeyboard(ctx);
    if (parsed.kind === "inspect-vegetation") return replyWithVegetationInspection(ctx);
    if (parsed.kind === "inspect-border-marker") return replyWithBorderMarkerInspection(ctx);
    if (parsed.kind === "inspect-feature") return submitFeatureInspection(bot, ctx, parsed.target);
    if (parsed.kind === "move") return submitCanonicalMove(bot, ctx, parsed.direction, false);
    if (parsed.kind === "gather") return submitCanonicalGather(bot, ctx, parsed.resourceKey, false);
    if (parsed.kind === "posture") return submitPosture(ctx, parsed.mode);
    if (parsed.kind === "rest") return submitRest(ctx, parsed.mode);
    if (parsed.kind === "auto") return submitAuto(bot, ctx, parsed.mode);
    if (parsed.kind === "queue") return submitQueue(ctx, parsed.mode);
    if (parsed.kind === "track") return submitTrack(bot, ctx, Boolean(parsed.detail));
    if (parsed.kind === "wait") return submitWait(bot, ctx);
    if (parsed.kind === "use-item") return submitUseItem(ctx, parsed.item);
    if (parsed.kind === "light-torch") return submitLightTorch(ctx);
    if (parsed.kind === "douse-torch") return submitDouseTorch(ctx);
    if (parsed.kind === "cook-meat") return submitCookMeat(ctx);
    if (parsed.kind === "sleep") return submitSleep(ctx, parsed.tutorial);
    if (parsed.kind === "wake") return submitWake(ctx);
    if (parsed.kind === "open") return submitOpen(ctx, parsed.target);
    if (parsed.kind === "inspect-inventory-item") return submitInventoryInspect(ctx, parsed.target);
    if (parsed.kind === "drop-inventory-item") return submitInventoryDrop(bot, ctx, parsed.target);
    if (parsed.kind === "put-item") return submitPutItem(bot, ctx, parsed.item, parsed.amount, parsed.container);
    if (parsed.kind === "add-twigs-campfire") {
      const player = await getPlayerByTelegramId(ctx.from.id);
      if (!player) return void (await ctx.reply("Ти ще не увійшов у світ. Напиши /start"));
      try {
        assertCanPerformPhysicalAction(player, "FIRE");
        return ctx.reply(await addTwigsToCampfire(player.id));
      } catch (error) {
        return replyToActionError(ctx, error, "Не вдалося підкинути хмиз.");
      }
    }
    if (parsed.kind === "say") return submitSay(bot, ctx, parsed.text);
    if (parsed.kind === "whisper") return submitWhisper(bot, ctx, parsed.text);
    if (parsed.kind === "reply") return submitReply(bot, ctx, parsed.text);
    if (parsed.kind === "shout") return submitShout(bot, ctx, parsed.text);
    if (parsed.kind === "target-action") return submitTargetAction(bot, ctx, parsed.action, parsed.target);
    if (parsed.kind === "pickup-target") return submitPickupTarget(bot, ctx, parsed.target);
    if (parsed.kind === "social-signal") return submitSocialSignal(bot, ctx, parsed.signal, parsed.target);
  });
}
