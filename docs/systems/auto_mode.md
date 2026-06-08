# Spirit Call Auto Mode

`🌫️ Поклик духа` is the player-facing name for the old auto-mode surface. It is still the same small autonomous helper under the hood: the character periodically chooses a simple action such as saying a short line, gathering a nearby resource, looking around, moving, or sitting down to rest when badly tired.

Do not use `Провід` for this feature. The tone should stay closer to a quiet borderland whisper than a formal guide.

## Current Behavior

- `/auto`, `/spirit`, `/dukh`, `/poklyk`, `авто`, `дух`, `поклик духа` and similar status aliases show whether the mode is active, which whisper is selected and which control commands are available.
- `/spirit_on`, `/dukh_on`, `spirit on`, `покликати духа`, `дух веде` and similar start aliases enable the mode or remind the player that it is already active.
- `/spirit_off`, `/dukh_off`, `/spirit_stop`, `/dukh_stop`, `подякувати духу`, `відпустити духа`, `зупинити духа` and similar aliases stop it.
- Legacy `/auto`, `/auto_stop`, `/autoStop`, `/auto stop`, `авто`, `вимкнути авто`, `стоп авто` and `авто стоп` remain supported for compatibility.
- The character card may still expose the control, but player-facing copy should prefer `Поклик духа` over `Авто`.
- `☰ Меню` should not grow a large auto/settings cluster; this remains a character/game-flow state.
- The mode uses the same `WorldAction` records as manual actions.
- If the character is busy or tired, the chosen action may enter the queue.
- If the character is badly tired, the mode may start ordinary rest.
- If the character is sitting after rest, the mode stands them up through the ordinary posture rule before physical actions such as movement or gathering.
- Ordinary sleep and tutorial dream locations disable the mode: sleep is a separate attention state, not a place where the character keeps wandering or gathering.

## Internal Compatibility

The implementation may keep existing internal names such as `auto`, `isAutoEnabled`, `registerAutoHandlers`, `auto:*` action notes and auto-message settings. These names are stable technical wiring and scribe/debug vocabulary, not the preferred player-facing metaphor.

Auto-created player actions should carry payload metadata such as:

```json
{ "spiritCall": true, "source": "spirit_call" }
```

Use that payload marker when a visible message needs to distinguish a spirit-guided action from a manual action made while the mode is enabled. Do not infer that every action by an `isAutoEnabled` character was created by the spirit call.

Visible lists and full inspection may mark a character subtly, for example:

- `за кроком тягнеться тихий поклик`
- `За кроком відчувається тихий поклик духа...`

Avoid broad new notifications just to announce this state.

## Persistence

The state is stored in `Player.isAutoEnabled`.

After a process restart, the bot restores timers for players with `isAutoEnabled = true`.

`/reset world` and `/reset full` reset persistent auto-state for all players and stop active timers in the current process. `/reset stats` does not touch it.

## Future Directions

- Future unlock gating: `Поклик духа` should not necessarily be available as an
  immediate default control. A later mentorship/attention slice should consider
  unlocking or strengthening it only after the player has followed an
  appropriate teacher for some time and seen that teacher's pattern often
  enough. Keep the requirement diegetic and teacher-specific, not a raw global
  level gate.
- Separate spirit-call profiles or later auto-behavior profiles: gatherer, careful explorer, hunter, profession-specific modes.
- Safety limits for dangerous states, regions, injuries or important events.
- Skill- and profession-aware behavior.
- NPC behavior that can share parts of the same pacing rules without exposing the player-facing spirit-call metaphor everywhere.

## Notes

- First activation asks for confirmation.
- Technical mode can still count `auto:*` actions separately from manual actions.
- `⚙️ Налаштування` has an auto-message toggle. Keep its command names stable for now, but future player-facing copy can explain it as messages about spirit-guided choices and results.
