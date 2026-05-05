import http from "http";
import { config } from "../config";
import { setLastRuntimeError } from "../runtimeState";
import { getStatusData } from "../services/status";
import { escapeHtml } from "../utils/text";

export function startHttpServer() {
  http
    .createServer(async (req, res) => {
      try {
        const status = await getStatusData();
        if (req.url === "/health") {
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ ok: true, version: status.version, lastRuntimeError: status.lastRuntimeError, latestEvent: status.latestEvent?.title ?? null }));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!doctype html><html lang="uk"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Chornolis Marches status</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 18px;background:#10170f;color:#e8e0c9} .card{border:1px solid #3b4a2f;border-radius:16px;padding:18px;background:#172114} code{color:#d8b55d}</style></head><body><h1>🌲 Chornolis Marches</h1><div class="card"><p>Status: <strong>online</strong></p><p>Version: <strong>${escapeHtml(status.version)}</strong></p><p>Players: ${status.playersCount}</p><p>Regions: ${status.regionsCount}</p><p>Locations: ${status.locationsCount}</p><p>Exits: ${status.exitsCount}</p><p>Alive animals: ${status.aliveAnimalsCount}</p><p>NPC / non-animals: ${status.npcCount}</p><p>Alive creatures total: ${status.aliveCreaturesCount}</p><p>Resource nodes: ${status.resourcesCount}</p><p>World events: ${status.eventsCount}</p><p>Latest event: <code>${escapeHtml(status.latestEvent?.title ?? "none")}</code></p><p>Last runtime error: <code>${escapeHtml(status.lastRuntimeError ?? "none")}</code></p></div><p><a href="/health" style="color:#d8b55d">/health JSON</a></p></body></html>`);
      } catch (error) {
        setLastRuntimeError(error);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: String(error) }));
      }
    })
    .listen(config.port, () => console.log(`Server running on port ${config.port}`));
}
