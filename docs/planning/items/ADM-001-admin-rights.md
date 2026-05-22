---
id: ADM-001
status: backlog
area: admin
tags:
  - admin
  - permissions
  - reset
priority: high
depends_on: []
---

# Admin permissions and restricted reset

`/adminHelp` and `/reset` are intentionally open during early development, but this must not remain true.

## Goal

Add a proper admin rights layer before public testing grows.

## Notes

- Restrict `/reset` to configured Telegram IDs or a database-backed role.
- Keep `/adminHelp` available only to admins or show a limited public version.
- Log who ran `/reset` and when.
- Consider confirmation before destructive admin actions.
