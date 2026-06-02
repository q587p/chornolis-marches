const assert = require("node:assert/strict");

require("ts-node/register");

const {
  AUTO_ACTION_MESSAGES_DISABLED_TEXT,
  AUTO_ACTION_MESSAGES_ENABLED_TEXT,
  DAYPART_NOTICE_HINT_TEXT,
  buildSettingsKeyboard,
  canReceiveDaypartNotice,
  recordOrdinaryWakeAndClaimDaypartHint,
  renderNotificationSettings,
  shouldShowDaypartNoticeHint,
} = require("../../src/services/playerNotificationSettings");

assert.equal(canReceiveDaypartNotice({
  currentLocationId: 1,
  sleepState: "AWAKE",
  daypartNoticesEnabled: true,
  isDreamLocation: false,
}), true);

assert.equal(canReceiveDaypartNotice({
  currentLocationId: 1,
  sleepState: "AWAKE",
  daypartNoticesEnabled: false,
  isDreamLocation: false,
}), false);

assert.equal(canReceiveDaypartNotice({
  currentLocationId: 1,
  sleepState: "ORDINARY_SLEEP",
  daypartNoticesEnabled: true,
  isDreamLocation: false,
}), false);

assert.equal(canReceiveDaypartNotice({
  currentLocationId: 1,
  sleepState: "AWAKE",
  daypartNoticesEnabled: true,
  isDreamLocation: true,
}), false);

assert.equal(shouldShowDaypartNoticeHint({
  daypartNoticesEnabled: true,
  daypartNoticeHintShown: false,
  ordinaryWakeCount: 1,
}), false);

assert.equal(shouldShowDaypartNoticeHint({
  daypartNoticesEnabled: true,
  daypartNoticeHintShown: false,
  ordinaryWakeCount: 2,
}), true);

assert.equal(shouldShowDaypartNoticeHint({
  daypartNoticesEnabled: false,
  daypartNoticeHintShown: false,
  ordinaryWakeCount: 2,
}), false);

assert.equal(shouldShowDaypartNoticeHint({
  daypartNoticesEnabled: true,
  daypartNoticeHintShown: true,
  ordinaryWakeCount: 3,
}), false);

function fakeDb(initial) {
  const state = { player: { ...initial } };
  return {
    state,
    db: {
      player: {
        findUnique: async () => state.player,
        updateMany: async ({ where, data }) => {
          if (where.daypartNoticesEnabled !== undefined && where.daypartNoticesEnabled !== state.player.daypartNoticesEnabled) {
            return { count: 0 };
          }
          if (where.daypartNoticeHintShown !== undefined && where.daypartNoticeHintShown !== state.player.daypartNoticeHintShown) {
            return { count: 0 };
          }
          if (data.ordinaryWakeCount?.increment) state.player.ordinaryWakeCount += data.ordinaryWakeCount.increment;
          if (data.daypartNoticeHintShown !== undefined) state.player.daypartNoticeHintShown = data.daypartNoticeHintShown;
          return { count: 1 };
        },
      },
    },
  };
}

(async () => {
  {
    const { db, state } = fakeDb({
      daypartNoticesEnabled: true,
      daypartNoticeHintShown: false,
      ordinaryWakeCount: 0,
    });
    assert.equal(await recordOrdinaryWakeAndClaimDaypartHint(1, db), null);
    assert.equal(state.player.ordinaryWakeCount, 1);
    assert.equal(state.player.daypartNoticeHintShown, false);
    assert.equal(await recordOrdinaryWakeAndClaimDaypartHint(1, db), DAYPART_NOTICE_HINT_TEXT);
    assert.equal(state.player.ordinaryWakeCount, 2);
    assert.equal(state.player.daypartNoticeHintShown, true);
    assert.equal(await recordOrdinaryWakeAndClaimDaypartHint(1, db), null);
    assert.equal(state.player.ordinaryWakeCount, 3);
  }

  {
    const { db, state } = fakeDb({
      daypartNoticesEnabled: false,
      daypartNoticeHintShown: false,
      ordinaryWakeCount: 1,
    });
    assert.equal(await recordOrdinaryWakeAndClaimDaypartHint(1, db), null);
    assert.equal(state.player.ordinaryWakeCount, 2);
    assert.equal(state.player.daypartNoticeHintShown, false);
  }

  const enabledText = renderNotificationSettings({ daypartNoticesEnabled: true, autoActionMessagesEnabled: false });
  assert.ok(enabledText.includes("Повідомлення про зміну часу дня: увімкнено"));
  assert.ok(enabledText.includes("доведеться частіше звіряти /time, /weather"));
  assert.ok(enabledText.includes("Авто-повідомлення: вимкнено"));

  const disabledText = renderNotificationSettings({ daypartNoticesEnabled: false, autoActionMessagesEnabled: true });
  assert.ok(disabledText.includes("Повідомлення про зміну часу дня: вимкнено"));
  assert.ok(disabledText.includes("Світ усе одно світлішає"));
  assert.ok(disabledText.includes("Авто-повідомлення: увімкнено"));
  assert.match(AUTO_ACTION_MESSAGES_ENABLED_TEXT, /Авто-повідомлення увімкнено/);
  assert.match(AUTO_ACTION_MESSAGES_DISABLED_TEXT, /Авто-повідомлення вимкнено/);

  const keyboardWithAutoOff = buildSettingsKeyboard({ daypartNoticesEnabled: true, autoActionMessagesEnabled: false });
  const keyboardWithAutoOffText = keyboardWithAutoOff.inline_keyboard.flat().map((button) => button.text);
  assert.ok(keyboardWithAutoOffText.includes("Увімкнути авто-повідомлення"));

  const keyboardWithAutoOn = buildSettingsKeyboard({ daypartNoticesEnabled: true, autoActionMessagesEnabled: true });
  const keyboardWithAutoOnText = keyboardWithAutoOn.inline_keyboard.flat().map((button) => button.text);
  assert.ok(keyboardWithAutoOnText.includes("Вимкнути авто-повідомлення"));

  console.log("Player notification settings helpers OK");
})();
