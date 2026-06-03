import { Bot, InlineKeyboard } from "grammy";
import { buildMainReplyKeyboardForTelegramId } from "../ui/replyKeyboard";
import { isPlayerAutoEnabled } from "./auto";
import { getPlayerByTelegramId } from "../services/players";
import { hasCompletedTutorial, isTutorialLocation } from "../services/tutorial";
import { safeAnswerCallbackQuery } from "../utils/telegram";
import { slashlessCommandPattern } from "../utils/slashlessCommands";
import { prisma } from "../db";

const COMMANDS_TEXT_COMMAND = slashlessCommandPattern(["commands"]);

export const HELP_TEXT = [
  "🧭 <b>Що робити в Порубіжжі Чорнолісу</b>",
  "",
  "<b>Перші кроки</b>",
  "Якщо ви тут уперше — пройдіть <i>навчальний сон</i> (/sleep_tutorial). Він коротко показує, як рухатися, озиратися, роздивлятися світ і слухати підказки місцини.",
  "Коли відчуєте, що готові до більшого світу, у сні можна обрати <i>Закінчити навчання</i> (/tutorialEnd).",
  "",
  "<b>Персонаж</b>",
  "• <i>Персонаж</i> (/me) — стан персонажа, життя, снага, голод і короткий огляд речей.",
  "• <i>Речі</i> (/inventory) — тут можна з'їсти, з'їсти всі корисні однотипні запаси, роздивитися або викинути наявні речі.",
  "• <i>Дати</i> (/give) — перший маленький обмін: зараз можна дати сире м'ясо видимому Коту-бережнику.",
  "• <i>Відпочити</i> (/rest) — сісти й почати короткий відпочинок.",
  "• <i>Сісти</i> (/sit) і <i>Встати</i> (/stand) — змінити поставу без окремої дії з речами.",
  "• <i>🌙 AFK / відійти</i> (/afk) — поставити сесію на паузу й зупинити нагадування; пасивний голод не зупиняється.",
  "• <i>🚪 Завершити сесію</i> (/end_session) — завершити поточну Telegram-сесію без втрати персонажа й поставити пасивний голод на паузу.",
  "• Повернення після паузи чи завершення — /start або будь-яка ігрова команда чи кнопка.",
  "",
  "<b>Місцина і мапа</b>",
  "• <i>Озирнутися</i> (/look) — побачити поточну місцину.",
  "• <i>Глянути швидко</i> (/glance) — назва місцини та виходи без довгого опису.",
  "• <i>Виходи</i> (/exits) — лише видимі шляхи з місцини.",
  "• <i>Роздивитися</i> (/examine) — уважніший огляд місцини, предмета, істоти або особливості.",
  "• <i>Сліди</i> (/track) — пошукати свіжі сліди поруч; /track кіт — відфільтрувати сліди за істотою чи персонажем.",
  "• <i>Повернення</i> (/respawn) — якщо заблукали, попросити стежку повернути вас до межового табору; перед переносом буде підтвердження.",
  "• <i>Звернутися до Писарів</i> (/call_scribes) — якщо звичайне повернення вже не слухається, попросити Писарів про ручний знак повернення.",
  "• Мапа — окремої ігрової мапи ще немає; поки найкраще звіряти виходи, читати описи й вести власні нотатки.",
  "",
  "<b>Рух і дії</b>",
  "• <i>Північ</i> (/north), <i>Південь</i> (/south), <i>Захід</i> (/west), <i>Схід</i> (/east) — рух сторонами світу. Коротко: /n, /s, /w, /e.",
  "• <i>Вгору</i> (/up) і <i>Вниз</i> (/down) — рух по видимих вертикальних проходах, наприклад на дерево й назад.",
  "• <i>Зібрати</i> (/gather) — збирати ягоди, гриби чи лікарські трави, якщо вони є поруч.",
  "• <i>Взяти мед</i> (/gather_honey) — ризиковано полізти до борті по мед; це не тихий збір і рій може відповісти.",
  "• <i>Розібрати тотем</i> (/dismantle_totem) — розібрати підозрілий сухий тотем у місцині й забрати придатний хмиз.",
  "• <i>Черга</i> (/queue) — поточний план дій; /queue_cancel скасовує поточну дію, /queue_clear очищає чергу.",
  "• <i>Авто</i> (/auto) — увімкнути самостійні дії; /auto_stop, <i>вимкнути авто</i>, <i>стоп авто</i> або <i>авто стоп</i> вимикають їх.",
  "",
  "<b>Мова і присутність</b>",
  "• <i>Сказати</i> (/say) — сказати щось у місцині.",
  "• <i>Прошепотіти</i> (/whisper) — тихо звернутися до видимого персонажа чи істоти.",
  "• <i>Відповісти</i> (/reply) — відповісти тому, хто останнім звернувся саме до вас.",
  "• <i>Гукнути поруч</i> (/yell) — докричатися до цієї місцини й видимих сусідніх переходів.",
  "• <i>Крикнути в регіон</i> (/shout) — гукнути ширше, в межах регіону.",
  "• <i>Сигнали</i> — після <i>Роздивитися</i> оберіть персонажа чи істоту, щоб кивнути, помахати або подати інший короткий жест.",
  "",
  "<b>Поради</b>",
  "• Малюйте мапу. Папір часто пам'ятає краще за стежку.",
  "• Тримайтеся разом, коли світ стане небезпечнішим: гурт легше помічає загрозу.",
  "• Читайте описи. Важливі підказки часто ховаються не в кнопках, а в самій місцині.",
  "",
  "<b>Світ і довідка</b>",
  "• <i>Новини</i> (/news) — остання новина й архів; /news 6 відкриває шосту сторінку архіву.",
  "• <i>Хроніки</i> (/chronicles) — останні зарубки світу: нові персонажі й важливі зміни на кшталт стану падального рову.",
  "• <i>Хто поруч у часі</i> (/who) — хто був активний за останню реальну годину.",
  "• <i>Час</i> (/time) — коротко: поточна пора доби, приблизний межовий час і світло.",
  "• <i>Календар</i> (/calendar) — рік, пора, місячне коло й день Порубіжжя.",
  "• <i>Погода</i> (/weather) — короткий стан неба, туману чи дощу за внутрішнім часом Чорнолісу.",
  "• <i>Налаштування</i> (/settings) — керування сповіщеннями, зокрема повідомленнями про зміну часу дня й авто-повідомленнями.",
  "• <i>Почати спочатку</i> (/restart) — стерти персонажа і пройти шлях з початку через /start.",
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
    "• /up /down, /u /d, вгору/вниз — рух видимими вертикальними проходами.",
    "• /inside /in /enter, enter bushes, вср, всередину, увійти в кущі — увійти в доступний внутрішній прохід.",
    "• /outside /out /leave, leave cave, наз, назовні, вийти з кущів — вийти назовні.",
    "• go north, йти на південь, рушити на захід — природні фрази руху.",
    "",
    "Огляд і місцевість:",
    "• /glance, glance, глянути швидко, швидко глянути — назва місцини та виходи.",
    "• /exits, exits, виходи, куди можна йти — лише видимі виходи з місцини, включно із замкненими видимими напрямками.",
    "• /track, /track кіт, сліди, відстежити — побачити свіжі сліди поруч або відфільтрувати їх за істотою чи персонажем.",
    "• /examine tracks, роздивитися сліди — уважніше роздивитися сліди.",
    "• /respawn, повернення, повернутися до табору — підтверджене повернення до межового табору для заблукалих ранніх/виснажених персонажів.",
    "• /call_scribes, call scribes, покликати писарів, звернутися до писарів — попросити Писарів про ручний знак повернення, якщо звичайне повернення вже не доступне.",
    "• /examine grass, оцінити траву — оглянути винищену траву, якщо вона є.",
    "• /examine sign, роздивитися знак — оглянути межовий знак, якщо він є.",
    "• look лавка, examine bushes, роздивитися кущі — огляд видимої особливості місцини.",
    "",
    "Персонаж і речі:",
    "• /me, персонаж, стан, хто я — картка персонажа.",
    "• /inventory, inv, речі — речі персонажа.",
    "• item ягоди, річ факел, inspect item herbs — оглянути річ у речах.",
    "• drop berries, викинути факел, кинути трави — викинути одну річ на землю; drop all, drop all corpse, викинути все — викласти всі або всі однотипні речі, крім того, що в руках.",
    "• /put, /put туша рів, покласти всі рештки до ями — покласти тушу чи рештки з Речей у місцеву позначену особливість, зараз передусім у падальний рів біля воріт.",
    "• /give сире м'ясо коту, give raw meat to cat, дати м'яса коту, дати мясо кіт, дати сирого м'яса бережнику, /feed_raw_meat — передати одну підтриману річ видимій цілі; зараз це сире м'ясо для Кота-бережника.",
    "• /pick, /pick_all, /get_all, get corpse, take twigs, get all corpse, взяти все, підняти всі трупи — підібрати видиму річ або всі/однотипні видимі речі із землі.",
    "• eat berries, з'їсти гриби, з'їсти лікарські трави, use herbs — з'їсти або використати їстівний/лікувальний запас.",
    "• /eat_all_berries, /eat_all_herbs, eat all cooked meat, з'їсти всі ягоди, з'їсти все смажене м'ясо — поставити однотипний їстівний запас у чергу, поки він ще корисний.",
    "• light torch, запалити факел — запалити факел від вогнища або іншого запаленого факела.",
    "• douse torch, погасити факел, притушити факел — притушити запалений факел.",
    "• cook meat, підсмажити м'ясо — підсмажити сире м'ясо біля вогнища; /cook_all, посмажити все — поставити все сире м'ясо в чергу по одному шматку.",
    "• eat cooked meat, з'їсти м'ясо — з'їсти смажене м'ясо.",
  ].join("\n"),
  [
    "🧾 Команди Порубіжжя, сторінка 2",
    "",
    "Дії:",
    "• /gather, gather herbs, збирати ягоди, шукати гриби — збір ресурсу місцини з витратою часу й снаги.",
    "• /gather_honey, /gather_beeswax, gather honey, взяти мед, зібрати мед, обібрати вулик, пограбувати бортю, добути віск — ризикована спроба дістати мед або віск зі старої борті.",
    "• /shake_tree, shake tree, потрусити дерево — струсити доступне дерево, якщо ви вже нагорі; хмиз посиплеться вниз, але дерево не відновлюється одразу.",
    "• /dismantle_totem, dismantle totem, розібрати тотем — розібрати видимий підозрілий тотем у місцині й отримати хмиз, якщо він ще придатний.",
    "• /sit, сісти, присісти — сісти без початку відпочинку.",
    "• /lie, лягти, лежати — лягти без початку сну чи відпочинку.",
    "• /stand, встати, підвестися — встати; якщо ви відпочиваєте, це перерве відпочинок.",
    "• /rest, відпочити — сісти, якщо треба, і почати короткий відпочинок.",
    "• /queue, черга, план — переглянути план дій.",
    "• /queue cancel, stop, скасувати дію — скасувати поточну дію.",
    "• /queue clear, очистити чергу — очистити чергу.",
    "• /auto, авто, увімкнути авто — увімкнути самостійні дії.",
    "• /auto_stop, /auto stop, зупинити авто, вимкнути авто, стоп авто, авто стоп — вимкнути самостійні дії.",
    "• 🌙 AFK / відійти (/afk), afk, відійти — поставити сесію на паузу й зупинити нагадування; пасивний голод не зупиняється.",
    "• 🚪 Завершити сесію (/end_session), /endSession, /quit, /leave, завершити сесію, вийти — завершити поточну Telegram-сесію й поставити пасивний голод на паузу.",
    "• Повернення після AFK або завершення — /start чи будь-яка звичайна ігрова команда/кнопка.",
    "• /sleep, спати, заснути — лягти й заснути звичайним сном.",
    "• <i>навчальний сон</i> (/sleep_tutorial), /sleep tutorial — повернутися до навчального сну.",
    "• /tutorialEnd, закінчити навчання — підтвердити завершення навчального сну й прибрати нагадування про незавершене навчання.",
    "• /wake, wake, прокинутися — прокинутися зі звичайного або навчального сну.",
    "• /say текст, сказати текст, ск текст, гов текст — сказати щось поруч.",
    "• /say Відчинитися, Відчинись будь ласка — у навчальному сні може відчинити Браму Сну.",
    "• /open ворота, відкрити ворота, відчинити браму — спробувати відчинити місцеву браму чи ворота.",
    "• whisper Данило текст, шепнути 1 текст — прошепотіти видимому персонажу поруч.",
    "• reply текст, відповісти текст — відповісти тому, хто останнім звернувся саме до вас.",
    "• /yell текст, yell текст, call текст, гукнути текст, покликати текст, крикнути поруч текст — гукнути поруч, у поточну й сусідні місцини.",
    "• /shout текст, shout текст, крикнути текст, кричати текст, крик текст, волати текст — крикнути ширше, в межах регіону.",
    "• attack rabbit, fight wolf, kill wolf, kick rabbit, атака миша, бити мишу — атакувати видиму живу ціль.",
    "• /freshen corpse, butcher corpse, освіжити труп, розібрати труп — обробити свіжий труп і здобути м'ясо; /freshen_all, freshen all, свіжувати все — поставити всі придатні туші в чергу по одній.",
    "",
    "Соціальні сигнали:",
    "• smile, усміхнутися; nod, кивнути; bow, вклонитися; wave, помахати.",
    "• laugh, засміятися; sigh, зітхнути; point, вказати; glare, насупитися.",
    "• Сигнал можна спрямувати на видиму ціль: кивнути 1, wave Здравомир.",
    "",
    "Інформація:",
    "• /help, допомога — коротка допомога.",
    "• /commands — повний прихований каталог реалізованих команд і аліасів.",
    "• /menu, меню — меню дій.",
    "• /news, /news 6, новини — новини світу й перехід до сторінки архіву.",
    "• /chronicles, chronicles, хроніки, останні події — глобальні зарубки світу: нові персонажі й важливі зміни.",
    "• /who, хто — активні персонажі.",
    "• /time, час — коротка поточна пора доби й приблизний межовий час.",
    "• /calendar, календар, дата, місячне коло — рік, пора, місячне коло й день Порубіжжя.",
    "• /weather, погода — поточна погода внутрішнього світу.",
  "• /settings, /notifications, налаштування, сповіщення — налаштування повідомлень.",
  "• /daynotices, /daynotices on, /daynotices off — показати або змінити повідомлення про світанок, день, присмерк і ніч. Якщо вимкнути їх, доведеться уважніше звіряти /time, /weather, світло, тіні й описи місцини.",
  "• /automessages, /automessages on, /automessages off — показати або змінити авто-повідомлення: чи бачити вибір і результати авто-дій навіть після довшої тиші.",
    "• /chat, /chat time 1, /chat location, /chat character — журнал реплік.",
    "• /adminMenu — кнопкове меню Писарів: статистика, світ, all, телепорт, ресурси, вогонь та повна довідка.",
    "• /adminHelp — повний службовий список команд Писарів.",
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
    "Near-term text command pack уже покрив швидкий огляд, виходи, enter/leave, whisper, reply, yell і shout.",
    "",
    "Найближчі окремі пакети:",
    "",
    "Після цього:",
    "• equip/remove — спорядити або зняти предмет; зараз це частково замінюють дії з факелом.",
    "• broader give [object] [target] — передавання ширшого набору речей іншим персонажам.",
    "• ширший put [object] [container] — контейнери за межами падального рову.",
    "• drink <beverage> — випити щось.",
    "• consider/con <target> — оцінити небезпеку цілі.",
    "• compare <a> to <b> — порівняти речі.",
    "• skills, effects, journal — навички, стани й особистий літопис.",
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
  ].join("\n"),
];

function helpTextForTutorialStatus(tutorialCompleted: boolean) {
  if (!tutorialCompleted) return HELP_TEXT;
  const hiddenWhenCompleted = new Set([
    "<b>Перші кроки</b>",
    "Якщо ви тут уперше — пройдіть <i>навчальний сон</i> (/sleep_tutorial). Він коротко показує, як рухатися, озиратися, роздивлятися світ і слухати підказки місцини.",
    "Коли відчуєте, що готові до більшого світу, у сні можна обрати <i>Закінчити навчання</i> (/tutorialEnd).",
  ]);
  return HELP_TEXT.split("\n").filter((line) => !hiddenWhenCompleted.has(line)).join("\n").replace(/\n{3,}/g, "\n\n");
}

function commandsPageKeyboard(pageIndex: number) {
  const keyboard = new InlineKeyboard();
  const total = COMMANDS_TEXT_PAGES.length;
  if (pageIndex > 0) keyboard.text("↩️ Назад", `commands:page:${pageIndex - 1}`);
  keyboard.text(`${pageIndex + 1}/${total}`, "commands:noop");
  if (pageIndex < total - 1) keyboard.text("Далі ↪️", `commands:page:${pageIndex + 1}`);
  return keyboard;
}

export const TUTORIAL_HELP_RETURN_TEXT =
  "Навчальний сон ще не завершено. Можна повернутися туди, пройти короткі вправи або прокинутися, коли будете готові.";

export const TUTORIAL_HELP_IN_DREAM_TEXT =
  "Навчальний сон ще триває. Можна пройти короткі вправи або прокинутися, коли будете готові.";

export function tutorialHelpFollowupText(isInTutorialDream: boolean) {
  return isInTutorialDream ? TUTORIAL_HELP_IN_DREAM_TEXT : TUTORIAL_HELP_RETURN_TEXT;
}

async function playerIsInTutorialDream(playerId: number) {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      currentLocation: {
        select: {
          key: true,
          z: true,
          region: { select: { key: true } },
        },
      },
    },
  });
  return Boolean(player?.currentLocation && isTutorialLocation(player.currentLocation));
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
  const player = ctx.from ? await getPlayerByTelegramId(ctx.from.id) : null;
  const tutorialCompleted = player ? await hasCompletedTutorial(player.id) : false;

  await ctx.reply(helpTextForTutorialStatus(tutorialCompleted), {
    parse_mode: "HTML",
    reply_markup: ctx.from ? await buildMainReplyKeyboardForTelegramId(ctx.from.id, auto) : undefined,
  });

  if (!ctx.from) return;
  if (!player || tutorialCompleted) return;

  const isInTutorialDream = await playerIsInTutorialDream(player.id);
  await ctx.reply(tutorialHelpFollowupText(isInTutorialDream), {
    reply_markup: isInTutorialDream
      ? new InlineKeyboard().text("✅ Закінчити навчання", "tutorial:end").row().text("🌤 Прокинутися", "tutorial:wake")
      : new InlineKeyboard().text("🌙 Навчальний сон", "tutorial:sleep"),
  });
}

export async function sendCommands(ctx: any) {
  await replyWithCommandsPage(ctx, 0);
}

export function registerHelpHandlers(bot: Bot) {
  bot.command("help", sendHelp);
  bot.command("commands", sendCommands);
  bot.hears(COMMANDS_TEXT_COMMAND, sendCommands);
  bot.callbackQuery(/^commands:page:(\d+)$/, async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
    await editCommandsPage(ctx, Number(ctx.match[1]));
  });
  bot.callbackQuery("commands:noop", async (ctx) => {
    await safeAnswerCallbackQuery(ctx);
  });
  bot.hears(["❔ Допомога", "🧭 Допомога", "Допомога"], sendHelp);
}
