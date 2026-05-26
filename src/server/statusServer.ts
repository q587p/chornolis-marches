import http from "http";
import { config } from "../config";
import { setLastRuntimeError } from "../runtimeState";
import { chatLogWindowLabel, getChatLog, normalizeChatLogWindow } from "../services/chatLog";
import { getEcologyStats } from "../services/ecologyStats";
import { getStatusData } from "../services/status";
import { escapeHtml } from "../utils/text";

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

function renderChatRows(events: Awaited<ReturnType<typeof getChatLog>>["events"]) {
  if (events.length === 0) return `<tr><td colspan="5"><code>none</code></td></tr>`;
  return events
    .map((event) => `<tr>
      <td><code>${escapeHtml(formatDate(event.createdAt))}</code></td>
      <td>${escapeHtml(event.type)}</td>
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
      <a href="/chat?hours=1">1 год</a><a href="/chat?hours=24">24 год</a><a href="/chat?hours=all">Усі</a><a href="/chat.json?hours=${log.window === "all" ? "all" : log.window}&page=${log.page}&perPage=${log.perPage}">JSON</a><a href="/">Status</a>
    </p>
    <table><thead><tr><th>Час</th><th>Тип</th><th>Місцина</th><th>Подія</th><th>Текст</th></tr></thead><tbody>${renderChatRows(log.events)}</tbody></table>
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
      <div class="actions"><a href="/stat">Оновити вручну</a><a href="/stat.json">JSON</a><a href="/">Status</a></div>
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
          res.end(JSON.stringify(chat));
          return;
        }

        if (path === "/chat") {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(await renderChatPage(req.url));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        const queue = status.actionQueue;
        const queueHtml = `<h2>Action queue</h2><p>Players: queued=${queue.playerQueued}, running=${queue.playerRunning}</p><p>Creatures: queued=${queue.creatureQueued}, running=${queue.creatureRunning}</p><p>Total: queued=${queue.totalQueued}, running=${queue.totalRunning}, overdue=${queue.overdueRunning}</p><p>Oldest queued: ${Math.round(queue.oldestQueuedAgeMs / 1000)}s; max overdue: ${Math.round(queue.maxOverdueMs / 1000)}s</p>`;
        res.end(`<!doctype html><html lang="uk"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Chornolis Marches status</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 18px;background:#10170f;color:#e8e0c9} .card{border:1px solid #3b4a2f;border-radius:16px;padding:18px;background:#172114} code{color:#d8b55d} li{margin:8px 0} a{color:#d8b55d} .actions a{display:inline-block;border:1px solid #5d6f3c;border-radius:8px;padding:8px 10px;margin-right:8px;text-decoration:none;background:#1d2a18}</style></head><body><h1>🌲 Chornolis Marches</h1><div class="card"><p>Status: <strong>online</strong></p><p>Version: <strong>${escapeHtml(status.version)}</strong></p><p>Players: ${status.playersCount}</p><p>Regions: ${status.regionsCount}</p><p>Locations: ${status.locationsCount}</p><p>Exits: ${status.exitsCount}</p><p>Alive animals: ${status.aliveAnimalsCount}</p><p>Animal corpses: ${status.animalCorpsesCount}</p><p>Gone animals: ${status.goneAnimalsCount}</p><p>NPC / non-animals: ${status.npcCount}</p><p>Alive creatures total: ${status.aliveCreaturesCount}</p><p>Resource nodes: ${status.resourcesCount}</p><p>World events: ${status.eventsCount}</p>${queueHtml}<p>Latest events:</p><ol>${renderEvents(status.latestEvents)}</ol><p>Last runtime error: <code>${escapeHtml(status.lastRuntimeError ?? "none")}</code></p></div><p class="actions"><a href="/stat">Екологія /stat</a><a href="/chat">Репліки /chat</a><a href="/health">Health JSON</a></p></body></html>`);
      } catch (error) {
        setLastRuntimeError(error);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: String(error) }));
      }
    })
    .listen(config.port, () => console.log(`Server running on port ${config.port}`));
}
