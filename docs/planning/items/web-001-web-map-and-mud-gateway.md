---
id: WEB-001
title: Web map, multi-client game server and limited MUD gateway
status: icebox
area: server
priority: medium
tags:
  - web
  - map
  - mud
  - server
  - multi-client
  - architecture
depends_on:
  - planning-as-code
  - action-queue
  - world-tick
  - map-view-service
---

# WEB-001: Web map, multi-client game server and limited MUD gateway

## Summary

Prepare Chornolis Marches for a future where Telegram is one client among several, not the only way to play.

The first visible step should be a web `/map` page that renders the current forest/frontier map and shows movement of players, NPCs and animals. A later step can expose a limited MUD/Telnet gateway for classic MUD clients.

## Current context

The project is currently a Telegram-first text RPG, but the setting and mechanics already fit a broader MUD-like architecture:

- a cell-based world grid;
- persistent world ticks;
- queued actions for players, NPCs and animals;
- creature movement, aging, corpses and ecology;
- PostgreSQL persistence;
- HTTP status/health server;
- MUD and Ultima Online inspiration.

## Goals

- Keep Telegram as the main MVP client.
- Avoid making Telegram handlers the source of game rules.
- Move toward a shared game core used by Telegram, web and future MUD clients.
- Add a lightweight web map for debugging, observation and atmosphere.
- Keep the first implementation simple enough to ship without a full frontend rewrite.

## Non-goals for the first version

- No full browser client yet.
- No real-time animated map as the first step.
- No public unauthenticated control interface.
- No complete MUD parity with Telegram.
- No replacement for Telegram-native UX.

## Proposed architecture

Game rules should live in shared services:

```txt
game core
  world, actors, movement, actions, ticks, resources, combat

client adapters
  Telegram bot
  Web HTTP pages/API
  future MUD/Telnet gateway
```

A future structure could look like:

```txt
src/
  game/
    commands/
      moveCommand.ts
      lookCommand.ts
      sayCommand.ts
    queries/
      getMapView.ts
      getLocationView.ts
    simulation/
      worldTick.ts
      animalAi.ts

  server/
    httpServer.ts
    routes/
      statusRoute.ts
      healthRoute.ts
      mapRoute.ts
      apiMapRoute.ts

  mud/
    mudServer.ts
    mudSession.ts
    mudCommands.ts

  bot/
    telegramClient.ts
```

## Web `/map` MVP

Add a route:

```txt
/map
```

Possible variants:

```txt
/map?z=0
/map?mode=ascii
/map?mode=grid
/map?debug=1
/api/map.json
```

The first version can render an ASCII/HTML `<pre>` map.

Example style:

```txt
        --- --- ---
       | T |   | $ |
        ---  -  ---
           | @ |
        --- --- ---
```

Suggested symbols:

| Symbol | Meaning |
|---|---|
| `@` | player |
| `M` | settlement / town |
| `T` | herbs / herbalist / trade marker |
| `$` | resources |
| `~` | water / swamp |
| `B` | beast lair / dangerous creature |
| `H` | herbalist |
| `O` | notable object / point of interest |
| `E` | event / encounter |
| `3@2` | compact stack/count marker for crowded cells |

## Map view service

Create a reusable query/service, for example:

```txt
src/services/mapViewService.ts
```

It should return data, not HTML:

```ts
type MapCellView = {
  x: number;
  y: number;
  z: number;
  locationKey: string;
  title: string;
  terrain: string;
  exits: Direction[];
  resources: string[];
  players: { name: string }[];
  creatures: { speciesKey: string; count: number; hostile?: boolean }[];
  marker: string;
};
```

Then render it through adapters:

```txt
renderAsciiMap(cells)
renderHtmlGridMap(cells)
renderJsonMap(cells)
```

This keeps one source of truth for:

- web `/map`;
- Telegram `/map`;
- debug/admin views;
- future MUD `map` command.

## Live updates later

Start static:

```txt
/map
/api/map.json
```

Then add simple polling:

```txt
fetch("/api/map.json")
```

Later, if useful:

```txt
Server-Sent Events
WebSocket
```

SSE is probably enough for world-tick updates and simpler than full bidirectional WebSocket.

## Future MUD gateway

A limited Telnet/MUD adapter could expose commands such as:

```txt
look
map
n / s / e / w / up / down
say <text>
who
inventory
attack <target>
track
help
```

The MUD layer should call the same game services as Telegram. It should not directly mutate the database.

```txt
Telegram handler -> gameService.move()
MUD command      -> gameService.move()
Web button       -> gameService.move()
```

## Security and operations notes

- `/map` can start as public read-only if it does not reveal private user data.
- Debug mode should be protected or disabled in production.
- MUD/Telnet should be disabled by default through env config.
- Avoid exposing Telegram IDs, internal player IDs or exact admin/debug metadata publicly.
- Consider rate limits for public HTTP and future MUD sessions.
- Keep one world tick loop per deployment.

## Suggested first slice

1. Add `MapViewService`.
2. Add `/api/map.json`.
3. Add `/map` as HTML `<pre>`.
4. Add Telegram `/map` using the same service.
5. Add debug-only `/map?debug=1`.
6. Later decide whether MUD gateway is worth implementing.

## Open questions

- Should public `/map` show all player names, anonymized players or only counts?
- Should `/map` show exact animal movement or only signs/tracks?
- Should the map be fully visible or limited by explored/known regions?
- Should MUD access require account linking through Telegram?
- Should the web route eventually become an admin dashboard, public world viewer or player UI?
