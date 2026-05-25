import http from "http";
import { config } from "../config";
import { setLastRuntimeError } from "../runtimeState";
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
      <div class="card"><div class="metric">${stats.totals.occupiedAnimalLocations}/${stats.totals.locationCount}</div><div class="label">локацій із живими тваринами</div></div>
      <div class="card"><div class="metric">${c.rabbitBirths}</div><div class="label">зайченят за останні ${stats.recent.eventCount} tick-звітів</div></div>
      <div class="card"><div class="metric">${c.mouseBirths}</div><div class="label">мишенят за останні ${stats.recent.eventCount} tick-звітів</div></div>
      <div class="card"><div class="metric">${c.rabbitsSpread}</div><div class="label">зайців розселилося</div></div>
      <div class="card"><div class="metric">${c.miceSpread}</div><div class="label">мишей розселилося</div></div>
      <div class="card"><div class="metric">${c.oldAgeDeaths}</div><div class="label">смертей від старості</div></div>
    </div>

    <h2>Темп за останнє вікно</h2>
    <p class="muted">Вікно: ${stats.recent.eventCount} tick-звітів, приблизно ${formatNumber(stats.recent.observedMinutes, 1)} хв. Останній tick: ${latest?.tickNumber ?? "немає"}.</p>
    <table><thead><tr><th>Подія</th><th>Сума</th><th>Оцінка на годину</th></tr></thead><tbody>
      <tr><td>Народження зайців</td><td>${c.rabbitBirths}</td><td>${formatNumber(r.rabbitBirths, 1)}</td></tr>
      <tr><td>Народження мишей</td><td>${c.mouseBirths}</td><td>${formatNumber(r.mouseBirths, 1)}</td></tr>
      <tr><td>Розселення зайців</td><td>${c.rabbitsSpread}</td><td>${formatNumber(r.rabbitsSpread, 1)}</td></tr>
      <tr><td>Розселення мишей</td><td>${c.miceSpread}</td><td>${formatNumber(r.miceSpread, 1)}</td></tr>
      <tr><td>Об'їдені ресурси</td><td>${c.overgrazedResources}</td><td>${formatNumber(r.overgrazedResources, 1)}</td></tr>
      <tr><td>Виснажені вузли від випасу</td><td>${c.depletedByOvergrazing}</td><td>${formatNumber(r.depletedByOvergrazing, 1)}</td></tr>
      <tr><td>Смерті від старості</td><td>${c.oldAgeDeaths}</td><td>${formatNumber(r.oldAgeDeaths, 1)}</td></tr>
      <tr><td>Зниклі трупи</td><td>${c.corpsesGone}</td><td>${formatNumber(r.corpsesGone, 1)}</td></tr>
      <tr><td>Відновлені ресурсні вузли</td><td>${c.regenerated}</td><td>${formatNumber(r.regenerated, 1)}</td></tr>
    </tbody></table>

    <h2>Тварини за віком</h2>
    <table><thead><tr><th>Ключ</th><th>Вид</th><th>Усього</th><th>Живі</th><th>Діти</th><th>Молоді</th><th>Дорослі</th><th>Старі</th><th>Трупи</th><th>Зниклі</th></tr></thead><tbody>${renderStatTableRows(stats.speciesRows)}</tbody></table>

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

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!doctype html><html lang="uk"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Chornolis Marches status</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 18px;background:#10170f;color:#e8e0c9} .card{border:1px solid #3b4a2f;border-radius:16px;padding:18px;background:#172114} code{color:#d8b55d} li{margin:8px 0} a{color:#d8b55d} .actions a{display:inline-block;border:1px solid #5d6f3c;border-radius:8px;padding:8px 10px;margin-right:8px;text-decoration:none;background:#1d2a18}</style></head><body><h1>🌲 Chornolis Marches</h1><div class="card"><p>Status: <strong>online</strong></p><p>Version: <strong>${escapeHtml(status.version)}</strong></p><p>Players: ${status.playersCount}</p><p>Regions: ${status.regionsCount}</p><p>Locations: ${status.locationsCount}</p><p>Exits: ${status.exitsCount}</p><p>Alive animals: ${status.aliveAnimalsCount}</p><p>Animal corpses: ${status.animalCorpsesCount}</p><p>Gone animals: ${status.goneAnimalsCount}</p><p>NPC / non-animals: ${status.npcCount}</p><p>Alive creatures total: ${status.aliveCreaturesCount}</p><p>Resource nodes: ${status.resourcesCount}</p><p>World events: ${status.eventsCount}</p><p>Latest events:</p><ol>${renderEvents(status.latestEvents)}</ol><p>Last runtime error: <code>${escapeHtml(status.lastRuntimeError ?? "none")}</code></p></div><p class="actions"><a href="/stat">Екологія /stat</a><a href="/health">Health JSON</a></p></body></html>`);
      } catch (error) {
        setLastRuntimeError(error);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: String(error) }));
      }
    })
    .listen(config.port, () => console.log(`Server running on port ${config.port}`));
}
