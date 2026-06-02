# Scribe Audit Trail

This note tracks dangerous scribe/admin tools that should leave a `WorldEvent` audit trail. It is a service-side safety surface, not player-facing lore.

## Current Helper

- `src/services/scribeAudit.ts` exposes `logScribeAction()`.
- Audit events use `WorldEvent.type = SYSTEM`.
- Event titles use `Scribe action: <actionKey>`.
- Descriptions include the scribe player id when known, Telegram id, display name, target/mode/outcome and compact command-specific details.
- The helper is intentionally quiet: it must not send extra Telegram messages by itself.

## Covered

- `/reset world`, `/reset stats`, `/reset full`: after confirmation and after the requested reset work completes, the bot writes one audit event with the reset mode and resulting counters. For `stats` and `full`, this happens after statistic-event cleanup so the audit event is not immediately removed by the cleanup itself.

## Dangerous Tools To Keep Auditing

These commands already require scribe/admin access, but should either use `logScribeAction()` directly or be checked for an equivalent structured `WorldEvent`:

- `/reset world`, `/reset stats`, `/reset full`
- `/teleport`
- `/tutorialReset`
- `/restAdmin`
- `/addCreature`, `/addCreatureCorpse`, `/addResource`, `/addCampfire`, `/addTorch`, `/addLitTorch`, `/addTwigs`, `/addItem`
- `/cleanupCreature`, `/cleanupCreatures`
- `/forceOld`
- `/tick`, `/tickSet`
- `/debugSet`
- name approval/rejection actions in `/playerAdmin`
- future cleanup, moderation, name-review and world-editing tools

## Follow-up

- Prefer the shared helper for new dangerous commands.
- Keep one compact event per confirmed action, not per internal row touched.
- Scribe/admin technical views may later group these events into a dedicated audit page instead of relying only on `/world` history.
