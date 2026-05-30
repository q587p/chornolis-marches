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

- Later notification preferences:
  - no reminders;
  - minimal reminders;
  - normal reminders;
  - companion chatter on/off.
- Potential future social visibility:
  - active;
  - quiet/AFK;
  - absent.

## Not Now

Do not move Auto-AFK back to backlog: the inactivity timeout belongs to `SES-001-B`. This item is only for richer labels, preferences, visibility and recap design after the MVP controls and send-time guards are stable.
