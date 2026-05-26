import http from "http";
import fs from "fs";
import path from "path";
import { config } from "../config";
import { buildAllPage, buildWhoData, buildWhoText } from "../handlers/status";
import { setLastRuntimeError } from "../runtimeState";
import { chatLogWindowLabel, getChatLog, normalizeChatLogWindow, publicChatEventType, publicChatLog } from "../services/chatLog";
import { getEcologyStats } from "../services/ecologyStats";
import { adminSecretMatches } from "../services/adminSecret";
import { getStatusData } from "../services/status";
import { escapeHtml } from "../utils/text";

const ADMIN_COOKIE_NAME = "chornolis_admin";
const EMBLEM_PATH = path.join(process.cwd(), "assets", "art", "generated", "emblem-logo-01.png");

function renderEvents(events: any[]) {
  if (events.length === 0) return "<li><code>none</code></li>";
  return events
    .map((event) => {
      const description = event.description ? ` — ${event.description}` : "";
      return `<li><code>${escapeHtml(`#${event.id} ${event.title}${description}`)}</code></li>`;
    })
    .join("");
}

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString("uk-UA", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function formatDate(value: Date) {
  return value.toISOString().replace("T", " ").slice(0, 19);
}

function parseQuery(url: string | undefined) {
  return new URL(url ?? "/", "http://localhost");
}

function parseCookies(header: string | undefined) {
  const cookies = new Map<string, string>();
  for (const part of String(header ?? "").split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) continue;
    cookies.set(rawName, decodeURIComponent(rawValue.join("=") ?? ""));
  }
  return cookies;
}

function readRequestBody(req: http.IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function hasAdminSecretCookie(req: http.IncomingMessage) {
  const value = parseCookies(req.headers.cookie).get(ADMIN_COOKIE_NAME);
  return Boolean(value && adminSecretMatches(value));
}

function renderAdminSecretForm(error?: string, targetPath = "/all", title = "Службовий доступ") {
  const errorHtml = error ? `<p class="error">${escapeHtml(error)}</p>` : "";
  const disabled = config.adminSetSecret ? "" : " disabled";
  const hint = config.adminSetSecret ? "Введіть ADMIN_SET_SECRET, щоб відкрити службову сторінку." : "ADMIN_SET_SECRET не налаштовано в середовищі.";
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Chornolis /all</title><style>
    body{font-family:system-ui,sans-serif;max-width:560px;margin:40px auto;padding:0 18px;background:#10170f;color:#e8e0c9}
    .card{border:1px solid #3b4a2f;border-radius:8px;padding:18px;background:#172114}
    label{display:block;margin:0 0 8px;color:#f1d98a}
    input{box-sizing:border-box;width:100%;padding:10px;border:1px solid #5d6f3c;border-radius:6px;background:#10170f;color:#e8e0c9}
    button{margin-top:12px;border:1px solid #5d6f3c;border-radius:6px;padding:10px 12px;background:#1d2a18;color:#e8e0c9;cursor:pointer}
    button:disabled{opacity:.55;cursor:not-allowed}
    a{color:#d8b55d}.muted{color:#b9b08f}.error{color:#ffb0a3}
  </style></head><body><h1>${escapeHtml(title)}</h1><div class="card">${errorHtml}<p class="muted">${escapeHtml(hint)}</p><form method="post" action="${escapeHtml(targetPath)}"><label for="secret">ADMIN_SET_SECRET</label><input id="secret" name="secret" type="password" autocomplete="current-password"${disabled}/><button type="submit"${disabled}>Відкрити</button></form></div><p><a href="/">На головну</a></p></body></html>`;
}

function adminCookieHeader(secret: string) {
  return `${ADMIN_COOKIE_NAME}=${encodeURIComponent(secret)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`;
}

function pageInfoFromAllText(text: string) {
  const match = text.match(/Сторінка\s+(\d+)\/(\d+)/);
  if (!match) return { page: 0, totalPages: 1 };
  return { page: Math.max(0, Number(match[1]) - 1), totalPages: Math.max(1, Number(match[2])) };
}

async function renderAllPage(url: string | undefined) {
  const parsed = parseQuery(url);
  const showDead = parsed.searchParams.get("mode") === "dead" || parsed.searchParams.get("dead") === "1";
  const requestedPage = Math.max(0, Number(parsed.searchParams.get("page") ?? 0) || 0);
  const page = await buildAllPage(showDead, requestedPage);
  const info = pageInfoFromAllText(page.text);
  const mode = showDead ? "dead" : "live";
  const prev = info.page > 0 ? `/all?mode=${mode}&page=${info.page - 1}` : null;
  const next = info.page < info.totalPages - 1 ? `/all?mode=${mode}&page=${info.page + 1}` : null;
  const otherMode = showDead ? "/all?mode=live" : "/all?mode=dead";
  const otherLabel = showDead ? "Тільки живі" : "Усі записи";

  return `<!doctype html><html lang="uk"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Chornolis /all</title><style>
    body{font-family:system-ui,sans-serif;max-width:1120px;margin:32px auto;padding:0 18px;background:#10170f;color:#e8e0c9}
    a{color:#d8b55d}
    pre{white-space:pre-wrap;border:1px solid #3b4a2f;border-radius:8px;padding:14px;background:#172114;line-height:1.35}
    .actions a{display:inline-block;border:1px solid #5d6f3c;border-radius:8px;padding:8px 10px;margin:0 8px 8px 0;text-decoration:none;background:#1d2a18}
    .muted{color:#b9b08f}
  </style></head><body>
    <h1>Службовий /all</h1>
    <p class="muted">Доступ захищено ADMIN_SET_SECRET.</p>
    <p class="actions"><a href="/">Status</a><a href="/stat">/stat</a><a href="/chat">/chat</a><a href="/who">/who</a><a href="${otherMode}">${otherLabel}</a>${prev ? `<a href="${prev}">Назад</a>` : ""}${next ? `<a href="${next}">Далі</a>` : ""}</p>
    <pre>${escapeHtml(page.text)}</pre>
    <p class="actions">${prev ? `<a href="${prev}">Назад</a>` : ""}${next ? `<a href="${next}">Далі</a>` : ""}</p>
  </body></html>`;
}

async function renderWhoPage() {
  const [text, data] = await Promise.all([buildWhoText(), buildWhoData()]);
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Chornolis /who</title><style>
    body{font-family:system-ui,sans-serif;max-width:760px;margin:32px auto;padding:0 18px;background:#10170f;color:#e8e0c9}
    a{color:#d8b55d}
    pre{white-space:pre-wrap;border:1px solid #3b4a2f;border-radius:8px;padding:14px;background:#172114;line-height:1.35}
    .actions a{display:inline-block;border:1px solid #5d6f3c;border-radius:8px;padding:8px 10px;margin:0 8px 8px 0;text-decoration:none;background:#1d2a18}
    .muted{color:#b9b08f}
  </style></head><body>
    <h1>Хто активний</h1>
    <p class="muted">Публічний список персонажів, активних за останню реальну годину.</p>
    <div class="actions"><span>Разом персонажів: ${data.totalCount}</span></div>
    <p class="actions"><a href="/">Status</a><a href="/stat">/stat</a><a href="/chat">/chat</a><a href="/who.json">JSON</a></p>
    <pre>${escapeHtml(text)}</pre>
  </body></html>`;
}

function renderWorldPage(status: Awaited<ReturnType<typeof getStatusData>>) {
  const queue = status.actionQueue;
  const queueHtml = `<h2>Черга дій</h2><p>Гравці: очікує=${queue.playerQueued}, виконується=${queue.playerRunning}</p><p>Істоти: очікує=${queue.creatureQueued}, виконується=${queue.creatureRunning}</p><p>Разом: очікує=${queue.totalQueued}, виконується=${queue.totalRunning}, прострочено=${queue.overdueRunning}</p><p>Найстаріша дія в черзі: ${Math.round(queue.oldestQueuedAgeMs / 1000)} с; найбільше прострочення: ${Math.round(queue.maxOverdueMs / 1000)} с</p>`;
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Chornolis world status</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 18px;background:#10170f;color:#e8e0c9}.card{border:1px solid #3b4a2f;border-radius:16px;padding:18px;background:#172114}code{color:#d8b55d}li{margin:8px 0}a{color:#d8b55d}.actions a{display:inline-block;border:1px solid #5d6f3c;border-radius:8px;padding:8px 10px;margin-right:8px;text-decoration:none;background:#1d2a18}</style></head><body><h1>Світ Порубіжжя</h1><div class="card"><p>Статус: <strong>запущено</strong></p><p>Версія: <strong>${escapeHtml(status.version)}</strong></p><p>Гравців: ${status.playersCount}</p><p>Регіонів: ${status.regionsCount}</p><p>Місцин: ${status.locationsCount}</p><p>Переходів: ${status.exitsCount}</p><p>Живих тварин: ${status.aliveAnimalsCount}</p><p>Трупів тварин: ${status.animalCorpsesCount}</p><p>Зниклих тварин: ${status.goneAnimalsCount}</p><p>NPC / не-тварин: ${status.npcCount}</p><p>Живих істот загалом: ${status.aliveCreaturesCount}</p><p>Ресурсних вузлів: ${status.resourcesCount}</p><p>Подій світу: ${status.eventsCount}</p>${queueHtml}<p>Останні події:</p><ol>${renderEvents(status.latestEvents)}</ol><p>Остання runtime-помилка: <code>${escapeHtml(status.lastRuntimeError ?? "немає")}</code></p></div><p class="actions"><a href="/">Головна</a><a href="/stat">Екологія /stat</a><a href="/chat">Репліки /chat</a><a href="/who">Хто активний /who</a><a href="/all">Службовий /all</a><a href="/health">Health JSON</a></p></body></html>`;
}

async function renderHomePage(status: Awaited<ReturnType<typeof getStatusData>>) {
  const who = await buildWhoData();
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Порубіжжя Чорнолісу</title><style>
    body{font-family:system-ui,sans-serif;margin:0;background:#10170f;color:#e8e0c9;line-height:1.55}
    main{max-width:1120px;margin:0 auto;padding:42px 18px;display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:32px;align-items:start}
    h1{margin:0 0 12px;font-size:34px;color:#f1d98a}
    h2{margin:26px 0 10px;font-size:21px;color:#f1d98a}
    p{margin:0 0 12px}
    .card{border:1px solid #3b4a2f;border-radius:8px;padding:18px;background:#172114}
    .status{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:18px 0}
    .metric{border:1px solid #2d3a25;border-radius:8px;padding:12px;background:#1d2a18}
    .label{font-size:13px;color:#b9b08f}.value{font-size:24px;font-weight:700;color:#f1d98a}
    .emblem{width:100%;max-width:340px;justify-self:center;opacity:.96}
    a{color:#d8b55d}.actions a{display:inline-block;border:1px solid #5d6f3c;border-radius:8px;padding:8px 10px;margin:0 8px 8px 0;text-decoration:none;background:#1d2a18}
    ul{padding-left:22px;margin:10px 0 0}
    li{margin:6px 0}
    .muted{color:#b9b08f}.lead{font-size:18px;color:#efe5c9}.section{margin-top:18px}.tech{color:#d7cfb3}.tone{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;padding-left:0;list-style:none}.tone li{border-left:3px solid #5d6f3c;padding-left:10px}.tone li:last-child{grid-column:1/-1;max-width:620px}
    @media (max-width:720px){main{grid-template-columns:1fr;padding-top:28px}.emblem{max-width:240px;grid-row:1}}
  </style></head><body><main>
    <section class="card">
      <h1>Порубіжжя Чорнолісу</h1>
      <p class="lead">Текстова Telegram-RPG із живою екосистемою, натхненна MUD-ами, Ultima Online, S.T.A.L.K.E.R. A-Life, Dwarf Fortress і українським фольклором.</p>
      <div class="status">
        <div class="metric"><div class="label">Статус</div><div class="value">запущено</div></div>
        <div class="metric"><div class="label">Версія</div><div class="value">${escapeHtml(status.version)}</div></div>
        <div class="metric"><div class="label">У /who</div><div class="value">${who.totalCount}</div></div>
      </div>
      <p class="muted">У /who зараз: ${who.totalCount} персонажів.</p>
      <p class="actions"><a href="/who">Хто активний /who</a><a href="/stat">Екологія /stat</a><a href="/chat">Репліки /chat</a><a href="/world">Світ /world</a><a href="/all">Службовий /all</a><a href="/health">Health JSON</a></p>

      <div class="section">
        <h2>Що це</h2>
        <p>Chornolis Marches — жива симуляція пограниччя, де дикі місця, поселення, істоти, сліди, ресурси й давні сили продовжують рухатися навіть тоді, коли гравець не дивиться.</p>
        <p class="tech">Технічно це клітинковий світ із PostgreSQL-персистентністю, деплоєм на Render, світовими тіками, старінням істот, життєвим циклом трупів, пріоритетними універсальними чергами дій, станами снаги й відпочинку, слідами, що згасають, і легкою Telegram-native взаємодією.</p>
      </div>

      <div class="section">
        <h2>Бачення</h2>
        <p>Це не героїчний MMO-парк атракціонів. Світ має відчуватися старішим, дивнішим і менш контрольованим за гравця. Поселення тримаються лише там, де люди ще здатні відтискати ліс, звірів і те, що ходить забутими місцями вночі.</p>
        <ul>
          <li>Дика місцевість існує незалежно від гравця.</li>
          <li>Дослідження небезпечне, неповне й непевне.</li>
          <li>Хижаки полюють, конкурують, старіють, помирають і міґрують.</li>
          <li>Ресурси ростуть, поширюються, виснажуються й повертаються в землю.</li>
          <li>Трупи, рештки й покинуті місця знову годують ліс.</li>
          <li>Сліди, запахи, кров і знаки присутності з часом зникають.</li>
          <li>Фракції, поселення й ворожі групи борються за виживання.</li>
          <li>Гравці втручаються в екосистеми, шляхи обміну й місцеву рівновагу.</li>
          <li>Межа між поселенням і дикістю постійно зсувається.</li>
          <li>Міт, духи й старі місця стають небезпечнішими вночі.</li>
          <li>Дії тривають у часі, стають у чергу, перериваються, спостерігаються й запам'ятовуються світом.</li>
        </ul>
      </div>

      <div class="section">
        <h2>Тон</h2>
        <p>Порубіжжя Чорнолісу ближче до живого симулятора пограниччя, ніж до традиційної MMORPG.</p>
        <ul class="tone">
          <li>небезпечно</li>
          <li>лімінально</li>
          <li>частково непізнавано</li>
          <li>живо без гравця</li>
          <li>сформовано міґрацією, нестачею, пам'яттю й старими силами</li>
        </ul>
      </div>
    </section>
    <img class="emblem" src="/assets/art/generated/emblem-logo-01.png" alt="Емблема Порубіжжя Чорнолісу"/>
  </main></body></html>`;
}

function renderChatRows(events: Awaited<ReturnType<typeof getChatLog>>["events"]) {
  if (events.length === 0) return `<tr><td colspan="5"><code>none</code></td></tr>`;
  return events
    .map((event) => `<tr>
      <td><code>${escapeHtml(formatDate(event.createdAt))}</code></td>
      <td>${escapeHtml(publicChatEventType(event))}</td>
      <td>${event.location ? escapeHtml(event.location.name) : "<span class=\"muted\">невідомо</span>"}</td>
      <td>${escapeHtml(event.title)}</td>
      <td><blockquote>${escapeHtml(event.description ?? "")}</blockquote></td>
    </tr>`)
    .join("");
}

async function renderChatPage(url: string | undefined) {
  const parsed = parseQuery(url);
  const window = normalizeChatLogWindow(parsed.searchParams.get("hours"));
  const page = Math.max(0, Number(parsed.searchParams.get("page") ?? 0) || 0);
  const perPage = Math.max(1, Math.min(Number(parsed.searchParams.get("perPage") ?? 50) || 50, 100));
  const log = await getChatLog({ window, page, perPage });
  const prev = log.page > 0 ? `/chat?hours=${chatLogWindowLabel(log.window) === "увесь час" ? "all" : log.window}&page=${log.page - 1}&perPage=${log.perPage}` : null;
  const next = log.page < log.totalPages - 1 ? `/chat?hours=${chatLogWindowLabel(log.window) === "увесь час" ? "all" : log.window}&page=${log.page + 1}&perPage=${log.perPage}` : null;

  return `<!doctype html><html lang="uk"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Chornolis chat log</title><style>
    body{font-family:system-ui,sans-serif;max-width:1120px;margin:32px auto;padding:0 18px;background:#10170f;color:#e8e0c9}
    a{color:#d8b55d}
    table{width:100%;border-collapse:collapse;margin:12px 0 24px;background:#172114;border:1px solid #3b4a2f}
    th,td{border-bottom:1px solid #2d3a25;padding:8px;text-align:left;vertical-align:top}
    th{color:#f1d98a;background:#1d2a18}
    code{color:#d8b55d}
    blockquote{margin:0;border-left:3px solid #d8b55d;padding-left:10px;white-space:pre-wrap}
    .muted{color:#b9b08f}
    .actions a{display:inline-block;border:1px solid #5d6f3c;border-radius:8px;padding:8px 10px;margin-right:8px;text-decoration:none;background:#1d2a18}
  </style></head><body>
    <h1>Репліки Порубіжжя</h1>
    <p class="muted">Вікно: ${escapeHtml(chatLogWindowLabel(log.window))}. Сторінка ${log.page + 1}/${log.totalPages}; записів ${log.total}.</p>
    <p class="actions">
      <a href="/chat?hours=1">1 год</a><a href="/chat?hours=24">24 год</a><a href="/chat?hours=all">Усі</a><a href="/chat.json?hours=${log.window === "all" ? "all" : log.window}&page=${log.page}&perPage=${log.perPage}">JSON</a><a href="/who">/who</a><a href="/">Status</a>
    </p>
    <table><thead><tr><th>Час</th><th>Тип</th><th>Місцина</th><th>Мовець</th><th>Текст</th></tr></thead><tbody>${renderChatRows(log.events)}</tbody></table>
    <p class="actions">${prev ? `<a href="${prev}">Назад</a>` : ""}${next ? `<a href="${next}">Далі</a>` : ""}</p>
  </body></html>`;
}

type EcologyStats = Awaited<ReturnType<typeof getEcologyStats>>;

function renderStatTableRows(rows: EcologyStats["speciesRows"]) {
  if (rows.length === 0) return `<tr><td colspan="10"><code>none</code></td></tr>`;
  return rows
    .map((row) => `<tr>
      <td><code>${escapeHtml(row.key)}</code></td>
      <td>${escapeHtml(row.name)}</td>
      <td>${row.total}</td>
      <td>${row.alive}</td>
      <td>${row.ages.CHILD}</td>
      <td>${row.ages.YOUNG}</td>
      <td>${row.ages.ADULT}</td>
      <td>${row.ages.OLD}</td>
      <td>${row.corpses}</td>
      <td>${row.gone}</td>
    </tr>`)
    .join("");
}

function renderResourceRows(rows: EcologyStats["resourceRows"]) {
  if (rows.length === 0) return `<tr><td colspan="5"><code>none</code></td></tr>`;
  return rows
    .map((row) => `<tr>
      <td><code>${escapeHtml(row.key)}</code></td>
      <td>${escapeHtml(row.name)}</td>
      <td>${row.nodes}</td>
      <td>${row.amount} / ${row.maxAmount}</td>
      <td>${row.percent}%</td>
    </tr>`)
    .join("");
}

function renderTopHunterRows(rows: EcologyStats["topHunters"]) {
  if (rows.length === 0) return `<tr><td colspan="7"><code>none</code></td></tr>`;
  return rows
    .map((row) => `<tr>
      <td><code>#${row.id}</code></td>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.speciesName)} <code>${escapeHtml(row.speciesKey)}</code></td>
      <td>${row.isAlive ? "жива" : "труп/неактивна"}</td>
      <td>${row.attackAttempts}</td>
      <td>${row.successfulAttacks}</td>
      <td>${row.kills}</td>
    </tr>`)
    .join("");
}

function renderTopPlayerRows(rows: EcologyStats["topPlayers"]) {
  if (rows.length === 0) return `<tr><td colspan="8"><code>none</code></td></tr>`;
  return rows
    .map((row) => `<tr>
      <td><code>#${row.id}</code></td>
      <td>${escapeHtml(row.name)}</td>
      <td>${row.locationName ? escapeHtml(row.locationName) : "<span class=\"muted\">невідомо</span>"}</td>
      <td>${formatNumber(row.animalsKilled)}</td>
      <td>${formatNumber(row.successfulGathers)}</td>
      <td>${formatNumber(row.greetings)}</td>
      <td>${formatNumber(row.says)}</td>
      <td>${formatNumber(row.steps)}</td>
    </tr>`)
    .join("");
}

async function renderEcologyStatsPage() {
  const stats = await getEcologyStats();
  const c = stats.recent.counters;
  const r = stats.recent.ratesPerHour;
  const latest = stats.latestTick;

  return `<!doctype html><html lang="uk"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta http-equiv="refresh" content="${stats.refreshSeconds}"/><title>Chornolis ecology stats</title><style>
    body{font-family:system-ui,sans-serif;max-width:1120px;margin:32px auto;padding:0 18px;background:#10170f;color:#e8e0c9}
    a{color:#d8b55d}
    .top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin:18px 0}
    .card{border:1px solid #3b4a2f;border-radius:8px;padding:14px;background:#172114}
    .metric{font-size:28px;font-weight:700;color:#f1d98a}
    .label{font-size:13px;color:#b9b08f}
    table{width:100%;border-collapse:collapse;margin:12px 0 24px;background:#172114;border:1px solid #3b4a2f}
    th,td{border-bottom:1px solid #2d3a25;padding:8px;text-align:left;vertical-align:top}
    th{color:#f1d98a;background:#1d2a18}
    code{color:#d8b55d}
    .muted{color:#b9b08f}
    .actions a{display:inline-block;border:1px solid #5d6f3c;border-radius:8px;padding:8px 10px;margin-right:8px;text-decoration:none;background:#1d2a18}
  </style></head><body>
    <div class="top">
      <div>
        <h1>Екологія Чорнолісу</h1>
        <p class="muted">Оновлено: ${escapeHtml(formatDate(stats.generatedAt))}. Auto-refresh: ${stats.refreshSeconds} с. Tick: ${stats.timing.tickMs} ms.</p>
      </div>
      <div class="actions"><a href="/stat">Оновити вручну</a><a href="/stat.json">JSON</a><a href="/who">/who</a><a href="/">Status</a></div>
    </div>

    <div class="grid">
      <div class="card"><div class="metric">${stats.totals.aliveAnimals}</div><div class="label">живих тварин</div></div>
      <div class="card"><div class="metric">${stats.totals.totalAnimals}</div><div class="label">тваринних записів загалом</div></div>
      <div class="card"><div class="metric">${stats.totals.occupiedAnimalLocations}/${stats.totals.locationCount}</div><div class="label">місцин із живими тваринами</div></div>
      <div class="card"><div class="metric">${c.rabbitBirths}</div><div class="label">зайченят за останні ${stats.recent.eventCount} tick-звітів</div></div>
      <div class="card"><div class="metric">${c.mouseBirths}</div><div class="label">мишенят за останні ${stats.recent.eventCount} tick-звітів</div></div>
      <div class="card"><div class="metric">${c.foxBirths}</div><div class="label">лисенят за останні ${stats.recent.eventCount} tick-звітів</div></div>
      <div class="card"><div class="metric">${c.wolfBirths}</div><div class="label">вовченят за останні ${stats.recent.eventCount} tick-звітів</div></div>
      <div class="card"><div class="metric">${c.rabbitsSpread}</div><div class="label">зайців розселилося</div></div>
      <div class="card"><div class="metric">${c.miceSpread}</div><div class="label">мишей розселилося</div></div>
      <div class="card"><div class="metric">${c.oldAgeDeaths}</div><div class="label">смертей від старості</div></div>
      <div class="card"><div class="metric">${c.predatorKills}</div><div class="label">смертей від хижаків у вікні</div></div>
      <div class="card"><div class="metric">${stats.totals.predatorKills}</div><div class="label">смертей від хижаків загалом</div></div>
    </div>

    <h2>Темп за останнє вікно</h2>
    <p class="muted">Вікно: ${stats.recent.eventCount} tick-звітів, приблизно ${formatNumber(stats.recent.observedMinutes, 1)} хв. Останній tick: ${latest?.tickNumber ?? "немає"}.</p>
    <table><thead><tr><th>Подія</th><th>Сума</th><th>Оцінка на годину</th></tr></thead><tbody>
      <tr><td>Народження зайців</td><td>${c.rabbitBirths}</td><td>${formatNumber(r.rabbitBirths, 1)}</td></tr>
      <tr><td>Народження мишей</td><td>${c.mouseBirths}</td><td>${formatNumber(r.mouseBirths, 1)}</td></tr>
      <tr><td>Народження лисиць</td><td>${c.foxBirths}</td><td>${formatNumber(r.foxBirths, 1)}</td></tr>
      <tr><td>Народження вовків</td><td>${c.wolfBirths}</td><td>${formatNumber(r.wolfBirths, 1)}</td></tr>
      <tr><td>Розселення зайців</td><td>${c.rabbitsSpread}</td><td>${formatNumber(r.rabbitsSpread, 1)}</td></tr>
      <tr><td>Розселення мишей</td><td>${c.miceSpread}</td><td>${formatNumber(r.miceSpread, 1)}</td></tr>
      <tr><td>Prey units для лисиць</td><td>${c.foxPreyUnits}</td><td>${formatNumber(r.foxPreyUnits, 1)}</td></tr>
      <tr><td>Prey units для вовків</td><td>${c.wolfPreyUnits}</td><td>${formatNumber(r.wolfPreyUnits, 1)}</td></tr>
      <tr><td>Об'їдені ресурси</td><td>${c.overgrazedResources}</td><td>${formatNumber(r.overgrazedResources, 1)}</td></tr>
      <tr><td>Виснажені вузли від випасу</td><td>${c.depletedByOvergrazing}</td><td>${formatNumber(r.depletedByOvergrazing, 1)}</td></tr>
      <tr><td>Смерті від старості</td><td>${c.oldAgeDeaths}</td><td>${formatNumber(r.oldAgeDeaths, 1)}</td></tr>
      <tr><td>Смерті від хижаків</td><td>${c.predatorKills}</td><td>${formatNumber(r.predatorKills, 1)}</td></tr>
      <tr><td>Зниклі трупи</td><td>${c.corpsesGone}</td><td>${formatNumber(r.corpsesGone, 1)}</td></tr>
      <tr><td>Відновлені ресурсні вузли</td><td>${c.regenerated}</td><td>${formatNumber(r.regenerated, 1)}</td></tr>
    </tbody></table>

    <h2>Тварини за віком</h2>
    <table><thead><tr><th>Ключ</th><th>Вид</th><th>Усього</th><th>Живі</th><th>Діти</th><th>Молоді</th><th>Дорослі</th><th>Старі</th><th>Трупи</th><th>Зниклі</th></tr></thead><tbody>${renderStatTableRows(stats.speciesRows)}</tbody></table>

    <h2>Найвдаліші хижаки</h2>
    <table><thead><tr><th>ID</th><th>Ім'я</th><th>Вид</th><th>Стан</th><th>Атак</th><th>Влучних атак</th><th>Убивств</th></tr></thead><tbody>${renderTopHunterRows(stats.topHunters)}</tbody></table>

    <h2>Персонажі Порубіжжя</h2>
    <table><thead><tr><th>ID</th><th>Ім'я</th><th>Місцина</th><th>Вполював/ла</th><th>Зібрав/ла</th><th>Привітань</th><th>Реплік</th><th>Кроків</th></tr></thead><tbody>${renderTopPlayerRows(stats.topPlayers)}</tbody></table>

    <h2>Ресурси</h2>
    <table><thead><tr><th>Ключ</th><th>Назва</th><th>Вузлів</th><th>Кількість</th><th>%</th></tr></thead><tbody>${renderResourceRows(stats.resourceRows)}</tbody></table>

    <h2>Останній World Tick</h2>
    <div class="card"><code>${escapeHtml(latest?.description ?? "немає")}</code></div>
  </body></html>`;
}

export function startHttpServer() {
  http
    .createServer(async (req, res) => {
      try {
        const status = await getStatusData();
        const path = req.url?.split("?")[0] ?? "/";
        if (path === "/assets/art/generated/emblem-logo-01.png") {
          if (!fs.existsSync(EMBLEM_PATH)) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("not found");
            return;
          }
          res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" });
          fs.createReadStream(EMBLEM_PATH).pipe(res);
          return;
        }

        if (req.url === "/health") {
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({
            ok: true,
            version: status.version,
            lastRuntimeError: status.lastRuntimeError,
            playersCount: status.playersCount,
            aliveAnimalsCount: status.aliveAnimalsCount,
            animalCorpsesCount: status.animalCorpsesCount,
            goneAnimalsCount: status.goneAnimalsCount,
            npcCount: status.npcCount,
            actionQueue: status.actionQueue,
            latestEvent: status.latestEvent?.title ?? null,
            latestEvents: status.latestEvents.map((event) => ({
              id: event.id,
              title: event.title,
              description: event.description,
              createdAt: event.createdAt,
            })),
          }));
          return;
        }

        if (path === "/stat.json") {
          const stats = await getEcologyStats();
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify(stats));
          return;
        }

        if (path === "/stat") {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(await renderEcologyStatsPage());
          return;
        }

        if (path === "/chat.json") {
          const parsed = parseQuery(req.url);
          const chat = await getChatLog({
            window: normalizeChatLogWindow(parsed.searchParams.get("hours")),
            page: Number(parsed.searchParams.get("page") ?? 0) || 0,
            perPage: Number(parsed.searchParams.get("perPage") ?? 50) || 50,
          });
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify(publicChatLog(chat)));
          return;
        }

        if (path === "/chat") {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(await renderChatPage(req.url));
          return;
        }

        if (path === "/who.json") {
          const [text, data] = await Promise.all([buildWhoText(), buildWhoData()]);
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({
            since: data.since,
            totalCount: data.totalCount,
            scribeCount: data.scribeCount,
            mixedCount: data.mixedCount,
            scribes: data.scribes,
            characters: data.mixedCharacters,
            text,
          }));
          return;
        }

        if (path === "/who") {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(await renderWhoPage());
          return;
        }

        if (path === "/world") {
          if (!config.adminSetSecret) {
            res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
            res.end(renderAdminSecretForm(undefined, "/world", "Службовий /world"));
            return;
          }

          if (req.method === "POST") {
            const body = new URLSearchParams(await readRequestBody(req));
            const secret = body.get("secret") ?? "";
            if (!adminSecretMatches(secret)) {
              res.writeHead(403, { "Content-Type": "text/html; charset=utf-8" });
              res.end(renderAdminSecretForm("Секрет не збігся.", "/world", "Службовий /world"));
              return;
            }

            res.writeHead(200, {
              "Content-Type": "text/html; charset=utf-8",
              "Set-Cookie": adminCookieHeader(secret),
            });
            res.end(renderWorldPage(status));
            return;
          }

          if (!hasAdminSecretCookie(req)) {
            res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" });
            res.end(renderAdminSecretForm(undefined, "/world", "Службовий /world"));
            return;
          }

          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(renderWorldPage(status));
          return;
        }

        if (path === "/all") {
          if (!config.adminSetSecret) {
            res.writeHead(503, { "Content-Type": "text/html; charset=utf-8" });
            res.end(renderAdminSecretForm(undefined, "/all", "Службовий /all"));
            return;
          }

          if (req.method === "POST") {
            const body = new URLSearchParams(await readRequestBody(req));
            const secret = body.get("secret") ?? "";
            if (!adminSecretMatches(secret)) {
              res.writeHead(403, { "Content-Type": "text/html; charset=utf-8" });
              res.end(renderAdminSecretForm("Секрет не збігся.", "/all", "Службовий /all"));
              return;
            }

            res.writeHead(200, {
              "Content-Type": "text/html; charset=utf-8",
              "Set-Cookie": adminCookieHeader(secret),
            });
            res.end(await renderAllPage(req.url));
            return;
          }

          if (!hasAdminSecretCookie(req)) {
            res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" });
            res.end(renderAdminSecretForm(undefined, "/all", "Службовий /all"));
            return;
          }

          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(await renderAllPage(req.url));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(await renderHomePage(status));
      } catch (error) {
        setLastRuntimeError(error);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: String(error) }));
      }
    })
    .listen(config.port, () => console.log(`Server running on port ${config.port}`));
}
