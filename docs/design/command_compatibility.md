# Command Compatibility Rules

Chornolis Marches should keep Ukrainian, atmospheric UI as the primary surface while preserving partial MUD compatibility for typed commands when the semantics match.

## Rule

When adding or changing a player command, define these together:

1. canonical action name;
2. slash command, if clickable/help-visible;
3. English/MUD-style aliases;
4. Ukrainian aliases;
5. visible button label, if any;
6. `/help` text;
7. tutorial/newcomer hint when it belongs to onboarding;
8. parser tests in `scripts/test/input-aliases.cjs` when possible.

## Preferred mappings

| MUD-style command | Chornolis meaning | Ukrainian aliases / labels | Notes |
|---|---|---|---|
| `say`, future `'`, future `"` | ordinary local speech | `сказати`, `мовити`, `промовити` | Same місцина only. |
| `sayto` | directed local speech | `сказати <кому>`, `звернутися` | Can map to targeted `say` payloads. |
| `reply` | answer recent addressed speech | `відповісти`, `відповідь` | Keep compact. |
| `whisper` | private local target speech | `шепнути`, `прошепотіти`, `шеп` | Target must be visible/local unless a future skill changes this. |
| `yell`, `call` | nearby/adjacent voice | `гукнути`, `покликати`, `крикнути поруч`; contextual buttons `Гукнути вгору` / `Гукнути вниз` | Recommended MVP for tree/tower calls. |
| `shout` | region-wide voice | `крикнути`, `волати`, `заволати` | Preserve existing broad behavior unless deliberately migrated. |
| `tell` / `page` | private distant message | future contacts/social-memory command | Do not add until distant messaging can be diegetic. |
| `announce` / channel-like command | world/global announcement | `звістити`, `оголосити` | Rare/gated future layer. Avoid `/world` and `/all`. |
| `emote` / `pose` / `:` | free-form social action | future emote layer | Existing social signals remain compact first. |

## Migration rule

If a current command changes reach or cost, keep a compatibility path for at least one release. For the speech-range slice, the safest route is:

- add `/yell` / `yell` / `гукнути` for adjacent locations;
- add tree/tower contextual buttons such as `Гукнути вгору` / `Гукнути вниз` as shortcuts to `/yell`, not as new speech-range commands;
- keep `/shout` / `shout` / `крикнути` / `волати` region-wide for now;
- avoid reusing `/world` or `/all` for public global speech.
