# Input aliases / українські команди

Chornolis is Telegram-first, but player actions should not depend only on Telegram buttons.

When a player-facing button performs an in-world action, there should usually be an equivalent slash command, Ukrainian text command or MUD-style text phrase. Суто паґінаційні and purely navigational archive buttons are allowed to remain callback-only.

## Current intent

- Keep canonical slash commands stable: `/look`, `/examine`, `/me`, `/inventory`, `/stat`, `/chat`, `/who`, `/time`, `/news`, `/help`, `/menu`, `/gather`, `/rest`, `/queue`, `/say`, movement commands and admin/debug commands.
- Add Ukrainian aliases as a convenience layer over the same handlers where possible.
- Preserve existing callback buttons for Telegram ergonomics.
- Reply to unknown text with a short "не зрозуміли" message, `/help` / `/menu` hints and close alias suggestions where possible.

## Examples

Location and character:

- `озирнутися`, `/озирнутися`, `де я`, `місцина`, `див`, `дивитися` -> current location view.
- `/glance`, `glance`, `глянути швидко`, `швидко глянути` -> quick current-location read without the full description.
- `/exits`, `exits`, `виходи`, `куди можна йти` -> only visible exits from the current location, including visible locked exits.
- `роздивитися`, `/роздивитися`, `що видно` -> closer look action.
- `хто я`, `хтоя`, `персонаж` -> character card.
- `речі`, `інвентар`, `inventory`, `/inventory`, `що в мене` -> dedicated inventory view.

Menu and status:

- `статистика`, `/статистика` -> canonical `/stat` view for scribes/admins only.
- `репліки`, `/репліки`, `chat`, `chat all`, `chat location 1`, `chat character all` -> canonical `/chat` view.
- `хто`, `хто активний`, `хто тут`, `хто поруч` -> canonical `/who` view.
- `час`, `/час` -> canonical `/time` view.
- `новини`, `/новини` -> canonical `/news` view.
- `допомога`, `/допомога` -> canonical `/help` view.
- `назад` / `↩️ Назад` -> leave the secondary menu and return the main reply keyboard.
- `сховати клавіатуру`, `прибрати клавіатуру`, `прибрати кнопки` -> hide the Telegram reply keyboard. `/menu` or `/start` shows buttons again.

Movement:

- `північ`, `південь`, `схід`, `захід`.
- Ambiguous fragments such as `пів` should not move the character directly; unknown-command suggestions should offer both `північ` and `південь`.
- `йти на південь`, `рушити на захід`.
- Short aliases such as `пн`, `пд`, `сх`, `зх` are supported where unambiguous.
- Non-compass exits also work: `/inside`, `/in`, `/enter`, `enter bushes`, `вср`, `всередину`, `увійти`, `увійти в кущі`, `/outside`, `/out`, `/leave`, `leave cave`, `наз`, `назовні`, `вийти`, `вийти з кущів`.
- The reply keyboard may also show available direction buttons directly, such as `⬆️ Північ`, `⬅️ Захід`, `Схід ➡️` and `⬇️ Південь`.

Actions:

- Pending scribe/admin prompts can be cancelled with `/cancel`, `/skasuvaty`, `/vidminyty`, `cancel`, `skasuvaty`, `vidminyty`, `скасувати`, `відмінити`, `відміна`, `стоп` or `не треба`. These aliases only cancel the pending prompt when one exists; otherwise ordinary aliases such as `скасувати` keep their existing queue behavior.
- `збирати трави`, `збирати ягоди`, `збирати гриби`.
- Pickup verbs such as `підібрати`, `взяти`, `take` and `get` first mean visible ground-item pickup. Gather verbs such as `збирати`, `зібрати`, `шукати` and `gather` mean spending time and stamina on a local resource node. If a natural resource is not lying separately on the ground, pickup text should give a hint to gather it instead.
- `підібрати ягоди`, `взяти трави`, `take herbs`, `get mushrooms` -> pick up matching loose ground resources only when they are actually visible as ground items; otherwise explain that these should be gathered.
- `з'їсти ягоди`, `їсти ягоди`, `використати ягоди`, `eat berries`, `use berries` -> eat carried berries from inventory to restore a small amount of stamina and ease hunger by a tiny amount.
- `з'їсти гриби`, `їсти гриби`, `використати гриби`, `eat mushrooms`, `use mushrooms` -> eat carried mushrooms from inventory to ease hunger a little.
- `з'їсти трави`, `з'їсти лікарські трави`, `використати трави`, `використати лікарські трави`, `вжити трави`, `прикласти трави`, `лікуватися травами`, `eat herbs`, `use herbs` -> eat/use carried herbs when wounded for a small HP recovery.
- `запалити факел`, `підпалити факел`, `light torch`, `use torch` -> light an unlit carried torch when there is a campfire nearby or another lit torch in hand.
- `загасити факел`, `погасити факел`, `притушити факел`, `douse torch`, `extinguish torch` -> douse one carried lit torch into a carried `притушений факел` that preserves its remaining burn time for later relighting.
- `item berries`, `річ ягоди`, `оглянути в речах ягоди`, `inspect item berries` -> inspect a carried resource stack.
- `look mushroom`, `examine berries`, `оглянути ягоди`, `роздивитися факел` -> first try local features and visible nearby targets; if no visible target matches, inspect a matching carried resource stack in `Речі`.
- `викинути ягоди`, `кинути трави`, `drop berries`, `discard torch` -> drop one carried resource from inventory into the current location.
- `/put туша рів`, `/put туша all падальний рів`, `покласти всі рештки до ями` -> put carried carcasses/remains into a matching local feature/container. The first supported target is the gate `падальний рів`; this records a settlement contribution instead of paying a fixed bounty.
- `/sit`, `sit`, `сісти`, `присісти` -> sit down without starting rest.
- `/stand`, `stand`, `stand up`, `встати`, `підвестися`, `підвестись` -> stand up; if active rest is running, standing interrupts it.
- `/rest`, `відпочити`, `перепочити`, `додати відпочинок у чергу`, `перервати відпочинок` -> sit if needed and start, queue or interrupt active recovery.
- `/sleep tutorial`, `tutorial`, `sleep tutorial`, `навчальний сон`, `сон навчання`, `навчання`, `туторіал`, `пройти навчання`, `повернутися до навчання` -> enter or return to the dream tutorial. While the tutorial is incomplete, plain `/sleep`, `сон` and `спати` route there too.
- `/wake`, `wake`, `прокинутися`, `прокинутись` -> leave the dream tutorial and return to the saved real location.
- `/say Відчинитися`, `сказати Відчинитися`, `говорити Відчинись будь ласка`, `ск Можеш відчинитися`, `сказ Відчинися`, `гов Відкрийся` and the `Сказати «Відчинитися»` gate button -> say the written phrase aloud and open the local `Брама Сну` in the dream tutorial. The dream gate is locked from both sides while closed, so both the gate-side `Південь` and hub-side `Північ` exits should appear parenthesized until speech opens the passage. `/open`, `open` and `відкрити` may remain as compatibility aliases for the same local interactive gate, but the tutorial-facing path should teach speech and attention to signs. The closed settlement gate near the bridge is a visible locked exit, but it is not openable yet.
- `whisper Данило Тихіше`, `шепнути 1 Тихіше`, `/whisper Данило Тихіше` -> whisper privately to one visible player in the current location. The target receives the text; other nearby players only see that a whisper happened, without the words.
- `reply Я почув`, `відповісти Я почув` -> answer the last speech event that addressed your character directly. Direct speech, greetings and whispers remember the speaker per recipient, so `reply` does not require the speaker to remain visible or in the same current target list.
- `shout Сюди`, `гукнути Сюди`, `крикнути Сюди`, `кричати Допоможіть`, `крик Допоможіть`, `вигукнути Обережно`, `волати Не йдіть туди` -> shout across the current region. This uses the speech queue path but spends extra stamina compared with ordinary speech.
- `черга`, `скасувати`, `очистити чергу`.
- `/track`, `/examine tracks`, `роздивитися сліди`, `придивитися до слідів`. Future detail forms should include target-like aliases such as `роздивитися вовчий слід`, `роздивитися людський слід` and `роздивитися заячий слід`.
- `сказати Привіт`.
- `додати хмиз`, `підкинути хмиз`, `/add twigs campfire` -> add carried `хмиз` to a nearby ordinary campfire.
- `підібрати хмиз`, `взяти хмиз`, `pickup twigs` -> pick up visible loose `хмиз` in the current місцина.
- Ecology sign inspection: `/examine sign`, `/examine border marker`, `роздивитися знак`, `роздивитися межовий знак`, `придивитися до знака` -> inspect a local `Межовий знак` and read its public diegetic wildlife notes when the feature is present.
- Ecology inspection: `/examine grass`, `/examine depleted grass`, `роздивитися траву`, `придивитися до трави`, `оцінити траву`, `оцінити відновлення` -> inspect the local depleted-vegetation feature and estimate natural recovery when `Винищена трава` is present.
- Local feature inspection: `look лавка`, `/examine лавка`, `оглянути лавку`, `роздивитися кущі` -> first try to inspect a visible interactive location feature by name or alias; if no feature matches, target inspection can still fall back to visible creatures, corpses or characters, then to carried inventory items.
- Numeric inspection such as `look 3` or `роздивитися 3` refers to the visible nearby target list, not to fuzzy feature keys or internal feature ids.
- Future shrine/offering actions: `/offer`, `/offer <item>`, `пожертвувати`, `лишити дар`, `покласти дар`, `кинути шаг`, `покласти хмиз` -> offer an item to an inspectable shrine/капище or similar sacred feature.
- Future animal-restoration offering actions: `/offer berries`, `/offer herbs`, `покласти ягоди`, `лишити трави`, `покласти дар зайцю`, `покласти дар мишам`, `пожертвувати зайцеві`, `пожертвувати мишам` -> offer fitting food or herbs to a hare/mouse statue, carved burrow marker or similar animal charm.
- `увімкнути авто`, `зупинити авто`.

Targets and signals:

- `роздивитися труп`, `атакувати мишу`, `fight wolf`, `kick rabbit`, `привітати 1`, `освіжити труп`.
- `підібрати труп`.
- `освіжити труп`, `розібрати труп`, `freshen corpse`, `butcher corpse` -> gain raw meat from a sufficiently fresh corpse.
- `підсмажити м'ясо`, `смажити м'ясо`, `cook meat` -> cook raw meat at a nearby campfire; a torch alone is not enough.
- `з'їсти м'ясо`, `їсти смажене м'ясо`, `eat cooked meat`, `use cooked meat` -> eat cooked meat for hunger relief.
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

## Command catalog follow-up

`/commands` is a hidden in-game command-reference surface for the current text command layer. It should open one page at a time and use inline pagination buttons instead of dumping every page into chat at once. Keep it aligned with this document when adding player-facing commands or major aliases.

Near-term command work is split into `CMD-001` so practical MUD-style text can arrive before the larger command roadmap. The first quick-navigation slice shipped in 0.13.4:

- `glance` / `глянути швидко`;
- `exits` / `виходи`.

The first non-compass navigation slice shipped in 0.13.5:

- `enter [place]` / `увійти [місце]`;
- `leave [place]` / `вийти [місце]`.

The speech slice shipped in 0.13.6:

- `whisper [player] [message]` / `шепнути [персонаж] [текст]`;
- `reply <message>` / `відповісти <текст>`;
- `shout <message>` / `крикнути <текст>` / `кричати <текст>` / `крик <текст>` / `гукнути <текст>`.

Future command-registry work should move the project toward one shared source of truth for:

- command name, short aliases and Ukrainian aliases;
- slash command, MUD-style text form and Telegram button parity;
- per-command help, for example `help say` / `допомога сказати`;
- availability gates such as ordinary player, scribe/admin and future builder permissions;
- future command chaining with semicolons, for example `get sword; equip sword`;
- later MUD-style commands such as `give`, `put`, `drink`, `skills`, `effects`, `consider`, `compare`, `journal`, `party`, `guild`, `spells`, `cast`, `weather`, builder commands and moderation commands.
