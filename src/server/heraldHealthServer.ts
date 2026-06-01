import http from "http";
import { config } from "../config";

const HERALD_HEALTH_HOST = "0.0.0.0";

export function startHeraldHealthServer() {
  http
    .createServer((req, res) => {
      const path = req.url?.split("?")[0] ?? "/";

      if (req.method === "GET" && path === "/health") {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({
          ok: true,
          service: "herald",
          name: "Канцелярія Межового Знаку",
          version: config.appVersion,
        }));
        return;
      }

      if (req.method === "GET" && path === "/") {
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Канцелярія Межового Знаку active");
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("not found");
    })
    .listen(config.port, HERALD_HEALTH_HOST, () => {
      console.log(`Herald health server running on ${HERALD_HEALTH_HOST}:${config.port}`);
    });
}
