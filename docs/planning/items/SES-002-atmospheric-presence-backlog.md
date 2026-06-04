---
id: SES-002
title: Atmospheric presence and notification design
status: backlog
type: design
area: session
priority: medium
estimate: 2h
tags:
  - telegram
  - session
  - atmosphere
  - notifications
depends_on:
  - SES-001-A
  - SES-001-B
---

# SES-002: Atmospheric presence and notification design

## Goal

After the practical AFK / End Session / Auto-AFK MVP is stable, make presence feel more like Chornolis without hiding the controls.

## Follow-Up Ideas

- More diegetic labels, if they remain obvious:
  - `🌙 Відійти від стежки`
  - `🌙 Затихнути`
  - `🚪 Піти з лісу`
  - `🚪 Згорнути шлях`
- Possible compromise labels:
  - `🌙 Відійти / AFK`
  - `🚪 Піти з лісу / завершити`
- A richer reminder ladder before Auto-AFK, while preserving the one-reminder-per-scene cap:
  - 0-2 minutes: silence;
  - 2-4 minutes: at most one short nudge;
  - 4-10 minutes: silence or one very short actionable nudge;
  - configured timeout: Auto-AFK.
- Companion verbosity budget:
  - no more than one companion line per player turn;
  - no more than one idle reminder per scene;
  - no repeated reminder text in the same scene;
  - prefer actionable prompts over flavor spam.
- Short return recap:

```text
Ви знову прислухаєтеся до Чорнолісу.
  Ви біля заболоченої стежки. На півдні — туманна просіка, на півночі — темний вільшаник.
```

- Release/news return hint:
  - remember which public news/release entry a player has already seen;
  - when the player returns from AFK or ended session, softly mention if world updates appeared while they were away;
  - keep it compact and point to `Новини` (`/news`) instead of dumping a full changelog into `/start`.
- Later notification preferences:
  - no reminders;
  - minimal reminders;
  - normal reminders;
  - companion chatter on/off.
- Potential future social visibility:
  - active;
  - quiet/AFK;
  - absent.
- Auto-AFK presence should look different from deliberate AFK without exposing a technical state. Possible near-term surfaces:
  - a softer public suffix or description such as "затих біля стежки" instead of only the current AFK wording;
  - a character/profile line that says the person has gone quiet after long silence;
  - observer text that makes it clear this is not an active conversational target.
- End Session should become a stronger atmospheric absence:
  - the character is hidden from ordinary interaction targets while the session is ended;
  - incoming direct interaction should fail softly, e.g. spirits/Порубіжжя have folded the path around them for now;
  - on return through `/start` or a normal game action, show a short reappearance line before or with the usual location context.
- Keep this split clear: Auto-AFK is "quiet but still in the world"; End Session is "not currently reachable for ordinary interaction".

## Look / Examine Presence Surfaces

At least direct character inspection should expose AFK / ended presence in
atmospheric terms, so another player can understand why ordinary interaction may
not get a live response.

Possible wording direction:

- AFK / deliberate away:
  - `Здається, ця людина стоїть поруч, але увагою вже відійшла від стежки.`
  - `Порубіжжя ще тримає її слід тут, та погляд не чіпляється за довколишнє.`
- Auto-AFK / long silence:
  - `Вона затихла біля місцини так, ніби світ прикрив її шумом трави.`
  - `Слід лишився, але відповідь навряд чи прийде одразу.`
- End Session:
  - `Порубіжжя згорнуло довкола неї тиху складку. Вона ніби тут, але не для звичайної розмови.`
  - `Духи стежки сховали цей слід до повернення.`

Surface rules:

- `look <character>` may stay brief, for example one short clause after posture
  or visible held items.
- `examine <character>` should show a clearer presence note when the target is
  AFK, auto-AFK or ended.
- Do not expose raw `presence` enum values, inactivity timestamps, Telegram ids
  or notification settings in ordinary player-facing output.
- Do not imply death, teleportation or punishment. AFK is quiet attention;
  ended session is explicit absence from ordinary interaction.
- Scribe/admin cards may keep exact technical session details separately.

## Not Now

Do not move Auto-AFK back to backlog: the inactivity timeout belongs to `SES-001-B`. This item is only for richer labels, preferences, visibility and recap design after the MVP controls and send-time guards are stable.
