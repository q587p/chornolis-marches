import { Bot, InlineKeyboard } from "grammy";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { isPlayerAutoEnabled } from "./auto";
import { getPlayerByTelegramId } from "../services/players";
import { hasCompletedTutorial } from "../services/tutorial";
import { safeAnswerCallbackQuery } from "../utils/telegram";

export const HELP_TEXT = [
  "🧭 <b>Що робити в Порубіжжі Чорнолісу</b>",
  "",
  "<b>Перші кроки</b>",
  "1. Натисніть 👀 Озирнутися, щоб згадати, де ви стоїте.",
  "2. Натисніть 🔎 Роздивитися в картці місцини, щоб побачити ресурси, істот, трупи й сліди руху.",
  "3. Оберіть напрямок або команду /north, /south, /west, /east. Коротко: /n, /s, /w, /e.",
  "4. Якщо бачите ягоди, гриби чи лікарські трави — спробуйте /gather або кнопку 🌿 Зібрати.",
  "5. У Речах ягоди трохи повертають снагу й ледь вгамовують голод, гриби вгамовують голод, лікарські трави можна прикласти при пораненні, а факел — запалити, якщо поруч є вогонь.",
  "6. Коли втомилися або поранені — /rest чи кнопку 🧘 Відпочити.",
  "",
  "<b>Корисні команди</b>",
  "• /me — стан персонажа, життя, снагу, голод, речі і статистика.",
  "• /inventory — відкрити Речі; там можна з'їсти, використати, роздивитися або викинути наявні речі.",
  "• /look — озирнутися в поточній місцині. Також працюють текстові «див» і «дивитися».",
  "• /glance — короткий огляд без повного опису місцини. Також працює «глянути швидко».",
  "• /exits — лише видимі виходи з місцини. Також працюють «виходи» і «куди можна йти».",
  "• /examine — роздивитися уважніше. Також працюють текстові «спостерігати» й «поспостерігати».",
  "• /examine grass — оцінити виснажену траву, якщо така особливість є в місцині.",
  "• /queue — поточний план дій.",
  "• /queue cancel — скасувати поточну дію.",
  "• /queue clear — очистити чергу.",
  "• /track — пошукати свіжі сліди поруч.",
  "• /say текст — сказати щось у місцині. Також працюють «сказати», «говорити», «ск», «сказ» і «гов».",
  "• Сигнали — після Роздивитися оберіть персонажа чи істоту, щоб кивнути, помахати, вклонитися або подати інший короткий жест.",
  "• /news — остання новина й заголовки попередніх.",
  "• /who — хто був активний за останню реальну годину.",
  "• /time — поточний календарний відгук світу.",
  "• /sleep tutorial — повернутися до навчального сну. Поки навчання не завершене, /sleep також веде туди; у /me видно, якщо навчальний сон ще не пройдено.",
  "• /wake або Прокинутися — вийти з навчального сну.",
  "• /help — показати цю підказку знову.",
  "",
  "<b>Важливе</b>",
  "• Якщо життя падає до 0, персонаж непритомніє: черга очищається, починається відпочинок, а інші дії тимчасово недоступні.",
  "• Коли життя підніметься хоча б до 1, дії знову доступні, але персонаж лишається дуже слабким.",
  "• Голод уже нагадує про себе після виснажливих дій, але поки не карає окремими штрафами. Їжа допомагає триматися бадьоріше.",
].join("\n");

export const COMMANDS_TEXT_PAGES = [
  [
    "🧾 Команди Порубіжжя",
    "",
    "Цей список прихований від основного меню, але корисний для перевірки текстових команд, аліасів і майбутніх MUD-клієнтів.",
    "",
    "Зараз працює:",
    "",
    "Рух:",
    "• /look, look, див, дивитися — озирнутися в місцині.",
    "• /examine, examine, x, роздивитися, придивитися — уважніший огляд місцини, предмета, істоти або особливості.",
    "• /north /south /west /east, /n /s /w /e, пн/пд/сх/зх — рух сторонами світу.",
    "• /inside /in /enter, enter bushes, вср, всередину, увійти в кущі — увійти в доступний внутрішній прохід.",
    "• /outside /out /leave, leave cave, наз, назовні, вийти з кущів — вийти назовні.",
    "• go north, йти на південь, рушити на захід — природні фрази руху.",
    "",
    "Огляд і місцевість:",
    "• /glance, glance, глянути швидко, швидко глянути — короткий огляд без повного опису місцини.",
    "• /exits, exits, виходи, куди можна йти — лише видимі виходи з місцини, включно із замкненими видимими напрямками.",
    "• /track, сліди, відстежити — побачити свіжі сліди поруч.",
    "• /examine tracks, роздивитися сліди — уважніше роздивитися сліди.",
    "• /examine grass, оцінити траву — оглянути винищену траву, якщо вона є.",
    "• /examine sign, роздивитися знак — оглянути межовий знак, якщо він є.",
    "• look лавка, examine bushes, роздивитися кущі — огляд видимої особливості місцини.",
    "",
    "Персонаж і речі:",
    "• /me, персонаж, стан, хто я — картка персонажа.",
    "• /inventory, inv, речі — речі персонажа.",
    "• item ягоди, річ факел, inspect item herbs — оглянути річ у речах.",
    "• drop berries, викинути факел, кинути трави — викинути одну річ на землю.",
    "• get corpse, take twigs, підібрати хмиз, взяти факел — підібрати видиму річ із землі.",
    "• eat berries, з'їсти гриби, з'їсти лікарські трави, use herbs — з'їсти або використати їстівний/лікувальний запас.",
    "• light torch, запалити факел — запалити факел від вогнища або іншого запаленого факела.",
    "• douse torch, погасити факел, притушити факел — притушити запалений факел.",
    "• cook meat, підсмажити м'ясо — підсмажити сире м'ясо біля вогнища.",
    "• eat cooked meat, з'їсти м'ясо — з'їсти смажене м'ясо.",
  ].join("\n"),
  [
    "🧾 Команди Порубіжжя, сторінка 2",
    "",
    "Дії:",
    "• /gather, gather herbs, збирати ягоди, шукати гриби — збір ресурсу місцини з витратою часу й снаги.",
    "• /rest, відпочити, сісти, присісти — коротко сісти й відпочити.",
    "• /queue, черга, план — переглянути план дій.",
    "• /queue cancel, stop, скасувати дію — скасувати поточну дію.",
    "• /queue clear, очистити чергу — очистити чергу.",
    "• /auto, авто, увімкнути авто — увімкнути самостійні дії.",
    "• /autoStop, зупинити авто — вимкнути самостійні дії.",
    "• /sleep tutorial, навчальний сон — повернутися до навчального сну.",
    "• /wake, wake, прокинутися — вийти з навчального сну.",
    "• /say текст, сказати текст, ск текст, гов текст — сказати щось поруч.",
    "• /say Відчинитися, Відчинись будь ласка — у навчальному сні може відчинити Браму Сну.",
    "• whisper Данило текст, шепнути 1 текст — прошепотіти видимому персонажу поруч.",
    "• reply текст, відповісти текст — відповісти тому, хто останнім звернувся до вас у цій місцині.",
    "• shout текст, гукнути текст, крикнути текст — гукнути ширше, в межах регіону.",
    "• attack rabbit, fight wolf, kill wolf, kick rabbit, бити мишу — атакувати видиму ціль.",
    "• freshen corpse, butcher corpse, освіжити труп, розібрати труп — обробити свіжий труп і здобути м'ясо.",
    "",
    "Соціальні сигнали:",
    "• smile, усміхнутися; nod, кивнути; bow, вклонитися; wave, помахати.",
    "• laugh, засміятися; sigh, зітхнути; point, вказати; glare, насупитися.",
    "• Сигнал можна спрямувати на видиму ціль: кивнути 1, wave Здравомир.",
    "",
    "Інформація:",
    "• /help, допомога — коротка допомога.",
    "• /commands — цей повніший прихований список.",
    "• /menu, меню — меню дій.",
    "• /news, новини — новини світу.",
    "• /who, хто — активні персонажі.",
    "• /time, час — поточний календарний відгук світу.",
    "• /chat, /chat time 1, /chat location, /chat character — журнал реплік.",
    "• /stat, статистика — службова статистика для Писарів.",
    "• /all — службовий список для Писарів.",
    "",
    "Загальні правила:",
    "• Команди не чутливі до регістру: NORTH = north.",
    "• Багато команд мають скорочення: n, пн, inv, ск.",
    "• Природні фрази працюють там, де вже є аліаси: go north = north.",
    "• Команди з крапкою з комою поки не ланцюжаться; це заплановано.",
  ].join("\n"),
  [
    "🧾 Заплановані команди й напрямки",
    "",
    "Near-term text command pack уже покрив швидкий огляд, виходи, enter/leave, whisper, reply і shout.",
    "",
    "Найближчі окремі пакети:",
    "",
    "Після цього:",
    "• equip/remove — спорядити або зняти предмет; зараз це частково замінюють дії з факелом.",
    "• give [object] [target], put [object] [container] — передавання й контейнери.",
    "• drink <beverage> — випити щось.",
    "• consider/con <target> — оцінити небезпеку цілі.",
    "• compare <a> to <b> — порівняти речі.",
    "• skills, effects, journal, weather — навички, стани, особистий літопис і погода.",
    "• wimpy [hp/стан] — автоматична втеча при небезпечному стані.",
    "",
    "Соціальне й організації:",
    "• party create/invite/accept/leave/kick/info.",
    "• guild create/invite/accept/info/leave/members.",
    "• ширший список socials на кшталт hug лишається в айсбоксі до повнішої social-системи.",
    "",
    "Магія й будівництво:",
    "• spells, cast, memorize — майбутня магічна система.",
    "• buildroom, editdesc, addexit, removeexit, adddetail, builderrooms — майбутні builder-команди з дозволами.",
    "• makebuilder, removebuilder, reviewrooms, approveroom, rejectroom, debug, mute, unmute, kick — майбутні адмінські/модераційні інструменти.",
    "",
    "Поради:",
    "• Малюйте мапу. Папір часто пам'ятає краще за стежку.",
    "• Тримайтеся разом, коли світ стане небезпечнішим: гурт легше помічає загрозу.",
    "• Читайте описи. Важливі підказки часто ховаються не в кнопках, а в самій місцині.",
  ].join("\n"),
];

function commandsPageKeyboard(pageIndex: number) {
  const keyboard = new InlineKeyboard();
  const total = COMMANDS_TEXT_PAGES.length;
  if (pageIndex > 0) keyboard.text("↩️ Назад", `commands:page:${pageIndex - 1}`);
  keyboard.text(`${pageIndex + 1}/${total}`, "commands:noop");
  if (pageIndex < total - 1) keyboard.text("Далі ↪️", `commands:page:${pageIndex + 1}`);
  return keyboard;
}

async function replyWithCommandsPage(ctx: any, pageIndex = 0) {
  const safePage = Math.max(0, Math.min(COMMANDS_TEXT_PAGES.length - 1, pageIndex));
  await ctx.reply(COMMANDS_TEXT_PAGES[safePage], {
    reply_markup: commandsPageKeyboard(safePage),
  });
}

async function editCommandsPage(ctx: any, pageIndex: number) {
  const safePage = Math.max(0, Math.min(COMMANDS_TEXT_PAGES.length - 1, pageIndex));
  await ctx.editMessageText(COMMANDS_TEXT_PAGES[safePage], {
    reply_markup: commandsPageKeyboard(safePage),
  });
}

export async function sendHelp(ctx: any) {
  const auto = ctx.from ? isPlayerAutoEnabled(ctx.from.id) : false;
  await ctx.reply(HELP_TEXT, {
    parse_mode: "HTML",
    reply_markup: ctx.from ? await buildMainReplyKeyboardForTelegramId(ctx.from.id, auto) : undefined,
  });

  if (!ctx.from) return;
  const player = await getPlayerByTelegramId(ctx.from.id);
  if (!player || await hasCompletedTutorial(player.id)) return;

  await ctx.reply(
    "Навчальний сон ще не завершено. Можна повернутися туди, пройти короткі вправи або прокинутися, коли будете готові.",
    { reply_markup: new InlineKeyboard().text("🌙 Навчальний сон", "tutorial:sleep") }
  );
}

export async function sendCommands(ctx: any) {
  await replyWithCommandsPage(ctx, 0);
}

export function registerHelpHandlers(bot: Bot) {
  bot.command("help", sendHelp);
  bot.command("commands", sendCommands);
  bot.callbackQuery(/^commands:page:(\d+)$/, async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await editCommandsPage(ctx, Number(ctx.match[1]));
  });
  bot.callbackQuery("commands:noop", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
  });
  bot.hears(["❔ Допомога", "🧭 Допомога", "Допомога"], sendHelp);
}
