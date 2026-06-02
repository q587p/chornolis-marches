import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { prisma } from "../db";
import { getStartLocationId } from "../services/players";
import { renderLocationBrief } from "../services/locations";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { guessGenderFromPronoun, guessNameForms, normalizeCharacterName, type NameForms } from "../services/grammar";
import { BASE_STAMINA } from "../gameConfig";
import { renderWorldDreamDateLine } from "../services/calendar";
import { setDefaultBotCommandsWithRetry, syncChatBotCommandsForTelegramId } from "../services/telegramCommands";
import { recordNewPlayerChronicle } from "../services/chronicles";
import { enterTutorialDream, hasCompletedTutorial, isTutorialLocation } from "../services/tutorial";
import { getCurrentWorldTimeSnapshot } from "../services/worldTime";
import { escapeHtml } from "../utils/text";
import {
  availablePreparedNames,
  onboardingNameApprovalNote,
  customNameWarningText,
  normalizeNameForRegistry,
  onboardingNameChoiceTextIntent,
  paginatePreparedNames,
  preparedNameByKey,
  preparedNameCompactSummary,
  randomAvailablePreparedName,
  validateCustomCharacterName,
  type PreparedCharacterName,
} from "../services/characterNames";
import { disablePlayerAuto, requestOrEnablePlayerAuto, replyStopPlayerAuto } from "./auto";
import { submitBuildCampfire, submitDismantleCampfire, submitDismantleTotem, submitDouseCampfire, submitLightCampfire, submitSay, submitTrack, submitYell } from "./aliases";
import { sendHelp } from "./help";
import { sendNews } from "./news";
import { parseStartActionPayload, type StartActionPayload } from "../input/startPayloads";
import { runExamineCurrentLocation } from "./look";
import { showCharacter, showInventory, showLocationForPlayer } from "./player";
import { showTime, showWeather } from "./time";
import { grantStarterKnifeIfMissing } from "../services/weapons";

type NameFormPrompt = { key: keyof NameForms; question: string; button: string; prefix?: string };
const CASE_BUTTON_LABELS: Partial<Record<keyof NameForms, string>> = {
  genitive: "Родовий",
  dative: "Давальний",
  accusative: "Знахідний",
  instrumental: "Орудний",
  locative: "Місцевий",
  vocative: "Кличний",
};

const CASE_PROMPTS = ([
  { key: "genitive", question: "Ім’я в родовому відмінку (Немає КОГО?)" },
  { key: "dative", question: "Ім’я в давальному відмінку (Даю КОМУ?)" },
  { key: "accusative", question: "Ім’я в знахідному відмінку (Бачу КОГО?)" },
  { key: "instrumental", question: "Ім’я в орудному відмінку (Пишаюся КИМ?)" },
  { key: "locative", question: "Ім’я в місцевому відмінку (Стою на КОМУ?)", prefix: "на " },
  { key: "vocative", question: "Ім’я в кличному відмінку (Звертання)" },
] satisfies Array<Omit<NameFormPrompt, "button">>).map((prompt) => ({
  ...prompt,
  button: CASE_BUTTON_LABELS[prompt.key] ?? prompt.question,
}));
const NAME_FORM_REVIEW_PROMPTS: NameFormPrompt[] = [
  { key: "nominative", question: "Ім’я в називному відмінку (Звати мене ЯК?)", button: "Називний" },
  ...CASE_PROMPTS,
];
const CASE_CONFIRM_BUTTON = "+ (далі)";

type OnboardingState = {
  step: "pronoun" | "nameChoice" | "name" | "case" | "caseReview" | "caseEdit";
  telegramId: string;
  pronoun: "HE" | "SHE" | "THEY";
  name?: string;
  script?: "cyrillic" | "latin-translit";
  forms?: NameForms;
  caseIndex?: number;
  editCaseKey?: keyof NameForms;
  nameApproved?: boolean;
};

const onboarding = new Map<string, OnboardingState>();
const HTML_OPTIONS = { parse_mode: "HTML" as const };

export function clearOnboardingStateForTelegramId(telegramId: number | string) {
  return onboarding.delete(String(telegramId));
}

function pronounKeyboard() {
  return new InlineKeyboard()
    .text("Він", "onboarding:pronoun:HE")
    .text("Вона", "onboarding:pronoun:SHE")
    .text("Вони", "onboarding:pronoun:THEY");
}

function pronounFromText(text: string): OnboardingState["pronoun"] | null {
  const normalized = text.trim().toLocaleLowerCase("uk-UA");
  if (["він", "he"].includes(normalized)) return "HE";
  if (["вона", "she"].includes(normalized)) return "SHE";
  if (["вони", "they"].includes(normalized)) return "THEY";
  return null;
}

function nameChoiceKeyboard() {
  return new InlineKeyboard()
    .text("Обрати ім'я зі списку", "onboarding:nameChoice:prepared")
    .row()
    .text("Випадкове ім'я", "onboarding:nameChoice:random")
    .row()
    .text("Ввести власне ім'я", "onboarding:nameChoice:custom");
}

function preparedNamesKeyboard(names: PreparedCharacterName[], page: number) {
  const pageData = paginatePreparedNames(names, page);
  const keyboard = new InlineKeyboard();

  for (const name of pageData.items) {
    keyboard.text(name.forms.nominative, `onboarding:name:${name.key}`).row();
  }

  if (pageData.hasPrevious || pageData.hasNext) {
    if (pageData.hasPrevious) keyboard.text("◀ Назад", `onboarding:preparedPage:${pageData.page - 1}`);
    keyboard.text(`${pageData.page + 1}/${pageData.pageCount}`, "onboarding:preparedPageInfo");
    if (pageData.hasNext) keyboard.text("Далі ▶", `onboarding:preparedPage:${pageData.page + 1}`);
    keyboard.row();
  }

  keyboard.text("Випадкове ім'я", "onboarding:nameChoice:random").row();
  keyboard.text("Ввести власне ім'я", "onboarding:nameChoice:custom");
  return keyboard;
}

function preparedNamesText(names: PreparedCharacterName[], page: number) {
  const pageData = paginatePreparedNames(names, page);
  return [
    "Писарі вже перевірили ці імена, їхні відмінки й відповідність Порубіжжю.",
    "",
    `Сторінка ${pageData.page + 1}/${pageData.pageCount}:`,
    ...pageData.items.map(preparedNameCompactSummary),
    "",
    "Можна гортати список, взяти випадкове ім'я або ввести власне.",
  ].join("\n");
}

function casePrompt(forms: NameForms, index: number) {
  const prompt = CASE_PROMPTS[index];
  const suggested = forms[prompt.key];
  const prefix = prompt.prefix ?? "";
  return `${prompt.question}\n${prefix}[${suggested}]\n\nНадішліть правильну форму або натисніть ${CASE_CONFIRM_BUTTON}, щоб залишити запропоновану.`;
}

function casePromptReplyMarkup() {
  return new Keyboard()
    .text(CASE_CONFIRM_BUTTON)
    .resized()
    .oneTime()
    .persistent(false);
}

function renderNameFormsReview(forms: NameForms) {
  return [
    "Перевірте, як Писарі запишуть ім’я:",
    "",
    ...NAME_FORM_REVIEW_PROMPTS.map((prompt) =>
      `${prompt.question} — ${prompt.prefix ?? ""}${forms[prompt.key]}`
    ),
    "",
    "Якщо все добре, підтвердьте. Якщо ні — виправте конкретний відмінок або почніть ім’я заново.",
  ].join("\n");
}

function nameFormsReviewKeyboard() {
  const keyboard = new InlineKeyboard()
    .text("✅ Підтвердити ім’я", "onboarding:cases:confirm")
    .row();

  NAME_FORM_REVIEW_PROMPTS.forEach((prompt, index) => {
    keyboard.text(`✏️ ${prompt.button}`, `onboarding:cases:edit:${prompt.key}`);
    if (index % 2 === 1) keyboard.row();
  });

  keyboard.row().text("🔄 Ім’я заново", "onboarding:cases:restart");
  return keyboard;
}

function nameFormPromptByKey(key: keyof NameForms) {
  return NAME_FORM_REVIEW_PROMPTS.find((prompt) => prompt.key === key);
}

function isNameFormKey(value: string): value is keyof NameForms {
  return NAME_FORM_REVIEW_PROMPTS.some((prompt) => prompt.key === value);
}

function caseEditPrompt(forms: NameForms, key: keyof NameForms) {
  const prompt = nameFormPromptByKey(key);
  if (!prompt) return "Надішліть нову форму імені.";
  return [
    "Виправте форму імені:",
    "",
    prompt.question,
    `Зараз: ${prompt.prefix ?? ""}${forms[key]}`,
    "",
    "Надішліть нову форму одним повідомленням.",
  ].join("\n");
}

async function showNameFormsReview(ctx: any, state: OnboardingState) {
  if (!state.forms) return;
  state.step = "caseReview";
  delete state.caseIndex;
  delete state.editCaseKey;
  onboarding.set(state.telegramId, state);
  await ctx.reply(renderNameFormsReview(state.forms), { reply_markup: nameFormsReviewKeyboard() });
}

function samplePreparedNameExamples(names: Array<{ forms: NameForms }>, count = 3) {
  const pool = [...names];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, count).map((name) => name.forms.nominative);
}

function findPreparedNameByNominative(names: Array<{ forms: NameForms }>, name: string) {
  const normalized = normalizeNameForRegistry(name);
  return names.find((prepared) => normalizeNameForRegistry(prepared.forms.nominative) === normalized) ?? null;
}

async function customNamePromptText(state: Pick<OnboardingState, "telegramId" | "pronoun">) {
  const names = availablePreparedNames(await usedCharacterNames({ exceptTelegramId: state.telegramId }), {
    suggestedGender: guessGenderFromPronoun(state.pronoun),
  });
  return customNameWarningText({ examples: samplePreparedNameExamples(names) });
}

async function askOnboarding(ctx: any) {
  await ctx.reply("Ваші займенники:", { reply_markup: pronounKeyboard() });
}

async function usedCharacterNames(options: { exceptTelegramId?: string } = {}) {
  const [players, creatures] = await Promise.all([
    prisma.player.findMany({
      where: {
        nameNominative: { not: null },
        ...(options.exceptTelegramId ? { telegramId: { not: options.exceptTelegramId } } : {}),
      },
      select: { nameNominative: true },
    }),
    prisma.creature.findMany({
      where: { name: { not: null } },
      select: { name: true },
    }),
  ]);
  return [
    ...players.map((player) => player.nameNominative),
    ...creatures.map((creature) => creature.name),
  ];
}

async function isCharacterNameAvailable(name: string, exceptTelegramId?: string) {
  const used = new Set(
    (await usedCharacterNames({ exceptTelegramId }))
      .filter((usedName): usedName is string => Boolean(usedName))
      .map(normalizeNameForRegistry)
  );
  return !used.has(normalizeNameForRegistry(name));
}

async function askNameChoice(ctx: any) {
  await ctx.reply(
    "Як вас зватимуть у Порубіжжі?\n\nМожна взяти ім'я зі списку, дозволити Писарям витягти випадкове або ввести власне.",
    { reply_markup: nameChoiceKeyboard() }
  );
}

function renderOnboardingNameConfirmation(player: {
  nameNominative: string | null;
  nameGenitive: string | null;
  nameVocative: string | null;
  isNameApproved: boolean;
}) {
  const name = player.nameNominative ?? "мандрівнику";
  const genitive = player.nameGenitive ?? name;
  const vocative = player.nameVocative ?? name;
  return `Готово. Порубіжжя запам’ятало ім’я: <b>${escapeHtml(name)}</b>.\n${escapeHtml(onboardingNameApprovalNote(player.isNameApproved))}\n\nНаприклад: «Травник звертається до <b>${escapeHtml(genitive)}</b>» і «<b>${escapeHtml(vocative)}</b>, стежка чекає».`;
}

async function currentWorldDreamDateLine() {
  const snapshot = await getCurrentWorldTimeSnapshot();
  return renderWorldDreamDateLine(snapshot);
}

function renderOnboardingDateHint(dateLine: string) {
  return `Крук озивається з темного гілля:\n<blockquote>${escapeHtml(`Зараз ${dateLine} Але тобі це, мабуть, поки нічого не каже.`)}</blockquote>`;
}

async function isStaleOnboardingCallback(ctx: any) {
  const player = await prisma.player.findUnique({
    where: { telegramId: String(ctx.from.id) },
    select: { onboardingComplete: true },
  });
  if (!player?.onboardingComplete) return false;

  onboarding.delete(String(ctx.from.id));
  await ctx.answerCallbackQuery({
    text: "Ім’я вже обрано. Якщо справді треба почати заново, використайте /restart.",
    show_alert: true,
  });
  return true;
}

async function showPreparedNameChoices(ctx: any, pronoun: OnboardingState["pronoun"], page = 0, edit = false) {
  const names = availablePreparedNames(await usedCharacterNames(), { suggestedGender: guessGenderFromPronoun(pronoun) });
  if (names.length === 0) {
    await ctx.reply(`Усі підготовлені імена вже зайняті або зарезервовані.\n\n${customNameWarningText()}`, HTML_OPTIONS);
    return;
  }

  const pageData = paginatePreparedNames(names, page);
  const message = preparedNamesText(names, pageData.page);
  const replyMarkup = preparedNamesKeyboard(names, pageData.page);

  if (edit && ctx.callbackQuery?.message) {
    try {
      await ctx.editMessageText(message, { reply_markup: replyMarkup });
      return;
    } catch {
      // Telegram can reject edits for stale or unchanged messages; replying keeps onboarding moving.
    }
  }

  await ctx.reply(message, { reply_markup: replyMarkup });
}

async function enterWorld(ctx: any, isMenuRefresh = false) {
  const from = ctx.from;
  if (!from) return;

  const existing = await prisma.player.findUnique({ where: { telegramId: String(from.id) } });
  const startLocationId = existing?.onboardingComplete ? await getStartLocationId() : null;
  const player = existing
    ? await prisma.player.update({
        where: { id: existing.id },
        data: {
          username: from.username ?? null,
          firstName: from.first_name ?? null,
          lastName: from.last_name ?? null,
          currentLocationId: existing.onboardingComplete ? existing.currentLocationId ?? startLocationId : null,
        },
      })
    : await prisma.player.create({
        data: {
          telegramId: String(from.id),
          username: from.username ?? null,
          firstName: from.first_name ?? null,
          lastName: from.last_name ?? null,
          currentLocationId: null,
          stamina: BASE_STAMINA * 3,
          staminaMax: BASE_STAMINA,
        },
      });

  if (!player.onboardingComplete) {
    onboarding.set(String(from.id), { step: "pronoun", telegramId: String(from.id), pronoun: "HE" });
    await askOnboarding(ctx);
    return;
  }

  if (ctx.chat?.id) await syncChatBotCommandsForTelegramId(ctx.api, ctx.chat.id, from.id);

  const displayName = player.nameNominative ?? player.firstName ?? "мандрівнику";
  const dateLine = await currentWorldDreamDateLine();
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
    ? `🌲 Меню оновлено.\n${dateLine}\n\nВітаю, ${displayName}.\n\n${keyboardHint}`
    : `🌲 Порубіжжя Чорнолісу ожили.\n${dateLine}\n\nВітаю, ${displayName}. Твій слід збережено в Чорнолісі.\n\n${keyboardHint}`;

  await ctx.reply(text, { reply_markup: await buildMainReplyKeyboardForTelegramId(from.id, false) });
}

async function finishOnboarding(ctx: any, state: OnboardingState) {
  if (!state.name || !state.forms) return;
  const available = await isCharacterNameAvailable(state.forms.nominative, state.telegramId);
  if (!available) {
    onboarding.set(state.telegramId, { step: "nameChoice", telegramId: state.telegramId, pronoun: state.pronoun });
    await ctx.reply(
      "Це ім'я вже встигли взяти. Оберіть інше зі списку, натисніть «Випадкове ім'я» або введіть власне.",
      { reply_markup: nameChoiceKeyboard() }
    );
    return;
  }

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
    lastPassiveHungerAtMinute: null,
    currentLocationId: startLocationId,
  };

  const updated = await prisma.player.updateMany({
    where: { telegramId: state.telegramId },
    data,
  });
  const player = updated.count > 0 ? await prisma.player.findUnique({ where: { telegramId: state.telegramId } }) : null;
  if (!player) {
    onboarding.delete(state.telegramId);
    await ctx.reply("Персонажа вже немає. Напиши /start, щоб почати шлях знову.");
    return;
  }

  onboarding.delete(state.telegramId);

  if (ctx.chat?.id) await syncChatBotCommandsForTelegramId(ctx.api, ctx.chat.id, state.telegramId);

  await disablePlayerAuto(Number(state.telegramId));
  await grantStarterKnifeIfMissing(player.id);
  await recordNewPlayerChronicle(player).catch((error) => console.warn("Failed to record new-player chronicle:", error));
  const dream = await enterTutorialDream(player.id, { forceStart: true });
  await ctx.reply(renderOnboardingNameConfirmation(player), HTML_OPTIONS);
  await ctx.reply(dream.text, {
    reply_markup: await buildMainReplyKeyboardForTelegramId(Number(state.telegramId), false),
  });
  await ctx.reply(renderOnboardingDateHint(await currentWorldDreamDateLine()), HTML_OPTIONS);

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

  if (/^\/(?:start|restart)\b/i.test(text.trim())) return false;

  if (text.trim().startsWith("/")) {
    await ctx.reply("Спершу завершимо знайомство: оберіть займенники або ім'я в повідомленні вище.");
    return true;
  }

  if (state.step === "pronoun") {
    const pronoun = pronounFromText(text);
    if (!pronoun) {
      await ctx.reply("Оберіть займенники кнопкою або напишіть: він, вона чи вони.", { reply_markup: pronounKeyboard() });
      return true;
    }

    state.pronoun = pronoun;
    state.step = "nameChoice";
    onboarding.set(key, state);
    await askNameChoice(ctx);
    return true;
  }

  if (state.step === "name") {
    const validation = validateCustomCharacterName(text);
    if (!validation.ok) {
      await ctx.reply(`${validation.error}\n\nСпробуйте ще раз.`);
      return true;
    }

    const name = normalizeCharacterName(validation.value);
    const usedNames = await usedCharacterNames({ exceptTelegramId: key });
    const availablePrepared = availablePreparedNames(usedNames, { suggestedGender: guessGenderFromPronoun(state.pronoun) });
    const prepared = findPreparedNameByNominative(availablePrepared, name);
    if (prepared) {
      state.name = prepared.forms.nominative;
      state.forms = prepared.forms;
      state.nameApproved = true;
      onboarding.set(key, state);
      await finishOnboarding(ctx, state);
      return true;
    }

    if (usedNames.some((usedName) => usedName && normalizeNameForRegistry(usedName) === normalizeNameForRegistry(name))) {
      await ctx.reply("Таке ім'я вже є в літописі Порубіжжя. Оберіть інше або візьміть готове ім'я зі списку.");
      return true;
    }

    const gender = guessGenderFromPronoun(state.pronoun);
    const forms = guessNameForms(name, gender, "ANIMATE");
    state.name = name;
    state.script = validation.script;
    state.forms = forms;
    state.nameApproved = false;

    state.step = "case";
    state.caseIndex = 0;
    onboarding.set(key, state);
    if (validation.script === "latin-translit") {
      await ctx.reply(`Писарі записали трансліт кирилицею: ${name}.`);
    }
    await ctx.reply(casePrompt(forms, 0), { reply_markup: casePromptReplyMarkup() });
    return true;
  }

  if (state.step === "nameChoice") {
    const intent = onboardingNameChoiceTextIntent(text);
    if (!intent) {
      await ctx.reply("Оберіть один із варіантів нижче або напишіть ім'я, яке хочете носити.", {
        reply_markup: nameChoiceKeyboard(),
      });
      return true;
    }
    if (intent === "prepared") {
      await showPreparedNameChoices(ctx, state.pronoun);
      return true;
    }
    if (intent === "random") {
      const prepared = randomAvailablePreparedName(await usedCharacterNames(), { suggestedGender: guessGenderFromPronoun(state.pronoun) });
      if (!prepared) {
        await ctx.reply(`Усі підготовлені імена для цього вибору вже зайняті або зарезервовані.\n\n${await customNamePromptText(state)}`, HTML_OPTIONS);
        return true;
      }
      state.name = prepared.forms.nominative;
      state.forms = prepared.forms;
      state.nameApproved = true;
      onboarding.set(key, state);
      await finishOnboarding(ctx, state);
      return true;
    }
    if (intent === "customPrompt") {
      state.step = "name";
      onboarding.set(key, state);
      await ctx.reply(await customNamePromptText(state), HTML_OPTIONS);
      return true;
    }

    state.step = "name";
    onboarding.set(key, state);
    return handleOnboardingText(ctx);
  }

  if (state.step === "case" && state.forms) {
    const index = state.caseIndex ?? 0;
    const prompt = CASE_PROMPTS[index];
    const trimmed = text.trim();
    const value = trimmed === "+" || trimmed === CASE_CONFIRM_BUTTON
      ? state.forms[prompt.key]
      : normalizeCharacterName(text);
    state.forms[prompt.key] = value;

    const next = index + 1;
    if (next >= CASE_PROMPTS.length) {
      await showNameFormsReview(ctx, state);
      return true;
    }

    state.caseIndex = next;
    onboarding.set(key, state);
    await ctx.reply(casePrompt(state.forms, next), { reply_markup: casePromptReplyMarkup() });
    return true;
  }

  if (state.step === "caseEdit" && state.forms && state.editCaseKey) {
    state.forms[state.editCaseKey] = normalizeCharacterName(text);
    await showNameFormsReview(ctx, state);
    return true;
  }

  if (state.step === "caseReview" && state.forms) {
    await ctx.reply(renderNameFormsReview(state.forms), { reply_markup: nameFormsReviewKeyboard() });
    return true;
  }

  return false;
}

type StartPayloadPlayer = {
  id: number;
  onboardingComplete: boolean;
  currentLocationId: number | null;
};

async function canRunStartPayloadAction(player: StartPayloadPlayer) {
  if (!player.onboardingComplete || !player.currentLocationId) return false;

  const [tutorialCompleted, currentLocation] = await Promise.all([
    hasCompletedTutorial(player.id),
    prisma.cellLocation.findUnique({
      where: { id: player.currentLocationId },
      select: {
        key: true,
        z: true,
        region: { select: { key: true } },
      },
    }),
  ]);

  if (!tutorialCompleted) return false;
  return currentLocation ? !isTutorialLocation(currentLocation) : false;
}

async function runStartPayloadAction(bot: Bot, ctx: any, action: StartActionPayload) {
  const from = ctx.from;
  if (!from) return false;

  const player = await prisma.player.findUnique({
    where: { telegramId: String(from.id) },
    select: { id: true, onboardingComplete: true, currentLocationId: true },
  });
  if (!player || !(await canRunStartPayloadAction(player))) return false;

  if (action === "look") {
    await showLocationForPlayer(from.id, (text, options) => ctx.reply(text, options));
    return true;
  }

  if (action === "examine") {
    await runExamineCurrentLocation(ctx, "");
    return true;
  }

  if (action === "news") {
    await sendNews(ctx);
    return true;
  }

  if (action === "auto") {
    await requestOrEnablePlayerAuto(bot, ctx);
    return true;
  }

  if (action === "autoStop") {
    await replyStopPlayerAuto(ctx);
    return true;
  }

  if (action === "me") {
    await showCharacter(from.id, (text, options) => ctx.reply(text, options));
    return true;
  }

  if (action === "help") {
    await sendHelp(ctx);
    return true;
  }

  if (action === "track") {
    await submitTrack(bot, ctx);
    return true;
  }

  if (action === "time") {
    await showTime(ctx);
    return true;
  }

  if (action === "weather") {
    await showWeather(ctx);
    return true;
  }

  if (action === "inventory") {
    await showInventory(from.id, (text, options) => ctx.reply(text, options));
    return true;
  }

  if (action === "say") {
    await submitSay(bot, ctx, "");
    return true;
  }

  if (action === "yell") {
    await submitYell(bot, ctx, "");
    return true;
  }

  if (action === "buildCampfire") {
    await submitBuildCampfire(bot, ctx);
    return true;
  }

  if (action === "lightCampfire") {
    await submitLightCampfire(bot, ctx);
    return true;
  }

  if (action === "douseCampfire") {
    await submitDouseCampfire(bot, ctx);
    return true;
  }

  if (action === "dismantleCampfire") {
    await submitDismantleCampfire(bot, ctx);
    return true;
  }

  if (action === "dismantleTotem") {
    await submitDismantleTotem(bot, ctx);
    return true;
  }

  return false;
}

async function handleStartCommand(bot: Bot, ctx: any) {
  const action = parseStartActionPayload(ctx.match);
  if (action && (await runStartPayloadAction(bot, ctx, action))) return;

  await enterWorld(ctx, false);
}

export function registerStartHandlers(bot: Bot) {
  setDefaultBotCommandsWithRetry(bot).catch((error) =>
    console.warn("Failed to set bot commands permanently:", error)
  );

  bot.command("start", async (ctx) => handleStartCommand(bot, ctx));
  bot.hears(/^start$/i, async (ctx) => enterWorld(ctx, false));

  bot.callbackQuery(/^onboarding:pronoun:(HE|SHE|THEY)$/, async (ctx) => {
    if (await isStaleOnboardingCallback(ctx)) return;
    const pronoun = ctx.match[1] as "HE" | "SHE" | "THEY";
    const key = String(ctx.from.id);
    onboarding.set(key, { step: "nameChoice", telegramId: key, pronoun });
    await ctx.answerCallbackQuery();
    await askNameChoice(ctx);
  });

  bot.callbackQuery(/^onboarding:nameChoice:(prepared|custom|random)$/, async (ctx) => {
    if (await isStaleOnboardingCallback(ctx)) return;
    const key = String(ctx.from.id);
    const state: OnboardingState = onboarding.get(key) ?? { step: "nameChoice", telegramId: key, pronoun: "HE" };
    const choice = ctx.match[1];
    await ctx.answerCallbackQuery();

    if (choice === "prepared") {
      onboarding.set(key, { ...state, step: "nameChoice" });
      await showPreparedNameChoices(ctx, state.pronoun);
      return;
    }

    if (choice === "random") {
      const prepared = randomAvailablePreparedName(await usedCharacterNames(), { suggestedGender: guessGenderFromPronoun(state.pronoun) });
      if (!prepared) {
        await ctx.reply(`Усі підготовлені імена для цього вибору вже зайняті або зарезервовані.\n\n${await customNamePromptText(state)}`, HTML_OPTIONS);
        return;
      }

      state.name = prepared.forms.nominative;
      state.forms = prepared.forms;
      state.nameApproved = true;
      onboarding.set(key, state);
      await finishOnboarding(ctx, state);
      return;
    }

    onboarding.set(key, { ...state, step: "name" });
    await ctx.reply(await customNamePromptText({ ...state, telegramId: key }), HTML_OPTIONS);
  });

  bot.callbackQuery(/^onboarding:preparedPage:(\d+)$/, async (ctx) => {
    if (await isStaleOnboardingCallback(ctx)) return;
    const key = String(ctx.from.id);
    const state = onboarding.get(key);
    await ctx.answerCallbackQuery();

    if (!state) {
      await ctx.reply("Не бачу, для кого гортати імена. Напишіть /start, щоб почати шлях знову.");
      return;
    }

    await showPreparedNameChoices(ctx, state.pronoun, Number(ctx.match[1]), true);
  });

  bot.callbackQuery("onboarding:preparedPageInfo", async (ctx) => {
    await ctx.answerCallbackQuery({ text: "Це поточна сторінка списку." });
  });

  bot.callbackQuery(/^onboarding:cases:(confirm|restart|edit:([a-z]+))$/, async (ctx) => {
    if (await isStaleOnboardingCallback(ctx)) return;
    const key = String(ctx.from.id);
    const state = onboarding.get(key);
    const action = ctx.match[1];
    const editKey = ctx.match[2];
    await ctx.answerCallbackQuery();

    if (!state?.forms) {
      await ctx.reply("Не бачу відмінків для перевірки. Напишіть /start, щоб почати шлях знову.");
      return;
    }

    if (action === "confirm") {
      await finishOnboarding(ctx, state);
      return;
    }

    if (action === "restart") {
      onboarding.set(key, { step: "name", telegramId: key, pronoun: state.pronoun });
      await ctx.reply(`Добре, введіть ім’я заново.\n\n${await customNamePromptText({ telegramId: key, pronoun: state.pronoun })}`, HTML_OPTIONS);
      return;
    }

    if (!editKey || !isNameFormKey(editKey)) {
      await ctx.reply("Не впізнаю цей відмінок. Спробуйте вибрати кнопку ще раз.");
      return;
    }

    state.step = "caseEdit";
    state.editCaseKey = editKey;
    onboarding.set(key, state);
    await ctx.reply(caseEditPrompt(state.forms, editKey));
  });

  bot.callbackQuery(/^onboarding:name:([a-z0-9_-]+)$/, async (ctx) => {
    if (await isStaleOnboardingCallback(ctx)) return;
    const key = String(ctx.from.id);
    const state = onboarding.get(key);
    const prepared = preparedNameByKey(ctx.match[1]);
    await ctx.answerCallbackQuery();

    if (!state || !prepared) {
      await ctx.reply("Це ім'я вже не доступне. Спробуйте обрати інше або введіть власне ім'я.");
      return;
    }

    const available = availablePreparedNames(await usedCharacterNames(), { suggestedGender: guessGenderFromPronoun(state.pronoun) }).some((name) => name.key === prepared.key);
    if (!available) {
      await ctx.reply("Це ім'я вже зайняте або зарезервоване. Оберіть інше зі списку.");
      await showPreparedNameChoices(ctx, state.pronoun);
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
