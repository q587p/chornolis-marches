# 01 — Project Memory

## Names

- English/project name: **Chornolis Marches**.
- Ukrainian/player-facing name: **Порубіжжя Чорнолісу**.
- Short name: **Chornolis**.
- Repository: `q587p/chornolis-marches` / `https://github.com/q587p/chornolis-marches`.
- Local path that has appeared in prior workflow: `C:\587\chornolis-marches`.

## Product shape

- Telegram-first living liminal frontier sandbox with RPG/MUD roots and a living world.
- Ukrainian/Slavic folklore and mythology, dark fantasy, forest frontier tone.
- MUD-inspired and sandbox-inspired, with S.T.A.L.K.E.R.-style A-Life as a reference for autonomous territory simulation rather than modern-firearm or post-apocalyptic aesthetics.
- Telegram should be one client, not necessarily the only long-term client.
- Possible future split: Game Core + Telegram/Web `/map` + Web admin/status + possible MUD/Telnet gateway.

## Current broad direction

The game should emphasize:

- a world that exists and changes outside the player;
- ecology and creature behavior that can create migration, scarcity, remains, tracks and sudden danger;
- settlements, factions and hostile groups that eventually compete with the forest and each other;
- map traversal and location-based play;
- Ukrainian language, local atmosphere, and mythic/liminal tone;
- skill-based progression without abstract levels, especially through use, observation and apprenticeship;
- small social signals as core interaction, not only flavor;
- meaningful consequences and incomplete information;
- eventual open PvP with settlement guards/bounty-like systems, while keeping MVP manageable.

## Stable design preferences

- Avoid generic MMO vocabulary where a Ukrainian/world-specific term is better.
- Prefer diegetic descriptions over exposed system math in normal player UI.
- Keep technical numbers available through debug/admin modes rather than front-loading them to players.
- Living ecology matters: predators, prey, resource depletion, weather, NPC behavior, and player interventions should eventually connect.
- The game should be able to support peaceful professions, gathering, crafting, herbs, potions, hunting, trapping, fishing, trade, and social systems.

## MVP / early mechanics mentioned across conversations

- Movement across a 2D map with coordinates `(x, y, z)`; currently `z` is usually `0`.
- Location view / Look / Examine-like actions.
- Stamina, HP/body-state, rest, recovery and knockout flow.
- Gather resources: herbs, berries, mushrooms, random available materials.
- Queue/action system for time-consuming actions.
- World tick system for NPCs/animals/actions.
- Debug/admin commands.
- Character name, Ukrainian cases, pronouns, onboarding.

## Identity sentence

> Chornolis Marches is a living liminal frontier sandbox: a borderland between settlement, wilderness and myth, where the world is alive and characters grow through what they actually do, notice and survive.

Ukrainian:

> Порубіжжя Чорнолісу — це лімінальний survival sandbox на межі поселення, дикості й міту, де світ живе сам по собі, а персонажі зростають через те, що справді роблять.
