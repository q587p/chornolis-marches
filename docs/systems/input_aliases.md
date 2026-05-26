# Input aliases / українські команди

Chornolis is Telegram-first, but player actions should not depend only on Telegram buttons.

When a player-facing button performs an in-world action, there should usually be an equivalent slash command, Ukrainian text command or MUD-style text phrase. Суто паґінаційні and purely navigational archive buttons are allowed to remain callback-only.

## Current intent

- Keep canonical slash commands stable: `/look`, `/examine`, `/me`, `/stat`, `/chat`, `/time`, `/news`, `/help`, `/menu`, `/gather`, `/rest`, `/queue`, `/say`, movement commands and admin/debug commands.
- Add Ukrainian aliases as a convenience layer over the same handlers where possible.
- Preserve existing callback buttons for Telegram ergonomics.
- Reply to unknown text with a short "не зрозуміли" message, `/help` / `/menu` hints and close alias suggestions where possible.

## Examples

Location and character:

- `озирнутися`, `/озирнутися`, `де я`, `місцина` -> current location view.
- `роздивитися`, `/роздивитися`, `що видно` -> closer look action.
- `хто я`, `хтоя`, `персонаж`, `речі` -> character card.

Menu and status:

- `статистика`, `/статистика` -> canonical `/stat` view.
- `репліки`, `/репліки` -> canonical `/chat` view.
- `час`, `/час` -> canonical `/time` view.
- `новини`, `/новини` -> canonical `/news` view.
- `допомога`, `/допомога` -> canonical `/help` view.

Movement:

- `північ`, `південь`, `схід`, `захід`.
- `йти на південь`, `рушити на захід`.
- Short aliases such as `пн`, `пд`, `сх`, `зх` are supported where unambiguous.

Actions:

- `збирати трави`, `збирати ягоди`, `збирати гриби`.
- `відпочити`, `додати відпочинок у чергу`, `перервати відпочинок`.
- `черга`, `скасувати`, `очистити чергу`.
- `/track`, `/examine tracks`, `роздивитися сліди`, `придивитися до слідів`.
- `сказати Привіт`.
- `додати хмиз`, `підкинути хмиз`, `/add twigs campfire` -> reserved campfire-firewood placeholder.
- `увімкнути авто`, `зупинити авто`.

Targets and signals:

- `роздивитися труп`, `атакувати вовка`, `привітати 1`, `освіжити труп`.
- `підібрати труп`.
- `кивнути 1`, `помахати мандрівник`, `вказати на вовка`, `насупитися вовк`.

Target commands resolve visible nearby targets by number, id or visible name. If several targets match, the bot asks the player to clarify.

0.11.6 note: ordinary location buttons should avoid adding technical numbering to duplicate animals, corpses or objects. Numbering and internal ids belong in a future debug/scribe detail mode, not in the default player-facing view.

## Button parity rule

Before adding a new player-facing Telegram button, check:

1. Is this only паґінаційна or archive navigation? If yes, callback-only is fine. Examples: `Далі`, `Назад`, `1/3`, `До архіву`.
2. Is this an in-world action? Add a slash command or Ukrainian/MUD-style alias.
3. Does an existing canonical handler already exist? Reuse it instead of creating a parallel response.
4. Does the button target a selected object? Add a text form that can resolve a visible target by number or name when practical.

This keeps Telegram UI convenient while preserving the long-term MUD/sandbox direction.
