# Fire and light

Chornolis uses fire as an early survival and visibility tool.

## Campfires

- `/addCampfire` creates a new ordinary debug campfire in the player's current місцина.
- Multiple campfires can exist in the same місцина; every debug campfire receives its own key.
- A debug campfire burns for 8 in-game hours, currently mapped to 16 real minutes.
- During the final 2 in-game hours, currently 4 real minutes, location and feature text notes that the fire is fading.
- In that fading window, `/examine` shows the low-fire state: the campfire is догорає, but still lights the місцина until it expires.
- `/look` lists campfires only as visible features. `/examine` shows the gameplay meaning: whether the fire gives light, whether it improves rest, and whether it is fading or extinguished.
- In `/look`, an extinguished campfire should be listed only by name, e.g. `Згасле вогнище`. The ash/no-light/no-warmth details belong in `/examine`.
- After at least 1 in-game hour, currently 2 real minutes, a campfire feature can show `Додати хмиз`.
- `Додати хмиз`, `додати хмиз` and `/add twigs campfire` consume one `twigs` resource from inventory.
- For a burning ordinary campfire, `twigs` extends the remaining burn time by a small capped amount.
- For an extinguished ordinary campfire, `twigs` is tucked into the ashes as prepared fuel; it still needs a burning torch to relight.
- Magical campfires do not accept `twigs`: their point is that old magic sustains them without fuel.
- When a timed campfire expires, it remains in the місцина as `Згасле вогнище`: it gives no light and no rest bonus.
- A character with a still-burning torch can use `Підпалити` on a згасле вогнище to relight it with the default ordinary campfire timer.
- Seed data includes a few згаслі вогнища in the forest and dry luka as places that can be relit.

Expired timed campfires are turned into згаслі campfires lazily when location/light state is rendered or checked.

## Torches

- Seed data includes a few loose `факел` ground items in forest, dry luka and riverbank locations. They appear under `Лежить` and can be picked up without a gather chance roll or action delay when the character is not exhausted.
- The closed settlement gate has a temporary infinite torch stand. Its feature action is `Взяти факел`; later it should become a limited-stock container or bundle.
- Picking up a loose torch or taking one from a torch stand is visible to other characters in the location and is recorded for world/admin history.
- `/start`, `/reset` and ordinary bot startup do not add torches directly to player inventory. Development/scribe placement uses `/addTorch [персонаж]`, which adds a torch to the current or named player's inventory.
- Near an active light-giving campfire, a character with a torch can use `Підпалити факел`.
- If the torch is already burning and the character carries another unlit torch, the action becomes `Підпалити ще один факел`.
- If the character already has a burning torch and no extra unlit torch, the same action becomes `Оновити вогонь на факелі` and resets its timer.
- From inventory, the `Light torch` / `Запалити факел` action appears when the character carries an unlit torch and can reach fire from either a lit campfire in the current location or another lit torch already in hand.
- From inventory, `Підкинути хмиз` appears when the character carries `twigs` and a nearby ordinary campfire can accept them.
- From inventory, `Притушити факел` appears while a carried torch is burning. It turns one `lit_torch` into a `doused_torch` and stores the remaining burn time so relighting continues from that point.
- A character can carry at most two lit torches at once, matching the current two-hands assumption.
- A lit torch lasts 5 in-game hours, currently 10 real minutes.
- During the final in-game hour, currently 2 real minutes, the world tick sends the character a separate chat warning that the torch is going out.
- When a lit torch burns out, inventory sync consumes `lit_torch` and returns `twigs` instead of a dry `torch`.
- A lit torch gives light in the character's current місцина and can reveal nearby targets in the same way as campfire light.

The current implementation stores torch state as inventory resources:

- `torch` is an unlit torch.
- `lit_torch` is a burning torch; its `updatedAt` timestamp is the active timer.
- `doused_torch` is a doused torch; the remaining burn time is preserved through an internal timer event until it is relit.
- `twigs` / `хмиз` is the leftover fuel resource produced when a carried lit torch expires.

Seed/reset data also places small pickable `twigs` bundles in a few forest and dry-luka locations. They appear under `Лежить` and can be picked up like loose torches.

This avoids a schema migration while preserving per-character torch timing.

## Timer notifications

- Timer warnings are chat events, not part of the місцина description.
- When a carried lit torch reaches the fading window, the owner gets one separate chat message.
- When a timed campfire reaches the fading window, characters in that місцина get one local chat message.
