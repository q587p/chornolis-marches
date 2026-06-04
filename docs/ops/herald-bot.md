# Канцелярія Межового Знаку

Канцелярія Межового Знаку — окремий Telegram-бот для службових оголошень, новин і коротких світових записів. Вона запускається окремим runtime і не повинна імпортувати `src/bot.ts` або `src/apps/gameBot.ts`.

Канцелярія не запускає ігровий бот, world tick, action queue, deploy announcements або gameplay handlers.

## Runtime

Compiled entrypoint:

```bash
node dist/apps/heraldBot.js
```

Локально типовий порядок такий:

```bash
npm install
npx prisma migrate deploy
npm run build
node dist/apps/heraldBot.js
```

Для локальної розробки можна мати `.env`, але не комітьте реальні токени, id каналів або приватні admin id.

## Render Web Service

Після merge у `main` Канцелярія деплоїться з тієї ж гілки `main`, що й основний бот, але як окремий Render Web Service зі своїм Start Command. Основний ігровий сервіс лишається окремим процесом і не потребує `HERALD_*` env variables.

Render free Web Service не має окремої Pre-Deploy Command, тому для Канцелярії тримаємо міграції в Build Command.

Build Command:

```bash
npm install && npx prisma migrate deploy && npm run build
```

Start Command:

```bash
node dist/apps/heraldBot.js
```

Не використовуйте `prisma migrate dev` на Render. Кожна зміна `prisma/schema.prisma`, яка міняє persisted database shape, має мати закомічену міграцію в `prisma/migrations/**`.

Повна post-merge схема двох Render-сервісів описана в `docs/ops/render-services.md`.

## Environment Variables

Required:

- `DATABASE_URL` — PostgreSQL connection string.
- `HERALD_BOT_TOKEN` — токен окремого Telegram-бота Канцелярії. Не використовуйте токен основного ігрового бота.

Recommended:

- `HERALD_ADMIN_IDS` — comma-separated список Telegram user id, яким дозволені службові команди. Приклад форми: `111111,222222`, без реальних значень у документації чи комітах.
- `HERALD_CHANNEL_ID` — канал, куди Канцелярія публікує записи. Може бути username на кшталт `@channel_name` або numeric id.
- `GAME_BOT_USERNAME` — username основного ігрового бота для безпечних deep links у публічних новинах Канцелярії та web-архіві `/news`. Дефолт: `Chornolis_bot`.
- `HERALD_ENABLED` — `true`/`false`. Якщо `false`, automatic publisher loop не стартує; ручні bot commands і health server лишаються runtime-поведінкою самого entrypoint.
- `HERALD_PUBLICATIONS_PAUSED` — `true`/`false`. Якщо `true`, Канцелярія після deploy/restart/wake-up одразу ставить durable publication queue на паузу. `/resume_publications` може зняти паузу під час runtime; прапорець потрібен як Render safety rail, щоб великий backlog не пішов у канал одразу після пробудження сервісу.
- `HERALD_PUBLISH_INTERVAL_MS` — інтервал publisher loop. Мінімально ефективне значення в конфігу: `1000`, дефолт: `30000`.
- `HERALD_ARCHIVE_INTERVAL_MINUTES` — інтервал між архівними записами `news.md` у backfill drip-feed. Дефолт: `13`.
- `HERALD_MAX_PUBLICATIONS_PER_TICK` — скільки записів publisher loop може винести за один обхід. Дефолт: `1`, щоб після Render sleep Канцелярія не скидала кілька архівних вістей одразу.
- `HERALD_REBALANCE_OVERDUE_PUBLICATIONS` — `true`/`false`. Якщо `true`, прострочені архівні записи після sleep/wake-up розкладаються вперед із configured archive interval, а не публікуються пачкою.
- `HERALD_STARTUP_NOTICE_ENABLED` — `true`/`false`. Якщо `true`, Канцелярія після старту polling спробує надіслати коротке службове повідомлення в configured startup chat.
- `HERALD_STARTUP_NOTICE_CHAT_ID` — chat id для startup notice. Краще ставити приватний/admin chat, а не публічний канал.
- `HERALD_CHRONICLE_RELAY_ENABLED` — `true`/`false`. Якщо `true`, Канцелярія після старту й далі за інтервалом передає нові публічні `Chronicle:` зарубки у configured chronicle chat.
- `HERALD_CHRONICLE_RELAY_CHAT_ID` — chat/channel id для коротких хронік Порубіжжя. Це може бути окремий chat від `HERALD_CHANNEL_ID`, щоб release news і живі світові зарубки не змішувалися.
- `HERALD_CHRONICLE_RELAY_INTERVAL_MS` — інтервал перевірки хронік. Дефолт: `60000`.
- `HERALD_CHRONICLE_RELAY_MAX_PER_TICK` — максимум хронік за один relay tick після sleep/restart. Дефолт: `3`, максимум у конфігу: `10`.
- `PORT` — порт HTTP health server. Render задає його автоматично; локально дефолт `3000`.
- `APP_VERSION` — fallback version label, якщо `package.json` не можна прочитати.

Reserved for future support:

- `HERALD_STARTUP_NOTICE_THREAD_ID` — не підтримується поточним runtime; не задавайте його як обов'язковий env, доки код явно не навчиться ним користуватися.

Related main game env:

- `BOT_TOKEN` належить основному ігровому боту і не потрібен для Канцелярії.
- `ADMIN_TELEGRAM_IDS` належить основному ігровому боту; для Канцелярії використовуйте `HERALD_ADMIN_IDS`.

## Health Check

Herald entrypoint запускає мінімальний HTTP server на `0.0.0.0:$PORT`.

Endpoints:

- `GET /health` — JSON health response з service/name/version.
- `GET /` — короткий plain-text статус.

Перевірка локально:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/
```

На Render використовуйте URL Web Service, наприклад:

```bash
curl https://example.onrender.com/health
```

Не записуйте реальний service URL у public docs, якщо він не має бути публічним.

## Status Page Heartbeat

Після старту Канцелярія записує heartbeat у таблицю `ServiceHeartbeat` і повторює його приблизно раз на хвилину. Основний status site читає цей запис і показує Канцелярію в секції `Сервіси` поруч із основним ботом, чергою дій і світовим циклом.

На status site безпечно видно лише службові агрегати:

- режим Канцелярії: `standalone` або інший майбутній явний режим;
- час останнього heartbeat;
- час останнього старту;
- скільки записів HeraldPublication очікує у скрині вістей;
- скільки вже опубліковано;
- коли востаннє було опубліковано новину з `news.md` або архіву `news.md`.

Status page не показує Telegram token, admin ids, channel id, `DATABASE_URL`, приватний текст queued записів або приховану ігрову інформацію. Якщо Канцелярія зупинена або давно не оновлювала heartbeat, сторінка має показати попередження на кшталт `давно не подавала знаку`.

## Telegram Channel Setup

1. Створіть окремого бота в BotFather для Канцелярії Межового Знаку.
2. Додайте його в потрібний Telegram channel.
3. Надайте йому право публікувати повідомлення в каналі.
4. Встановіть `HERALD_CHANNEL_ID`.
5. Встановіть `HERALD_ADMIN_IDS` для людей, які можуть preview/queue/post службові записи.
6. За потреби встановіть `HERALD_STARTUP_NOTICE_ENABLED=true` і `HERALD_STARTUP_NOTICE_CHAT_ID` на приватний/admin chat, щоб бачити restart/wake-up notice.
7. Запустіть Web Service і перевірте `/ping` у приватному чаті з ботом.

Якщо `HERALD_CHANNEL_ID` не задано, Канцелярія може відповідати на приватні команди, але publication loop не знатиме, куди нести записи.

## Admin IDs

`HERALD_ADMIN_IDS` — це Telegram user id, не username.

Безпечно перевірити себе можна командою:

```text
/whoami
```

Команда не показує секрети. Вона лише повідомляє, чи Канцелярія впізнала печатку відправника.

## Polling Safety

Канцелярія зараз працює через Telegram long polling.

Не запускайте два процеси з тим самим `HERALD_BOT_TOKEN` одночасно. Telegram поверне `409 Conflict: terminated by other getUpdates request`, і один із pollerів перестане нормально працювати.

Перед Render-деплоєм зупиніть локальний `node dist/apps/heraldBot.js`, якщо він використовує той самий токен.

Так само не використовуйте токен основного бота Порубіжжя для Канцелярії: це окремі runtime і окремі Telegram identities.

## Future Embedded Mode

Поточний рекомендований режим — окремий Herald Web Service з entrypoint:

```bash
node dist/apps/heraldBot.js
```

У майбутньому можна буде додати embedded mode, де main Chornolis Web Service навмисно стартує і основного ігрового бота, і Канцелярію як другий Telegram client. Це зменшить кількість Render services, але дасть менше runtime-незалежності: збій або redeploy main service одночасно зачепить і Канцелярію.

Майбутній прапорець має бути явним, наприклад:

```text
HERALD_EMBEDDED_ENABLED=true
```

Міграція зі standalone Herald service до embedded mode має бути такою:

1. Disable/suspend separate Herald Render Web Service.
2. Copy `HERALD_*` env variables to the main Chornolis Web Service.
3. Enable `HERALD_EMBEDDED_ENABLED=true` on the main service.
4. Keep exactly one active polling process for `HERALD_BOT_TOKEN`.
5. Roll back by disabling `HERALD_EMBEDDED_ENABLED` and re-enabling the separate Herald service.

Не вмикайте standalone Herald service і embedded Herald mode одночасно з тим самим `HERALD_BOT_TOKEN`: це може створити Telegram polling conflict, duplicate startup notices, duplicate publisher loops і гонку за outbox publications.

Tracking item: `HERALD-001`.

## GitHub Actions Keepalive

The repository includes `.github/workflows/herald-keepalive.yml` for the standalone
Herald Render free Web Service. It pings the Herald health endpoint every 10
minutes, offset from minute `0`, and also supports manual `workflow_dispatch`
testing from GitHub Actions.

Configure the URL in GitHub before relying on the workflow:

1. Open the repository on GitHub.
2. Go to `Settings` -> `Secrets and variables` -> `Actions`.
3. Add either a repository secret or repository variable named
   `HERALD_HEALTH_URL`.
4. Set it to the public health endpoint of the standalone Herald Web Service,
   for example `https://example.onrender.com/health`.

If `HERALD_HEALTH_URL` is not configured after the workflow lands on `main`, the
scheduled keepalive job will fail visibly in GitHub Actions. This does not block
the game runtime or the Herald runtime; either add the secret/variable, disable
the schedule, or treat the failed scheduled job as a reminder that keepalive is
not configured yet.

Do not commit the real Render URL if it should stay private. Do not store bot
tokens, channel ids, admin ids or database URLs in the workflow file.

GitHub scheduled workflows run only on the repository default branch. Changes to
the keepalive workflow on a feature branch will not run on schedule until that
branch is merged into `main`; use `workflow_dispatch` for manual testing after
the workflow exists on the default branch.

Keeping a Render free Web Service warm consumes free instance hours. If the
Herald service should be allowed to sleep, disable the schedule or remove
`HERALD_HEALTH_URL`.

## BotFather Commands

Suggested BotFather command list:

```text
ping - перевірити, чи Канцелярія на місці
info - безпечний атмосферний запис про себе або людину у відповіді
preview_latest_news - показати останню новину без публікації
news_updates - показати записи news.md, які ще не мають активної публікації
post_latest_news - опублікувати останню новину в канал
pending_publications - показати чергу публікацій
publish_pending - опублікувати очікувані записи
pause_publications - призупинити автоматичну публікацію черги
resume_publications - відновити автоматичну публікацію черги
cancel_pending_publications - скасувати неопубліковані записи новин/архіву
forget_published_news - за підтвердженням забути опубліковані записи новин/архіву
news_archive_list - показати deployed news.md від найстарішого
news_archive_find - знайти архівний номер за релізом
news_archive_preview - переглянути один архівний запис
news_archive_post - вручну опублікувати один архівний запис
news_archive_force_post - явно повторно передати архівний запис
news_archive_reload - заново перечитати deployed news.md
list_publications - показати останні записи книги публікацій
show_publication - показати збережений запис за номером
repost_publication - повторно опублікувати збережений запис як архів
mark_publication_deleted - позначити запис як вручну видалений із Telegram
preview_world_digest - попередній перегляд дайджесту світу
chronicles_pending - показати хроніки, які ще не передано до чату
publish_chronicles - вручну передати очікувані хроніки до чату
chronicles_backfill_players - додати пропущені прибуття з давніших записів персонажів
```

Додаткові службові команди можуть лишатися доступними без BotFather-підказки:

- `/help` — список відомих команд.
- `/whoami` — перевірити, чи впізнано службову печатку.
- `/info` — публічний безпечний запис: без reply показує запис відправника, у reply показує запис людини, якій відповідають, якщо Telegram передав її `from`.
- `/info_full` — службовий докладніший запис за іменем або печаткою; потребує `HERALD_ADMIN_IDS`.
- `/queue_latest_news` — поставити останню новину в outbox без негайної публікації.
- `/news_updates` або `/check_news_updates` — перечитати deployed `news.md`, знайти записи без активної queued/published публікації, показати короткі прев'ю й готові команди `/news_archive_preview N` та `/news_archive_post N`.
- `/pause_publications` — призупинити автоматичний publisher loop, не зупиняючи бота, health server чи інші службові команди. Стан паузи зберігається в БД.
- `/resume_publications` — відновити автоматичну публікацію очікуваних записів.
- `/cancel_pending_publications` — позначити неопубліковані записи `NEWS_MD` і `NEWS_MD_ARCHIVE` як `CANCELED`, не видаляючи вже опубліковану історію й не торкаючись інших майбутніх типів публікацій.
- `/forget_published_news confirm` — видалити з книги публікацій уже опубліковані записи `NEWS_MD` і `NEWS_MD_ARCHIVE`, щоб deployed `news.md` можна було заново поставити в чергу або вручну передати. Команда не видаляє Telegram-повідомлення, не торкається pending-записів і потребує явного `confirm`.
- `/list_publications` — показати останні записи книги публікацій із Telegram message id, published/deleted/repost markers, якщо вони є.
- `/show_publication <id>` — показати збережений snapshot запису з outbox, навіть якщо його вже немає в `news.md`.
- `/repost_publication <id>` — повторно опублікувати збережений snapshot як архівний repost. Це створює нове Telegram-повідомлення й не відновлює старий timestamp.
- `/mark_publication_deleted <id>` — вручну позначити в БД, що Telegram-повідомлення було видалене з каналу. Команда нічого не видаляє в Telegram і не запускає автоматичний repost.
- `/backfill_news_preview` — подивитися, які старі записи `news.md` ще не стоять у черзі й не були опубліковані.
- `/backfill_news_queue [13m]` — поставити старі записи `news.md` у чергу архівною drip-feed послідовністю. Без аргументу використовує configured archive interval, зараз 13 хвилин.
  - Інтервал можна задати прямо в команді: `/backfill_news_queue 23m`, `/backfill_news_queue 30m`, `/backfill_news_queue 2h`.
  - Підтримувані короткі форми: `m` для хвилин, `h` для годин. Для архівної стрічки краще тримати помітну паузу, щоб після sleep/wake Render не сипав старими вістями гуртом.
- `/backfill_news_cancel` — alias для безпечного скасування неопублікованих записів новин/архіву, коли backfill поставив забагато старих вістей.
- `/backfill_news_reschedule_pending [13m]` — заново впорядкувати й розкласти ще не опубліковані архівні записи `news.md`, не торкаючись уже опублікованих Telegram-повідомлень. Приклади: `/backfill_news_reschedule_pending 23m`, `/backfill_news_reschedule_pending 2h`.
- `/backfill_news_status` — звірити стан архівного backfill для `news.md`: скільки очікує, скільки вже опубліковано, який наступний запис і чи ввімкнено overdue rebalance.
- `/news_archive_list` — перечитати deployed `news.md` і показати стабільні індекси архівних записів за номером релізу від найстарішого до найновішого, разом зі станом `опубліковано` / `у черзі` / `скасовано` / `ще не внесено`.
- `/news_archive_find [реліз]` — знайти поточний архівний індекс за номером релізу, наприклад `/news_archive_find 0.4.4`, щоб потім використати `/news_archive_preview [номер]` або `/news_archive_post [номер]`.
- `/news_archive_preview [номер]` — показати один архівний запис у тому вигляді, в якому він піде в Telegram, але нічого не публікувати.
- `/news_archive_post [номер]` — вручну опублікувати рівно один архівний запис із deployed `news.md`. Команда не ставить у чергу всі старі новини й не дублює запис, якщо той самий `contentHash` уже опублікований.
- `/news_archive_force_post [номер]` — явно повторно передати архівний запис із deployed `news.md` за його поточним індексом. Це створює нове Telegram-повідомлення, позначене як архівний repost, і не намагається відновити старий timestamp.
- `/news_archive_reload` — явне повторне перечитування deployed `news.md`; зараз кешу немає, команда поводиться як повторний `/news_archive_list`.
- `/queue_world_digest` — поставити світовий запис в outbox без негайної публікації.
- `/post_world_digest` — поставити і одразу опублікувати світовий запис.
- `/chronicles_pending` — показати до 10 публічних chronicle rows, які ще не мають relay marker і можуть бути передані у `HERALD_CHRONICLE_RELAY_CHAT_ID`.
- `/publish_chronicles` — вручну запустити один relay tick для хронік, не чіпаючи ordinary news publication queue.
- `/chronicles_backfill_players` — ідемпотентно створити пропущені `Chronicle: new_player` rows з `Player.createdAt`, щоб давніші появи могли потрапити в `/chronicles` і, за ввімкненого relay, поступово до чату.

## Publication Semantics

- Existing `HeraldPublication` rows from before the snapshot migration may have no `renderedText`, but they still retain `title` and `body`. Queueing the same `contentHash` again can safely fill missing snapshot metadata instead of creating another publication row.
- `/mark_publication_deleted` is advisory DB state. Telegram does not reliably send the Herald a webhook/update when a channel message is manually deleted, and this command does not delete anything in Telegram.
- `/repost_publication` intentionally creates a new Telegram message from the saved snapshot. It is an explicit admin repost, not a restoration of the old channel timestamp or original message id.
- `/pause_publications` stops future automatic publisher-loop sends between publication attempts. It does not cancel a Telegram `sendMessage` call that has already started; that in-flight send may still complete and then be marked/logged normally.
- `/forget_published_news confirm` deletes published `NEWS_MD` / `NEWS_MD_ARCHIVE` rows from the outbox history so their `contentHash` can be queued again from the deployed `news.md`. It is an explicit recovery command: Telegram channel messages stay untouched and any future reposts are new Telegram messages with new timestamps.

## Smoke Checks

Після деплою:

1. Відкрити `GET /health`.
2. Написати боту `/ping`.
3. Написати `/whoami` з admin account і переконатися, що печатку впізнано.
4. Написати `/preview_latest_news`; якщо `news.md` порожній або немає запису, бот має відповісти м'яко, без stack trace.
5. Якщо канал налаштовано, перевірити `/pending_publications` і ручний `/publish_pending` на тестовому queued записі.

Не публікуйте тестові записи в живий канал, якщо вони не мають лишитися там.
