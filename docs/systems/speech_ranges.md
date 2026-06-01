# Speech Ranges

## Purpose

Speech should support social play and spatial awareness. A player standing in a tree, on a tower, above a road or below a bridge should be able to call to nearby connected places without broadcasting to the whole region.

## Goals

- Keep ordinary speech local and low-cost.
- Keep whisper private and target-specific.
- Add a nearby/adjacent voice layer for “from above / from below / across the next path”.
- Keep region shouting separate and more expensive.
- Reserve world/global speech for a rare/gated future channel or herald system.
- Teach the spatial meaning through the dream tutorial.

## Layers

| Layer | Canonical command | Ukrainian aliases | MUD aliases | Reach | Effort |
|---|---|---|---|---|---|
| Local speech | `/say <text>` | `сказати`, `мовити`, `промовити` | `say`, future `'`, future `"` | current місцина | 1× `SAY` |
| Directed local speech | `/say <target> <text>` / `/reply <text>` | `відповісти`, `звернутися` | `sayto`, `reply` | current місцина, addressed target highlighted | 1× `SAY` |
| Whisper | `/whisper <target> <text>` | `шепнути`, `прошепотіти`, `шеп` | `whisper` | visible target in current місцина | 1× `SAY` |
| Nearby voice | `/yell <text>` | `гукнути`, `покликати`, `крикнути поруч` | `yell`, `call` | current + adjacent authored exits | about 2× `SAY` |
| Region voice | `/shout <text>` | `крикнути`, `волати`, `заволати` | `shout` | current region | 3–4× `SAY` or at least current `SAY + TRACK` |
| World/global | future `/announce` or herald system | `звістити`, `оголосити` | `announce`, `broadcast` | world/global | high cooldown/gated |

## Nearby voice reach

`/yell` should use authored exits, not raw coordinates.

MVP recipients:

- speaker's current location;
- all non-hidden outgoing exits from the current location;
- include `UP` and `DOWN` naturally as exits.

Do not reveal hidden exits. Add reverse/incoming exits only after a map audit if sound should travel through one-way authored exits.

## Contextual vertical voice buttons

Trees, towers, walls, bridge banks and similar vertical places should expose nearby voice as contextual buttons when vertical exits are visible.

Recommended labels:

- lower/base side with a visible `UP` exit or climbable vertical feature: `Гукнути вгору` (or exact feedback wording `Гукнути вверх` if that copy is preferred);
- upper/branch/tower-top side with a visible `DOWN` exit or descent feature: `Гукнути вниз`.

These buttons are shortcuts for the same nearby voice mechanic as `/yell`, not separate commands and not region-wide shouting. Under the hood they should submit or prepare a `SAY` action with `mode: "yell"`.

Because `/yell` needs player-written text, a button should not send an empty shout. Use the smallest clean Telegram UX available:

- prompt for the next message: `Що гукнути вниз? Напишіть текст — голос піде як /yell.`;
- prefill `/yell ` where the Telegram button/UI pattern supports it cleanly;
- in a scripted tutorial-only moment, optionally use a fixed line if the scene deliberately demonstrates the first call.

Keep visible button labels clean: no slash-command hints inside the button text. Help/tutorial copy may mention that these buttons use `/yell` under the hood.

## Directional flavor

Adjacent listeners should get direction-aware text where practical:

- from `UP`: `Знизу долинає голос ...`
- from `DOWN`: `Згори долинає голос ...`
- from `NORTH`: `З півдня долинає голос ...`
- from `SOUTH`: `З півночі долинає голос ...`
- from `EAST`: `Із заходу долинає голос ...`
- from `WEST`: `Зі сходу долинає голос ...`
- from `INSIDE` / `OUTSIDE`: `Зсередини` / `Ззовні`.

Reuse or extract existing direction phrase mappings where possible.

## Delivery behavior

- `say`: current location only.
- `whisper`: target sees text; speaker sees confirmation. If product direction is “visible only to addressee”, remove any vague observer line too.
- `yell`: same location sees a loud local line; adjacent locations see a direction-flavored line; no hidden exits revealed.
- `shout`: region-wide, higher effort, rate-limit later if needed.
- world/global: not MVP; make it a herald, bell, ritual, settlement service or admin/news tool later.

## Tutorial hook

Add a dream-tree scene:

1. The player sees a tree/branch/raised place and a clear `UP` exit.
2. The player climbs `вгору` / `up`.
3. The branch scene hints that voices carry to nearby places below.
4. The upper scene offers `Гукнути вниз`; the lower scene can offer `Гукнути вгору` / `Гукнути вверх` when the reverse direction is meaningful.
5. The player uses `гукнути` / `/yell`, either by typing or through the contextual button.
6. A listener below reacts or the dream confirms that the call reached below, not the whole region.
7. The player returns `вниз` / `down`.
