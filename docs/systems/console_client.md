# Console Client

This is a near-term technical bridge, not the full future MUD server.

## Purpose

Add a small local console client or command harness that can run against the same command/action layer as the Telegram bot. It should let a developer start the app locally, connect as a test character, type commands, and verify the basic game loop without Telegram.

The first goal is repeatable smoke testing, not a polished public client.

## First Scope

- Start locally from the repository with a simple npm script or Node entrypoint.
- Use a dedicated test character or a clearly marked local session.
- Accept plain text commands that already pass through the shared alias/parser layer.
- Print responses in a readable terminal format.
- Cover the beginner/core loop:
  - `/start` or equivalent session setup;
  - `/look`;
  - `/examine`;
  - movement commands;
  - `/me`;
  - `/inventory`;
  - `/sleep tutorial`;
  - `/time`;
  - `/help`;
  - a few inventory actions such as eating berries or lighting a torch when fixtures allow it.
- Avoid duplicating Telegram-only keyboard code.

## Future Test Use

Once the client exists, add scripted command walks that can become smoke/integration tests:

- enter or resume as a test character;
- move through a known short route;
- inspect a feature;
- verify inventory and stamina text;
- enter the tutorial dream and perform the first few tutorial commands;
- fail gracefully on an unknown command.

These tests should complement, not replace, pure parser/unit tests such as `scripts/test/input-aliases.cjs`.

## Design Notes

- Keep Ukrainian player-facing text as the default.
- Do not expose hidden debug values unless the character has technical details enabled.
- Treat this as a stepping stone toward future MUD-like clients and cross-client command parity.
- Prefer reusing the shared command/alias registry as it grows, so Telegram buttons, console commands and future MUD input do not drift apart.
