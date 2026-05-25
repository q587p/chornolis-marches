import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { getStartLocationId } from "../services/players";
import { renderLocationBrief } from "../services/locations";
import { buildMainReplyKeyboard, buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { guessGenderFromPronoun, guessNameForms, normalizeCharacterName, validateCharacterName, type NameForms } from "../services/grammar";
import { HELP_TEXT } from "./help";
import { BASE_STAMINA } from "../gameConfig";
import { renderCurrentWorldYearLine } from "../services/calendar";

const CASE_PROMPTS: Array<{ key: keyof NameForms; question: string; prefix?: string }> = [
  { key: "genitive", question: "Ім’я в родовому відмінку (Немає КОГО?)" },
  { key: "dative", question: "Ім’я в давальному відмінку (Даю КОМУ?)" },
  { key: "accusative", question: "Ім’я в знахідному відмінку (Бачу КОГО?)" },
  { key: "instrumental", question: "Ім’я в орудному відмінку (Пишаюся КИМ?)" },
  { key: "locative", question: "Ім’я в місцевому відмінку (Стою на КОМУ?)", prefix: "на " },
  { key: "vocative", question: "Ім’я в кличному відмінку (Звертання)" },
];

type OnboardingState = {
  step: "name" | "case";
  telegramId: string;
  pronoun: "HE" | "SHE" | "THEY";
  name?: string;
  script?: "cyrillic" | "latin";
  forms?: NameForms;
  caseIndex?: number;
};

const onboarding = new Map<string, OnboardingState>();

function pronounKeyboard() {
  return new InlineKeyboard()
    .text("Він", "onboarding:pronoun:HE")
    .text("Вона", "onboarding:pronoun:SHE")
    .text("Вони", "onboarding:pronoun:THEY");
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

async function enterWorld(ctx: any, isMenuRefresh = false) {
  const from = ctx.from;
  if (!from) return;

  const startLocationId = await getStartLocationId();

  const player = await prisma.player.upsert({
    where: { telegramId: String(from.id) },
    update: {
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      currentLocationId: startLocationId,
    },
    create: {
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
    onboarding.set(String(from.id), { step: "name", telegramId: String(from.id), pronoun: "HE" });
    await askOnboarding(ctx);
    return;
  }

  const view = await renderLocationBrief(startLocationId, player.id);
  const displayName = player.nameNominative ?? player.firstName ?? "мандрівнику";
  const yearLine = renderCurrentWorldYearLine();

  const text = isMenuRefresh
    ? `🌲 Меню оновлено.\n${yearLine}\n\nВітаю, ${displayName}.`
    : `🌲 Порубіжжя Чорнолісу ожили.\n${yearLine}\n\nВітаю, ${displayName}. Твій слід збережено в Чорнолісі.`;

  await ctx.reply(text, { reply_markup: await buildMainReplyKeyboardForTelegramId(from.id, false) });
  await ctx.reply(view.text, { parse_mode: "HTML", reply_markup: view.keyboard });
}

async function finishOnboarding(ctx: any, state: OnboardingState) {
  if (!state.name || !state.forms) return;
  const gender = guessGenderFromPronoun(state.pronoun);
  const startLocationId = await getStartLocationId();

  const player = await prisma.player.update({
    where: { telegramId: state.telegramId },
    data: {
      pronoun: state.pronoun,
      nameNominative: state.forms.nominative,
      nameGenitive: state.forms.genitive,
      nameDative: state.forms.dative,
      nameAccusative: state.forms.accusative,
      nameInstrumental: state.forms.instrumental,
      nameLocative: state.forms.locative,
      nameVocative: state.forms.vocative,
      grammaticalGender: gender,
      animacy: "ANIMATE",
      onboardingComplete: true,
      isNameApproved: false,
      stamina: BASE_STAMINA * 3,
      staminaMax: BASE_STAMINA,
      currentLocationId: startLocationId,
    },
  });

  onboarding.delete(state.telegramId);

  await ctx.reply(
    `Готово. Чорноліс запам’ятав ім’я: ${player.nameNominative}.\n\n${renderCurrentWorldYearLine()}\n\nНаприклад: «Травник звертається до ${player.nameGenitive}» і «${player.nameVocative}, стежка чекає».`,
    {
      reply_markup: await buildMainReplyKeyboardForTelegramId(Number(state.telegramId), false),
    }
  );

  await ctx.reply(HELP_TEXT, {
    parse_mode: "HTML",
    reply_markup: await buildMainReplyKeyboardForTelegramId(Number(state.telegramId), false),
  });

  const view = await renderLocationBrief(startLocationId, player.id);
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
    const validation = validateCharacterName(text);
    if (!validation.ok) {
      await ctx.reply(`${validation.error}\n\nСпробуйте ще раз.`);
      return true;
    }

    const name = normalizeCharacterName(validation.value);
    const gender = guessGenderFromPronoun(state.pronoun);
    const forms = guessNameForms(name, gender, "ANIMATE");
    state.name = name;
    state.script = validation.script;
    state.forms = forms;

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

async function setBotCommandsWithRetry(bot: Bot, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await bot.api.setMyCommands([
        { command: "start", description: "🌲 Перезапустити" },
        { command: "me", description: "🧍 Персонаж" },
        { command: "location", description: "👀 Озирнутися" },
        { command: "look", description: "👁 Роздивитися" },
        { command: "time", description: "🕯 Час Порубіжжя" },
        { command: "menu", description: "☰ Меню" },
        { command: "news", description: "📰 Останні новини світу" },
        { command: "stat", description: "Екологічна статистика світу" },
        { command: "help", description: "🧭 Допомога новачку" },
        { command: "adminHelp", description: "🛠 Адмінські команди" },
      ]);

      console.log("Telegram bot commands updated.");
      return;
    } catch (error) {
      console.warn(`Failed to set bot commands, attempt ${i}/${attempts}:`, error);
      await new Promise((resolve) => setTimeout(resolve, i * 3000));
    }
  }
}

export function registerStartHandlers(bot: Bot) {
  setBotCommandsWithRetry(bot).catch((error) =>
    console.warn("Failed to set bot commands permanently:", error)
  );

  bot.command("start", async (ctx) => enterWorld(ctx, false));

  bot.callbackQuery(/^onboarding:pronoun:(HE|SHE|THEY)$/, async (ctx) => {
    const pronoun = ctx.match[1] as "HE" | "SHE" | "THEY";
    const key = String(ctx.from.id);
    onboarding.set(key, { step: "name", telegramId: key, pronoun });
    await ctx.answerCallbackQuery();
    await ctx.reply("Як вас зватимуть у Чорнолісі?\n\nДозволені кирилиця або латинка, без змішування абеток, emoji та невидимих символів.");
  });

  bot.on("message:text", async (ctx, next) => {
    const handled = await handleOnboardingText(ctx);
    if (!handled) return next();
  });
}
