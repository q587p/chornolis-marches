---
id: SOC-008
title: Speech ranges and vertical voice
status: testing
type: feature
area: social
priority: high
estimate: 2-4h
tags:
  - speech
  - social
  - mud-compatibility
  - stamina
  - verticality
depends_on:
  - SOC-001
---

# SOC-008: Speech Ranges and Vertical Voice

## Goal

Add a clear speech-range ladder so players can talk locally, whisper privately, call to nearby connected locations, shout across a region, and eventually use a rare/gated world-wide announcement layer.

The motivating case is spatial: a character in a tree or tower should be able to call to people below without broadcasting to the whole region.

## Current behavior to preserve

- Ordinary speech already exists as `SAY` through `say` / `сказати` aliases.
- Whisper already exists as targeted `SAY` with `mode: "whisper"`.
- Region-style shouting already exists as `SAY` with `mode: "shout"`.
- Do not accidentally break `say`, `whisper`, `reply` or `/shout`.

## 0.15.5 implementation note

The first slice adds `/yell` / `гукнути` as nearby speech for the current location plus visible outgoing exits, including `UP` and `DOWN`. Vertical location views can expose prompt buttons for `Гукнути вгору` / `Гукнути вниз`; the dream-tree tutorial scene remains a follow-up in `ONB-007`.

## Scope

- Add a nearby/adjacent speech mode, recommended payload mode `"yell"`.
- Add parser aliases:
  - `/yell`, `yell`, `call`;
  - `гукнути`, `покликати`, `крикнути поруч`, `гучно сказати`.
- Keep `/shout` / `shout` / `крикнути` / `волати` region-wide unless explicitly migrated.
- Make nearby voice reach current location plus adjacent authored exits, including `UP` and `DOWN`.
- Add contextual tree/tower vertical voice buttons where relevant:
  - from below/base: `Гукнути вгору` / requested wording `Гукнути вверх`;
  - from above/top: `Гукнути вниз`.
- Make nearby voice cost more Снага than local speech and less than region voice.
- Update help/docs/tests.

## Suggested implementation

### Parser

In `src/input/aliases.ts`:

- add `ParsedAliasCommand` variant `{ kind: "yell"; text: string }`, or introduce a generic speech variant with a mode if the refactor stays small;
- route `yell`, `call`, `гукнути`, `покликати`, `крикнути поруч`, `гучно сказати` to nearby voice;
- keep `shout`, `крикнути`, `волати`, `заволати` as region voice;
- update `slashCommandForAlias` to return `/yell`.

### Handler

In `src/handlers/aliases.ts`:

- add `submitYell` near `submitSay`, `submitWhisper`, `submitReply`, `submitShout`;
- sanitize and cap text like other speech commands;
- enqueue `type: "SAY"`, payload `{ text, mode: "yell" }`;
- use `actionDurationMs("SAY", player.stamina) * 2` as a first pass.

### Completion / delivery

In `src/services/actionCompletions.ts`:

- extend `SayPayload.mode` with `"yell"`;
- add a `payload.mode === "yell"` branch before `"shout"`;
- spend more stamina than local speech, but less than region voice;
- notify current location except speaker;
- notify adjacent locations with direction-flavored text;
- log as `SAY` with a clear event title.

Suggested helper:

```ts
type NearbySpeechLocation = {
  locationId: number;
  fromDirection?: Direction;
};

async function nearbySpeechLocations(fromLocationId: number): Promise<NearbySpeechLocation[]> {
  // current location + visible outgoing exits first
}
```

Deduplicate location IDs if incoming/reverse exits are later included.

### UI buttons, help and docs

- Update `/help` social/speech section:
  - `Сказати` (`/say`)
  - `Шепнути` (`/whisper`)
  - `Гукнути поруч` (`/yell`)
  - `Крикнути в регіон` (`/shout`)
- Add contextual vertical call buttons to tree/tower-style surfaces where a visible vertical exit exists:
  - lower/tree-base/tower-base view: `Гукнути вгору` (or exact feedback wording `Гукнути вверх`);
  - upper/branch/tower-top view: `Гукнути вниз`.
- These buttons should use the same `/yell` / `mode: "yell"` flow under the hood. They should not create separate `yell up/down` commands and should not call `/shout`.
- If a button cannot collect free text directly, it should prompt or prefill the input instead of sending an empty yell, for example: `Що гукнути вниз? Напишіть: /yell <текст>`.
- Add/link `docs/systems/speech_ranges.md`.
- Add/link `docs/design/command_compatibility.md`.

## Guardrails

- Do not reuse `/world` or `/all` for public global speech.
- Do not expose exact stamina math in ordinary UI.
- Do not make nearby voice reveal hidden exits.
- Do not create long-range reply targets from nearby voice until deliberately designed.
- Do not make `Гукнути вгору` / `Гукнути вниз` reveal hidden exits or imply a guaranteed listener.
- Do not add cheap world chat in this MVP.
- If whisper is changed to be visible only to the addressee, update tests and notes because current behavior may show a vague observer line.

## Acceptance

- `say <text>` reaches only current location.
- `whisper <target> <text>` reaches a visible local target privately.
- `yell <text>` / `гукнути <text>` reaches current location and adjacent authored exits.
- `yell` reaches up/down connected locations when those exits exist.
- Tree/tower-style lower views expose a `Гукнути вгору` / `Гукнути вверх` shortcut when a visible `UP` voice/climb context exists.
- Tree/tower-style upper views expose a `Гукнути вниз` shortcut when a visible `DOWN` voice/climb context exists.
- Those shortcuts use `/yell` / `mode: "yell"` under the hood and never `/shout`.
- `shout <text>` remains region-wide, or a migration is explicitly documented/tested.
- `/help` distinguishes local speech, whisper, nearby voice and region voice.
- `scripts/test/input-aliases.cjs` covers `yell`, `call`, `гукнути`, `покликати`, `крикнути поруч`, `shout`, `крикнути`, `волати`.
- Relevant checks pass: `node scripts/test/input-aliases.cjs`, focused speech/range test if added, and `npm run build`.

## Follow-ups

- Add `tell` / distant private messaging only after contacts/social memory can support it.
- Add global announcements as a herald, bell, ritual, admin/news or settlement system.
- Later connect sound with weather, stealth, hidden presence and noisy creatures.
