# Gate Hunting Loop

## Purpose

The gate hunting loop is the first settlement-facing ecological pressure loop. It should give players and NPCs a way to react to a living-world imbalance near the settlement gate without creating a standard quest contract.

The settlement notices that the borderland is wrong: predators are scarce, herbivores are pressing too close, grass and young shoots are being eaten down, and the edge of the forest is losing resilience. People do not ask for heroic monster-slaying. They ask capable hands to help restore pressure on the herd and bring usable proof back to the gate.

This is not a bounty board.

Avoid:

- `Quest accepted.`
- `Kill 13 animals.`
- `1 corpse = N coins.`
- fixed bounty tables.

Prefer:

- a public notice;
- a physical drop-off feature;
- player and NPC contributions;
- local memory and gradual settlement response;
- uncertain, contextual thanks.

## Player-Facing Frame

The notice near the gate should say, diegetically:

- predators have been scarce lately;
- herbivores have multiplied or moved too close to the settlement edge;
- grass, shoots and young trees are being eaten down;
- the settlement worries about pasture, forage, firewood, erosion and hunger;
- fresh carcasses or usable remains should be placed into the marked drop-off near the gate;
- the scribe keeps a tally, but no one promises a fixed price per carcass.

Suggested notice text:

```text
На дошці біля воріт висить дощана записка, прибита трьома кривими цвяхами.

Травоїдного звіра побільшало, а хижаків коло Порубіжжя поменшало. Молоді пагони згризені, трава вибита до землі, стежки розтоптані, а біля криниць уже видно надто багато слідів.

Хто здатен полювати — хай бере на себе частку роботи. Свіжі туші й придатні рештки складайте до падального рову за сторожовим кілком. Писар при воротах час від часу звіряє принесене.

Плати за кожну тушу не обіцяємо. Але поселення пам’ятає тих, хто допомагає втримати край.
```

## Physical Drop-Off

The gate should have a visible, inspectable local feature:

- internal role: `carcass_dropoff`;
- preferred name: `падальний рів`;
- it accepts fresh carcasses or usable remains of hunted animals;
- it rejects unrelated items with diegetic text;
- it is a world object, not a detached menu.

Suggested description:

```text
Під частоколом, осторонь від брами, викопано неглибокий падальний рів. Над ним стирчить сторожовий кілок із зарубками й клаптем червоної тканини. Тут складають туші та рештки здобичі, які писарі потім рахують, а різники — забирають те, що ще можна використати.
```

## Contribution Model

MVP contribution records should be small and reusable:

- drop-off feature key/id;
- contributor kind: player, NPC or unknown;
- player/creature id if known;
- resource/carcass kind;
- amount;
- timestamp.

The player should not see raw ecology scores or a spreadsheet. The scribe may mention meaningful thresholds in-world.

## Settlement Reaction

Rewards are settlement reactions, not a fixed price list.

Good early reactions:

- acknowledgement from a guard or scribe;
- a small supply bundle such as food, bandage-like future item, torch or firewood;
- a rumor or path hint;
- a future favor/reputation hook.

First MVP thresholds:

- first valid contribution: acknowledgement only;
- small threshold: a contextual supply thank-you;
- larger threshold: a stronger public acknowledgement or future favor marker.

The thresholds should live in domain configuration, not in handler text.

## Saturation / Enough For Now

The loop should be able to stand down when local pressure has eased. This is not a quest completion state; it is the settlement and borderland noticing that more rodent/herbivore killing is not needed right now.

When saturation is active:

- the gate notice changes from asking for carcasses to saying there is enough pressure for now;
- the drop-off may still accept physical remains, but no new reward/supply threshold should fire;
- player-facing text should make clear that the settlement is not urging more killing at the moment;
- NPC hunters should stop seeking fresh rodents/herbivores for this loop;
- hunters can sit and rest near the magic campfire or another safe waiting point;
- hunter speech should use a quieter waiting/stand-down pool, not departure or boast-like hunting lines.

The state should be reversible. If herbivores overgraze again, predator pressure drops, or enough time passes, the sign can return to asking for help.

0.13.12 adds the first conservative saturation helper:

- enough recorded contribution;
- quiet nearby mouse/rabbit pressure around the gate;
- no nearby depleted-vegetation signal.

When that helper is active, inspecting the gate notice or `Падальний рів` shows "enough for now" text. Drop-offs are still accepted as physical remains, but supply thresholds are suppressed, and hunters without carried/claimed carcasses route toward the magic campfire, rest and use a quieter stand-down line pool. The thresholds are intentionally technical/admin detail; player-facing text should keep saying that the border has enough pressure for now.

Near-term follow-up:

- saturation is currently derived live rather than persisted, so add a linger/cooldown window before the sign and hunter behavior can flip back and forth near thresholds;
- `getGateHuntingSaturationState()` is called from inspect, drop-off and hunter tick and does several database reads; keep this as-is at the current tiny hunter count, but cache the result per world tick if more hunters are seeded;
- plain `/put`, `put` and `покласти` temporarily default to the carcass drop-off; remove or redefine that shortcut when generic local containers/features become real.

## `put` Command Relationship

This loop is the first target for a narrow local-container command:

```text
put [something] [number|all] [container]
/put [something] [number|all] [container]
покласти [щось] [число|все] [кудись]
```

MVP scope:

- source: player inventory;
- target: local feature/container in the current location;
- plain `/put`, `put` or `покласти` temporarily defaults to `/put туша рів` so the command mentioned on the drop-off feature remains directly usable;
- amount: default `1`, integer amount, or `all` / `все`;
- valid gate drop-off routes into the contribution service;
- invalid items and invalid targets do not delete anything.

Out of scope:

- nested bags;
- locked chests;
- putting items into other characters;
- full ownership law;
- full economy pricing.

## NPC Hunter Direction

The NPC hunter loop should call the same drop-off contribution service later. The hunter should not silently add counts or teleport carcasses into the tally.

Implementation foundation:

- `recordNpcCarcassDropoffContribution()` records NPC deposits through the same contribution table as player `put` actions;
- NPC deposits preserve contributor kind and `creatureId`;
- NPC deposits do not grant player inventory rewards;
- `findHunterRoutePlan()` resolves the gate drop-off, a configured magic campfire and routes in both directions through ordinary exits;
- `tickNpcHunter()` runs the first hunter state-machine slice for the seeded gate hunter `Лукан`;
- the seed also includes `Орина` near the forest edge, already returning toward the gate with one visible lit torch and one spare torch represented by the lightweight hunter bundle marker;
- hunter movement uses ordinary exits and delayed `MOVE` actions;
- hunter attacks use the existing delayed creature `ATTACK` action;
- hunter prey selection skips child animals and prefers adult prey first, then old prey, then young prey;
- hunter kills are marked as claimed carcasses, then returned to the gate and deposited through the shared NPC drop-off helper;
- the hunter can opportunistically pick up visible ground torches (`torch` or `lit_torch`) for the hunting bundle before choosing the next route;
- a hunter marked as returning for torches routes to the gate unless visible prey is in the current location, in which case the ordinary delayed attack/claim/drop-off path can still happen first;
- the hunter loop should still show movement and local messages instead of silently calling the helper from far away.

0.13.11 deliberately does not yet model a real NPC-held torch inventory. The five-torch bundle and one-torch return reserve remain constants and design boundaries until NPC inventory/light state exists. Ground-torch pickup is therefore a lightweight behavior slice rather than the final item model.

Future MVP shape:

1. Start near the settlement gate.
2. Take a small hunting bundle from the gate torch stand, currently five unlit torches while the stand remains a temporary infinite source.
3. Route to a known magic campfire through ordinary exits, using a location-to-location route helper rather than teleportation.
4. Light the first torch at the magic campfire.
5. Move from location to location through likely rodent/herbivore pressure areas, using the same delayed action pacing as other auto behavior.
6. Look for suitable rodents/herbivores outside tutorial/dream regions.
7. When prey is visible, attack through existing delayed action/combat/corpse systems, then inspect/check the result before choosing another target.
8. Carry or claim fresh carcasses/remains.
9. Watch torch lifetime; when the burning torch is near the end, light the next torch from the current flame if a spare remains.
10. When only the last torch remains, or when burden, injury, low stamina, night or no-target conditions say so, route back to the gate.
11. Deposit any hunted carcasses/remains through the same carcass drop-off service as players.
12. Later, if the hunter has gathered enough suitable resources, craft replacement torches instead of relying only on the gate stand or found torches.

Nearby players should see compact local messages when the hunter leaves, returns or deposits.

The torch count is a planning target, not a reward table. If the future torch stand becomes limited stock, the hunter should reserve/take supplies through the same feature/container rules as players and avoid draining beginner-critical torches.

### Hunter Shouts and Field Lines

The hunter should feel like a person moving through the same pressure loop, not a silent counter update. Future NPC hunter behavior and the later player hunter auto-mode may use short thematic shouts or field lines when they begin a hunt, pick up a trail, return to the gate or place remains into the drop-off.

Use these lines sparingly:

- never every tick;
- only at meaningful state changes such as departure, target choice, return, deposit or giving up for the day;
- visible/local when the speaker is nearby, not as global spam;
- compact enough for Telegram;
- routed through the same speech/local-message surfaces where practical.

Good line directions:

- `Начувайтесь, гризуни.`
- `Відновимо рівновагу.`
- `Ліс не має лишатися без зубів.`
- `Допоможемо лісовику втримати край.`
- `Поки хижаків мало, люди стануть зубами краю.`
- `Не за срібло йду, а щоб трава знову піднялася.`
- `Падальний рів сьогодні не пустуватиме.`
- `Звір розійшовся занадто близько до воріт.`

Avoid modern slogans, quest-like confirmations, guaranteed-kill boasting and fixed reward framing. Lines that mention the лісовик should remain occasional unless local world state has made that spirit especially relevant.

Stand-down / waiting lines should be separate from hunting lines. Examples:

- `Досить на сьогодні. Хай трава трохи підведеться.`
- `Не кожен рух у лісі треба гнати ножем.`
- `Посидимо біля вогню. Якщо межа знову просяде, підемо.`
- `Гризуни ще лишаться. Але тепер не вони диктують день.`
- `Писар знак змінив. Значить, поки чекаємо.`

## Acceptance

- A player can examine the gate notice.
- A player can examine the carcass drop-off feature.
- `put` can place a valid carried carcass/remains stack into the drop-off.
- Invalid items are rejected without loss.
- Valid drop-offs are counted for the contributor.
- First contribution gives atmospheric acknowledgement.
- Threshold reaction is not a fixed bounty price.
- NPC hunter behavior uses the same drop-off contribution service safely for the first state-machine slice.
