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

## Environment Variables

Required:

- `DATABASE_URL` — PostgreSQL connection string.
- `HERALD_BOT_TOKEN` — токен окремого Telegram-бота Канцелярії. Не використовуйте токен основного ігрового бота.

Recommended:

- `HERALD_ADMIN_IDS` — comma-separated список Telegram user id, яким дозволені службові команди. Приклад форми: `111111,222222`, без реальних значень у документації чи комітах.
- `HERALD_CHANNEL_ID` — канал, куди Канцелярія публікує записи. Може бути username на кшталт `@channel_name` або numeric id.
- `HERALD_ENABLED` — `true`/`false`. Якщо `false`, automatic publisher loop не стартує; ручні bot commands і health server лишаються runtime-поведінкою самого entrypoint.
- `HERALD_PUBLISH_INTERVAL_MS` — інтервал publisher loop. Мінімально ефективне значення в конфігу: `1000`, дефолт: `30000`.
- `HERALD_STARTUP_NOTICE_ENABLED` — `true`/`false`. Якщо `true`, Канцелярія після старту polling спробує надіслати коротке службове повідомлення в configured startup chat.
- `HERALD_STARTUP_NOTICE_CHAT_ID` — chat id для startup notice. Краще ставити приватний/admin chat, а не публічний канал.
- `PORT` — порт HTTP health server. Render задає його автоматично; локально дефолт `3000`.
- `APP_VERSION` — fallback version label, якщо `package.json` не можна прочитати.

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

## BotFather Commands

Suggested BotFather command list:

```text
ping - перевірити, чи Канцелярія на місці
preview_latest_news - показати останню новину без публікації
post_latest_news - опублікувати останню новину в канал
pending_publications - показати чергу публікацій
publish_pending - опублікувати очікувані записи
preview_world_digest - попередній перегляд дайджесту світу
info - атмосферний запис про персонажа
```

Додаткові службові команди можуть лишатися доступними без BotFather-підказки:

- `/help` — список відомих команд.
- `/whoami` — перевірити, чи впізнано службову печатку.
- `/queue_latest_news` — поставити останню новину в outbox без негайної публікації.
- `/queue_world_digest` — поставити світовий запис в outbox без негайної публікації.
- `/post_world_digest` — поставити і одразу опублікувати світовий запис.

## Smoke Checks

Після деплою:

1. Відкрити `GET /health`.
2. Написати боту `/ping`.
3. Написати `/whoami` з admin account і переконатися, що печатку впізнано.
4. Написати `/preview_latest_news`; якщо `news.md` порожній або немає запису, бот має відповісти м'яко, без stack trace.
5. Якщо канал налаштовано, перевірити `/pending_publications` і ручний `/publish_pending` на тестовому queued записі.

Не публікуйте тестові записи в живий канал, якщо вони не мають лишитися там.
