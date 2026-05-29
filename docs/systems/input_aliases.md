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

- `північ`, `південь`, `пів`, `схід`, `захід`.
- `йти на південь`, `рушити на захід`.
- Short aliases such as `пн`, `пд`, `сх`, `зх` are supported where unambiguous.
- Non-compass exits also work: `/inside`, `/in`, `вср`, `всередину`, `увійти`, `/outside`, `/out`, `назовні`, `вийти`.
- The reply keyboard may also show available direction buttons directly, such as `⬆️ Північ`, `⬅️ Захід`, `Схід ➡️` and `⬇️ Південь`.

Actions:

- Pending scribe/admin prompts can be cancelled with `/cancel`, `/skasuvaty`, `/vidminyty`, `cancel`, `skasuvaty`, `vidminyty`, `скасувати`, `відмінити`, `відміна`, `стоп` or `не треба`. These aliases only cancel the pending prompt when one exists; otherwise ordinary aliases such as `скасувати` keep their existing queue behavior.
- `збирати трави`, `збирати ягоди`, `збирати гриби`.
- `з'їсти ягоди`, `їсти ягоди`, `використати ягоди`, `eat berries`, `use berries` -> eat carried berries from inventory to restore a small amount of stamina and ease hunger by a tiny amount.
- `з'їсти гриби`, `їсти гриби`, `використати гриби`, `eat mushrooms`, `use mushrooms` -> eat carried mushrooms from inventory to ease hunger a little.
- `використати трави`, `використати лікарські трави`, `вжити трави`, `прикласти трави`, `лікуватися травами`, `use herbs` -> use carried herbs when wounded for a small HP recovery.
- `запалити факел`, `підпалити факел`, `light torch`, `use torch` -> light an unlit carried torch when there is a campfire nearby or another lit torch in hand.
- `загасити факел`, `погасити факел`, `притушити факел`, `douse torch`, `extinguish torch` -> douse one carried lit torch into a carried `притушений факел` that preserves its remaining burn time for later relighting.
- `item berries`, `річ ягоди`, `оглянути в речах ягоди`, `inspect item berries` -> inspect a carried resource stack.
- `викинути ягоди`, `кинути трави`, `drop berries`, `discard torch` -> drop one carried resource from inventory into the current location.
- `відпочити`, `додати відпочинок у чергу`, `перервати відпочинок`.
- `/sleep tutorial`, `tutorial`, `sleep tutorial`, `навчальний сон`, `сон навчання`, `навчання`, `туторіал`, `пройти навчання`, `повернутися до навчання` -> enter or return to the dream tutorial. While the tutorial is incomplete, plain `/sleep`, `сон` and `спати` route there too.
- `/wake`, `wake`, `прокинутися`, `прокинутись` -> leave the dream tutorial and return to the saved real location.
- `/say Відчинитися`, `сказати Відчинитися`, `говорити Відчинись будь ласка`, `ск Можеш відчинитися`, `сказ Відчинися`, `гов Відкрийся` and the `Сказати «Відчинитися»` gate button -> say the written phrase aloud and open the local `Брама Сну` in the dream tutorial. The dream gate is locked from both sides while closed, so both the gate-side `Південь` and hub-side `Північ` exits should appear parenthesized until speech opens the passage. `/open`, `open` and `відкрити` may remain as compatibility aliases for the same local interactive gate, but the tutorial-facing path should teach speech and attention to signs. The closed settlement gate near the bridge is a visible locked exit, but it is not openable yet.
- `черга`, `скасувати`, `очистити чергу`.
- `/track`, `/examine tracks`, `роздивитися сліди`, `придивитися до слідів`. Future detail forms should include target-like aliases such as `роздивитися вовчий слід`, `роздивитися людський слід` and `роздивитися заячий слід`.
- `сказати Привіт`.
- `додати хмиз`, `підкинути хмиз`, `/add twigs campfire` -> add carried `хмиз` to a nearby ordinary campfire.
- `підібрати хмиз`, `взяти хмиз`, `pickup twigs` -> pick up visible loose `хмиз` in the current місцина.
- Ecology sign inspection: `/examine sign`, `/examine border marker`, `роздивитися знак`, `роздивитися межовий знак`, `придивитися до знака` -> inspect a local `Межовий знак` and read its public diegetic wildlife notes when the feature is present.
- Ecology inspection: `/examine grass`, `/examine depleted grass`, `роздивитися траву`, `придивитися до трави`, `оцінити траву`, `оцінити відновлення` -> inspect the local depleted-vegetation feature and estimate natural recovery when `Винищена трава` is present.
- Future shrine/offering actions: `/offer`, `/offer <item>`, `пожертвувати`, `лишити дар`, `покласти дар`, `кинути шаг`, `покласти хмиз` -> offer an item to an inspectable shrine/капище or similar sacred feature.
- Future animal-restoration offering actions: `/offer berries`, `/offer herbs`, `покласти ягоди`, `лишити трави`, `покласти дар зайцю`, `покласти дар мишам`, `пожертвувати зайцеві`, `пожертвувати мишам` -> offer fitting food or herbs to a hare/mouse statue, carved burrow marker or similar animal charm.
- `увімкнути авто`, `зупинити авто`.

Targets and signals:

- `роздивитися труп`, `атакувати мишу`, `привітати 1`, `освіжити труп`.
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
