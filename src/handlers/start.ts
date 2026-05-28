import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { getStartLocationId } from "../services/players";
import { renderLocationBrief } from "../services/locations";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { guessGenderFromPronoun, guessNameForms, normalizeCharacterName, type NameForms } from "../services/grammar";
import { BASE_STAMINA } from "../gameConfig";
import { renderCurrentWorldYearLine } from "../services/calendar";
import { setDefaultBotCommandsWithRetry, syncChatBotCommandsForTelegramId } from "../services/telegramCommands";
import { enterTutorialDream, hasCompletedTutorial, isTutorialLocation } from "../services/tutorial";
import {
  availablePreparedNames,
  customNameWarningText,
  normalizeNameForRegistry,
  preparedNameByKey,
  preparedNameSummary,
  validateCustomCharacterName,
} from "../services/characterNames";

const CASE_PROMPTS: Array<{ key: keyof NameForms; question: string; prefix?: string }> = [
  { key: "genitive", question: "Ім’я в родовому відмінку (Немає КОГО?)" },
  { key: "dative", question: "Ім’я в давальному відмінку (Даю КОМУ?)" },
  { key: "accusative", question: "Ім’я в знахідному відмінку (Бачу КОГО?)" },
  { key: "instrumental", question: "Ім’я в орудному відмінку (Пишаюся КИМ?)" },
  { key: "locative", question: "Ім’я в місцевому відмінку (Стою на КОМУ?)", prefix: "на " },
  { key: "vocative", question: "Ім’я в кличному відмінку (Звертання)" },
];

type OnboardingState = {
  step: "nameChoice" | "name" | "case";
  telegramId: string;
  pronoun: "HE" | "SHE" | "THEY";
  name?: string;
  script?: "cyrillic" | "latin";
  forms?: NameForms;
  caseIndex?: number;
  nameApproved?: boolean;
};

const onboarding = new Map<string, OnboardingState>();

function pronounKeyboard() {
  return new InlineKeyboard()
    .text("Він", "onboarding:pronoun:HE")
    .text("Вона", "onboarding:pronoun:SHE")
    .text("Вони", "onboarding:pronoun:THEY");
}

function nameChoiceKeyboard() {
  return new InlineKeyboard()
    .text("Обрати ім'я зі списку", "onboarding:nameChoice:prepared")
    .row()
    .text("Ввести власне ім'я", "onboarding:nameChoice:custom");
}

function preparedNamesKeyboard(names: Array<{ key: string; forms: NameForms }>) {
  const keyboard = new InlineKeyboard();
  for (const name of names) {
    keyboard.text(name.forms.nominative, `onboarding:name:${name.key}`).row();
  }
  keyboard.text("Ввести власне ім'я", "onboarding:nameChoice:custom");
  return keyboard;
}

function casePrompt(forms: NameForms, index: number) {
  const prompt = CASE_PROMPTS[index];
  const suggested = forms[prompt.key];
  const prefix = prompt.prefix ?? "";
  return `${prompt.question}\n${prefix}[${suggested}]\n\nНадішліть правильну форму або поставте +, щоб залишити запропоновану.`;
}

async function askOnboarding(ctx: any) {
  await ctx.reply("Ваші займенники:", { reply_markup: pronounKeyboard() });
}

async function usedCharacterNames() {
  const players = await prisma.player.findMany({
    where: { nameNominative: { not: null } },
    select: { nameNominative: true },
  });
  return players.map((player) => player.nameNominative);
}

async function askNameChoice(ctx: any) {
  await ctx.reply(
    "Як вас зватимуть у Чорнолісі?\n\nМожна взяти ім'я зі списку, вже перевірене Писарями, або ввести власне.",
    { reply_markup: nameChoiceKeyboard() }
  );
}

async function showPreparedNameChoices(ctx: any) {
  const names = availablePreparedNames(await usedCharacterNames());
  if (names.length === 0) {
    await ctx.reply(`Усі підготовлені імена вже зайняті або зарезервовані.\n\n${customNameWarningText()}`);
    return;
  }

  await ctx.reply(
    `Писарі вже перевірили ці імена, їхні відмінки й відповідність Порубіжжю:\n\n${names.map(preparedNameSummary).join("\n")}`,
    { reply_markup: preparedNamesKeyboard(names) }
  );
}

async function enterWorld(ctx: any, isMenuRefresh = false) {
  const from = ctx.from;
  if (!from) return;

  const startLocationId = await getStartLocationId();
  const existing = await prisma.player.findUnique({ where: { telegramId: String(from.id) } });
  const player = existing
    ? await prisma.player.update({
        where: { id: existing.id },
        data: {
          username: from.username ?? null,
          firstName: from.first_name ?? null,
          lastName: from.last_name ?? null,
          currentLocationId: existing.currentLocationId ?? startLocationId,
        },
      })
    : await prisma.player.create({
        data: {
          telegramId: String(from.id),
          username: from.username ?? null,
          firstName: from.first_name ?? null,
          lastName: from.last_name ?? null,
          currentLocationId: startLocationId,
          stamina: BASE_STAMINA * 3,
          staminaMax: BASE_STAMINA,
        },
      });

  if (!player.onboardingComplete) {
    onboarding.set(String(from.id), { step: "nameChoice", telegramId: String(from.id), pronoun: "HE" });
    await askOnboarding(ctx);
    return;
  }

  if (ctx.chat?.id) await syncChatBotCommandsForTelegramId(ctx.api, ctx.chat.id, from.id);

  const displayName = player.nameNominative ?? player.firstName ?? "мандрівнику";
  const yearLine = renderCurrentWorldYearLine();
  const currentLocation = player.currentLocationId
    ? await prisma.cellLocation.findUnique({
        where: { id: player.currentLocationId },
        select: {
          key: true,
          z: true,
          region: { select: { key: true } },
        },
      })
    : null;
  const isInTutorial = currentLocation ? isTutorialLocation(currentLocation) : false;
  const tutorialCompleted = await hasCompletedTutorial(player.id);
  const keyboardHint = isInTutorial
    ? "Ти вже в навчальному сні. /start не скидає сон і не переносить тебе, а просто повертає актуальні навчальні кнопки."
    : tutorialCompleted
      ? "Ти вже в грі. Клавіатура чекає під полем вводу, але всі команди можна і просто текстом вводити 👇"
      : "Ти вже в грі. Навчальний сон ще не завершено: можна повернутися командою /sleep tutorial або написати «навчальний сон». Клавіатура чекає під полем вводу, але всі команди можна і просто текстом вводити 👇";

  const text = isMenuRefresh
    ? `🌲 Меню оновлено.\n${yearLine}\n\nВітаю, ${displayName}.\n\n${keyboardHint}`
    : `🌲 Порубіжжя Чорнолісу ожили.\n${yearLine}\n\nВітаю, ${displayName}. Твій слід збережено в Чорнолісі.\n\n${keyboardHint}`;

  await ctx.reply(text, { reply_markup: await buildMainReplyKeyboardForTelegramId(from.id, false) });
}

async function finishOnboarding(ctx: any, state: OnboardingState) {
  if (!state.name || !state.forms) return;
  const gender = guessGenderFromPronoun(state.pronoun);
  const startLocationId = await getStartLocationId();

  const data = {
    pronoun: state.pronoun,
    nameNominative: state.forms.nominative,
    nameGenitive: state.forms.genitive,
    nameDative: state.forms.dative,
    nameAccusative: state.forms.accusative,
    nameInstrumental: state.forms.instrumental,
    nameLocative: state.forms.locative,
    nameVocative: state.forms.vocative,
    grammaticalGender: gender,
    animacy: "ANIMATE" as const,
    onboardingComplete: true,
    isNameApproved: state.nameApproved ?? false,
    stamina: BASE_STAMINA * 3,
    staminaMax: BASE_STAMINA,
    currentLocationId: startLocationId,
  };

  const updated = await prisma.player.updateMany({
    where: { telegramId: state.telegramId },
    data,
  });
  const player = updated.count > 0 ? await prisma.player.findUnique({ where: { telegramId: state.telegramId } }) : null;
  if (!player) {
    onboarding.delete(state.telegramId);
    await ctx.reply("Персонажа вже немає. Напиши /start, щоб почати онбордінґ знову.");
    return;
  }

  onboarding.delete(state.telegramId);

  if (ctx.chat?.id) await syncChatBotCommandsForTelegramId(ctx.api, ctx.chat.id, state.telegramId);

  const dream = await enterTutorialDream(player.id, { forceStart: true });
  await ctx.reply(
    `Готово. Чорноліс запам’ятав ім’я: ${player.nameNominative}.\n\n${renderCurrentWorldYearLine()}\n\nНаприклад: «Травник звертається до ${player.nameGenitive}» і «${player.nameVocative}, стежка чекає».\n\n${dream.text}`,
    {
      reply_markup: await buildMainReplyKeyboardForTelegramId(Number(state.telegramId), false),
    }
  );

  const view = await renderLocationBrief(dream.locationId, player.id);
  await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
}

async function handleOnboardingText(ctx: any) {
  const from = ctx.from;
  const text = ctx.message?.text;
  if (!from || !text) return false;

  const key = String(from.id);
  const state = onboarding.get(key);
  if (!state) return false;

  if (state.step === "name") {
    const validation = validateCustomCharacterName(text);
    if (!validation.ok) {
      await ctx.reply(`${validation.error}\n\nСпробуйте ще раз.`);
      return true;
    }

    const name = normalizeCharacterName(validation.value);
    const used = new Set(
      (await usedCharacterNames())
        .filter((usedName): usedName is string => Boolean(usedName))
        .map(normalizeNameForRegistry)
    );
    if (used.has(normalizeNameForRegistry(name))) {
      await ctx.reply("Таке ім'я вже є в літописі Порубіжжя. Оберіть інше або візьміть готове ім'я зі списку.");
      return true;
    }

    const gender = guessGenderFromPronoun(state.pronoun);
    const forms = guessNameForms(name, gender, "ANIMATE");
    state.name = name;
    state.script = validation.script;
    state.forms = forms;
    state.nameApproved = false;

    if (validation.script === "latin") {
      await finishOnboarding(ctx, state);
      return true;
    }

    state.step = "case";
    state.caseIndex = 0;
    onboarding.set(key, state);
    await ctx.reply(casePrompt(forms, 0));
    return true;
  }

  if (state.step === "nameChoice") {
    const normalized = text.trim().toLocaleLowerCase("uk-UA");
    if (["список", "обрати", "готове", "готові", "готове ім'я", "готові імена"].includes(normalized)) {
      await showPreparedNameChoices(ctx);
      return true;
    }
    if (["власне", "своє", "ввести", "власне ім'я", "своє ім'я"].includes(normalized)) {
      state.step = "name";
      onboarding.set(key, state);
      await ctx.reply(customNameWarningText());
      return true;
    }
    await ctx.reply("Оберіть один із варіантів нижче або напишіть «список» чи «власне ім'я».", {
      reply_markup: nameChoiceKeyboard(),
    });
    return true;
  }

  if (state.step === "case" && state.forms) {
    const index = state.caseIndex ?? 0;
    const prompt = CASE_PROMPTS[index];
    const value = text.trim() === "+" ? state.forms[prompt.key] : normalizeCharacterName(text);
    state.forms[prompt.key] = value;

    const next = index + 1;
    if (next >= CASE_PROMPTS.length) {
      await finishOnboarding(ctx, state);
      return true;
    }

    state.caseIndex = next;
    onboarding.set(key, state);
    await ctx.reply(casePrompt(state.forms, next));
    return true;
  }

  return false;
}

export function registerStartHandlers(bot: Bot) {
  setDefaultBotCommandsWithRetry(bot).catch((error) =>
    console.warn("Failed to set bot commands permanently:", error)
  );

  bot.command("start", async (ctx) => enterWorld(ctx, false));

  bot.callbackQuery(/^onboarding:pronoun:(HE|SHE|THEY)$/, async (ctx) => {
    const pronoun = ctx.match[1] as "HE" | "SHE" | "THEY";
    const key = String(ctx.from.id);
    onboarding.set(key, { step: "nameChoice", telegramId: key, pronoun });
    await ctx.answerCallbackQuery();
    await askNameChoice(ctx);
  });

  bot.callbackQuery(/^onboarding:nameChoice:(prepared|custom)$/, async (ctx) => {
    const key = String(ctx.from.id);
    const state = onboarding.get(key) ?? { step: "nameChoice" as const, telegramId: key, pronoun: "HE" as const };
    await ctx.answerCallbackQuery();

    if (ctx.match[1] === "prepared") {
      onboarding.set(key, { ...state, step: "nameChoice" });
      await showPreparedNameChoices(ctx);
      return;
    }

    onboarding.set(key, { ...state, step: "name" });
    await ctx.reply(customNameWarningText());
  });

  bot.callbackQuery(/^onboarding:name:([a-z0-9_-]+)$/, async (ctx) => {
    const key = String(ctx.from.id);
    const state = onboarding.get(key);
    const prepared = preparedNameByKey(ctx.match[1]);
    await ctx.answerCallbackQuery();

    if (!state || !prepared) {
      await ctx.reply("Це ім'я вже не доступне. Спробуйте обрати інше або введіть власне ім'я.");
      return;
    }

    const available = availablePreparedNames(await usedCharacterNames()).some((name) => name.key === prepared.key);
    if (!available) {
      await ctx.reply("Це ім'я вже зайняте або зарезервоване. Оберіть інше зі списку.");
      await showPreparedNameChoices(ctx);
      return;
    }

    state.name = prepared.forms.nominative;
    state.forms = prepared.forms;
    state.nameApproved = true;
    onboarding.set(key, state);
    await finishOnboarding(ctx, state);
  });

  bot.on("message:text", async (ctx, next) => {
    const handled = await handleOnboardingText(ctx);
    if (!handled) return next();
  });
}
