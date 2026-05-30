const assert = require("node:assert/strict");

require("ts-node/register");

const { formatAliasSuggestion, normalizeInput, parseAlias, suggestAliasEntries, suggestAliasInputs } = require("../../src/input/aliases");
const { inventoryResourceKeyFromText } = require("../../src/services/inventoryUse");
const { isDreamGateOpeningPhrase, localGateOpenAttemptText } = require("../../src/services/tutorial");
const { normalizeCreatureActionText } = require("../../src/utils/creatureActionText");
const { resourceAccusativeName } = require("../../src/utils/resourceText");

function assertAlias(input, expected) {
  assert.deepEqual(parseAlias(input), expected, `Unexpected alias parse for: ${input}`);
}

const closedSettlementGateText = localGateOpenAttemptText({
  name: "Зачинені ворота",
  data: { openable: false, locked: true, locks_exit_direction: "EAST" },
});
assert.match(closedSettlementGateText, /Ворота тут є/);
assert.match(closedSettlementGateText, /східний прохід/);
assert.match(closedSettlementGateText, /відкриється лише за певних умов/);

assert.equal(normalizeInput("  /Look@Chornolis_bot!!!  "), "/look");
assert.equal(normalizeInput("/sleep_tutorial"), "/sleep tutorial");
assert.equal(normalizeInput("/queue_cancel"), "/queue cancel");
assert.equal(normalizeInput("/auto_stop"), "/auto stop");
assert.equal(normalizeInput("з’їсти   ягоди."), "з'їсти ягоди");

assertAlias("/look", { kind: "location" });
assertAlias("/glance", { kind: "glance" });
assertAlias("глянути швидко", { kind: "glance" });
assertAlias("швидко глянути", { kind: "glance" });
assertAlias("/exits", { kind: "exits" });
assertAlias("виходи", { kind: "exits" });
assertAlias("куди можна йти", { kind: "exits" });
assertAlias("див", { kind: "look-action" });
assertAlias("дивитися", { kind: "look-action" });
assertAlias("роздивитися", { kind: "look-action" });
assertAlias("/examine", { kind: "look-action" });

assertAlias("південь", { kind: "move", direction: "SOUTH" });
assert.equal(parseAlias("пів"), null);
assertAlias("йти на захід", { kind: "move", direction: "WEST" });
assertAlias("/n", { kind: "move", direction: "NORTH" });
assertAlias("вср", { kind: "move", direction: "INSIDE" });
assertAlias("/inside", { kind: "move", direction: "INSIDE" });
assertAlias("/enter", { kind: "move", direction: "INSIDE" });
assertAlias("enter bushes", { kind: "move", direction: "INSIDE" });
assertAlias("увійти в кущі", { kind: "move", direction: "INSIDE" });
assertAlias("наз", { kind: "move", direction: "OUTSIDE" });
assertAlias("назовні", { kind: "move", direction: "OUTSIDE" });
assertAlias("/leave", { kind: "session-presence", mode: "end" });
assertAlias("leave cave", { kind: "move", direction: "OUTSIDE" });
assertAlias("/afk", { kind: "session-presence", mode: "afk" });
assertAlias("afk", { kind: "session-presence", mode: "afk" });
assertAlias("/end_session", { kind: "session-presence", mode: "end" });
assertAlias("/quit", { kind: "session-presence", mode: "end" });
assertAlias("end session", { kind: "session-presence", mode: "end" });
assertAlias("вийти з кущів", { kind: "move", direction: "OUTSIDE" });

assertAlias("хто", { kind: "who" });
assertAlias("хтоя", { kind: "me" });
assertAlias("речі", { kind: "inventory" });
assertAlias("новини", { kind: "news" });
assertAlias("час", { kind: "time" });
assertAlias("назад", { kind: "back" });
assertAlias("сховати клавіатуру", { kind: "hide-keyboard" });

assertAlias("/chat", { kind: "chat" });
assertAlias("/chat 1", { kind: "chat", mode: "time", window: "1" });
assertAlias("chat all", { kind: "chat", mode: "time", window: "all" });
assertAlias("chat location 1", { kind: "chat", mode: "location", window: "1" });
assertAlias("chat character all", { kind: "chat", mode: "character", window: "all" });

assertAlias("роздивитися сліди", { kind: "track", detail: true });
assertAlias("/examine tracks", { kind: "track", detail: true });
assertAlias("роздивитися траву", { kind: "inspect-vegetation" });
assertAlias("оцінити відновлення", { kind: "inspect-vegetation" });
assertAlias("/examine sign", { kind: "inspect-border-marker" });
assertAlias("роздивитися межовий знак", { kind: "inspect-border-marker" });
assertAlias("придивитися до знака", { kind: "inspect-border-marker" });
assertAlias("look лавка", { kind: "inspect-feature", target: "лавка", detail: "brief" });
assertAlias("/examine лавка", { kind: "inspect-feature", target: "лавка", detail: "full" });
assertAlias("look bench", { kind: "inspect-feature", target: "bench", detail: "brief" });
assertAlias("/look Лукан", { kind: "inspect-feature", target: "лукан", detail: "brief" });
assertAlias("глянути Лукан", { kind: "inspect-feature", target: "лукан", detail: "brief" });
assertAlias("дивитися Лукан", { kind: "inspect-feature", target: "лукан", detail: "brief" });
assertAlias("озирнутися на Лукана", { kind: "inspect-feature", target: "лукана", detail: "brief" });
assertAlias("оглянути браму", { kind: "inspect-feature", target: "браму", detail: "brief" });
assertAlias("огл брама", { kind: "inspect-feature", target: "брама", detail: "brief" });
assertAlias("придивитися до брами", { kind: "inspect-feature", target: "брами", detail: "full" });

assertAlias("збирати ягоди", { kind: "gather", resourceKey: "berries" });
assertAlias("збирати гриби", { kind: "gather", resourceKey: "mushrooms" });
assertAlias("збирати лікарські трави", { kind: "gather", resourceKey: "herbs" });
assertAlias("підібрати ягоди", { kind: "pickup-target", target: "ягоди" });
assertAlias("взяти трави", { kind: "pickup-target", target: "трави" });
assertAlias("take herbs", { kind: "pickup-target", target: "herbs" });
assertAlias("get mushrooms", { kind: "pickup-target", target: "mushrooms" });
assertAlias("get all", { kind: "pickup-target", target: "all" });
assertAlias("pick all", { kind: "pickup-target", target: "all" });
assertAlias("взяти все", { kind: "pickup-target", target: "все" });
assertAlias("підняти все", { kind: "pickup-target", target: "все" });
assertAlias("підібрати хмиз", { kind: "pickup-target", target: "хмиз" });

assertAlias("з'їсти ягоди", { kind: "use-item", item: "berries" });
assertAlias("зʼїсти гриби", { kind: "use-item", item: "mushrooms" });
assertAlias("використати лікарські трави", { kind: "use-item", item: "herbs" });
assertAlias("з'їсти лікарські трави", { kind: "use-item", item: "herbs" });
assertAlias("eat herbs", { kind: "use-item", item: "herbs" });
assertAlias("підсмажити м'ясо", { kind: "cook-meat" });
assertAlias("cook meat", { kind: "cook-meat" });
assertAlias("з'їсти м'ясо", { kind: "use-item", item: "cooked_meat" });
assertAlias("eat cooked meat", { kind: "use-item", item: "cooked_meat" });
assertAlias("запалити факел", { kind: "light-torch" });
assertAlias("погасити факел", { kind: "douse-torch" });

assertAlias("навчальний сон", { kind: "sleep", tutorial: true });
assertAlias("навчання", { kind: "sleep", tutorial: true });
assertAlias("туторіал", { kind: "sleep", tutorial: true });
assertAlias("пройти навчання", { kind: "sleep", tutorial: true });
assertAlias("повернутися до навчання", { kind: "sleep", tutorial: true });
assertAlias("/sleep_tutorial", { kind: "sleep", tutorial: true });
assertAlias("сон", { kind: "sleep" });
assertAlias("спати", { kind: "sleep" });
assertAlias("прокинутися", { kind: "wake" });
assertAlias("відкрити", { kind: "open" });
assertAlias("/open ворота", { kind: "open", target: "ворота" });
assertAlias("відкрити ворота", { kind: "open", target: "ворота" });
assertAlias("відчинити браму", { kind: "open", target: "браму" });
assertAlias("відкрий ворота", { kind: "open", target: "ворота" });
assertAlias("відч ворота", { kind: "open", target: "ворота" });
assertAlias("привідкрити двері", { kind: "open", target: "двері" });
assertAlias("o gate", { kind: "open", target: "gate" });

assertAlias("відпочити", { kind: "rest", mode: "start" });
assertAlias("додати відпочинок у чергу", { kind: "rest", mode: "queue" });
assertAlias("перервати відпочинок", { kind: "rest", mode: "interrupt" });
assertAlias("/sit", { kind: "posture", mode: "sit" });
assertAlias("сісти", { kind: "posture", mode: "sit" });
assertAlias("/stand", { kind: "posture", mode: "stand" });
assertAlias("встати", { kind: "posture", mode: "stand" });
assertAlias("/put", { kind: "put-item", item: "туша", container: "рів" });
assertAlias("put", { kind: "put-item", item: "туша", container: "рів" });
assertAlias("покласти", { kind: "put-item", item: "туша", container: "рів" });
assertAlias("/put туша рів", { kind: "put-item", item: "туша", container: "рів" });
assertAlias("/put туша 3 падальний рів", { kind: "put-item", item: "туша", amount: 3, container: "падальний рів" });
assertAlias("/put туша all рів", { kind: "put-item", item: "туша", amount: "all", container: "рів" });
assertAlias("покласти всі рештки до ями", { kind: "put-item", item: "рештки", amount: "all", container: "ями" });
assertAlias("put out torch", { kind: "douse-torch" });
assertAlias("черга", { kind: "queue", mode: "status" });
assertAlias("/queue_cancel", { kind: "queue", mode: "cancel-current" });
assertAlias("/queue_clear", { kind: "queue", mode: "clear" });
assertAlias("скасувати", { kind: "queue", mode: "cancel-current" });
assertAlias("очистити чергу", { kind: "queue", mode: "clear" });
assertAlias("/auto_stop", { kind: "auto", mode: "stop" });

assertAlias("сказати Хай стежка буде м'якою.", { kind: "say", text: "Хай стежка буде м'якою." });
assertAlias("/say Відчинитися", { kind: "say", text: "Відчинитися" });
assertAlias("Сказати «Відчинитися»", { kind: "say", text: "«Відчинитися»" });
assertAlias("говорити Відчинись будь ласка", { kind: "say", text: "Відчинись будь ласка" });
assertAlias("ск Можеш відчинитися", { kind: "say", text: "Можеш відчинитися" });
assertAlias("/сказ Відчинися", { kind: "say", text: "Відчинися" });
assertAlias("гов Відкрийся", { kind: "say", text: "Відкрийся" });
assertAlias("whisper Данило Тихіше, там щось є.", { kind: "whisper", text: "Данило Тихіше, там щось є." });
assertAlias("/шепнути Велика Оля Не руш.", { kind: "whisper", text: "Велика Оля Не руш." });
assertAlias("reply Я почув.", { kind: "reply", text: "Я почув." });
assertAlias("/відповісти Йду за тобою.", { kind: "reply", text: "Йду за тобою." });
assertAlias("shout Сюди!", { kind: "shout", text: "Сюди!" });
assertAlias("гукнути Хто там?", { kind: "shout", text: "Хто там?" });
assertAlias("крикнути Стій!", { kind: "shout", text: "Стій!" });
assertAlias("кричати Допоможіть!", { kind: "shout", text: "Допоможіть!" });
assertAlias("крик Допоможіть!", { kind: "shout", text: "Допоможіть!" });
assertAlias("вигукнути Обережно!", { kind: "shout", text: "Обережно!" });
assertAlias("волати Не йдіть туди!", { kind: "shout", text: "Не йдіть туди!" });
assert.equal(isDreamGateOpeningPhrase("Відчинитися"), true);
assert.equal(isDreamGateOpeningPhrase("Відчинись будь ласка"), true);
assert.equal(isDreamGateOpeningPhrase("Можеш відчинитися?"), true);
assert.equal(isDreamGateOpeningPhrase("Сьогодні гарний туман"), false);
assertAlias("роздивитися труп", { kind: "inspect-feature", target: "труп", detail: "full" });
assertAlias("атакувати мишу", { kind: "target-action", action: "attack", target: "мишу" });
assertAlias("fight wolf", { kind: "target-action", action: "attack", target: "wolf" });
assertAlias("kick rabbit", { kind: "target-action", action: "attack", target: "rabbit" });
assertAlias("привітати 1", { kind: "target-action", action: "greet", target: "1" });
assertAlias("говорити з мандрівником", { kind: "target-action", action: "greet", target: "мандрівником" });
assertAlias("освіжити труп", { kind: "target-action", action: "freshen", target: "труп" });
assertAlias("butcher corpse", { kind: "target-action", action: "freshen", target: "corpse" });
assertAlias("розібрати труп", { kind: "target-action", action: "freshen", target: "труп" });
assertAlias("freshen all", { kind: "target-action", action: "freshen", target: "all" });
assertAlias("свіжувати все", { kind: "target-action", action: "freshen", target: "все" });
assertAlias("освіжити всі", { kind: "target-action", action: "freshen", target: "всі" });
assertAlias("викинути факел", { kind: "drop-inventory-item", target: "факел" });
assertAlias("річ ягоди", { kind: "inspect-inventory-item", target: "ягоди" });
assert.equal(inventoryResourceKeyFromText("mushroom"), "mushrooms");
assert.equal(inventoryResourceKeyFromText("raw meat"), "raw_meat");
assert.equal(resourceAccusativeName({ key: "grass", name: "трава" }), "траву");
assert.equal(normalizeCreatureActionText("їсть трава"), "їсть траву");
assert.equal(normalizeCreatureActionText("підбирає факел до мисливського набору; hunter_torches:1"), "підбирає факел до мисливського набору");
assert.equal(normalizeCreatureActionText("вертається до воріт із запаленим факелом і запасним у торбі; hunter_returning_for_torches; hunter_torches:2"), "вертається до воріт із запаленим факелом і запасним у торбі");
assert.equal(normalizeCreatureActionText("claimed_by_hunter:12; мисливець несе здобич до падального рову"), "мисливець несе здобич до падального рову");
assertAlias("кивнути Здравомир", { kind: "social-signal", signal: "nod", target: "здравомир" });

assert.equal(parseAlias("це точно не команда"), null);
assert.ok(suggestAliasInputs("роздивит").includes("роздивитися"), "Expected alias suggestions to include роздивитися");
assert.ok(suggestAliasInputs("пів").includes("північ"), "Expected alias suggestions to include північ");
assert.ok(suggestAliasInputs("пів").includes("південь"), "Expected alias suggestions to include південь");
assert.ok(suggestAliasInputs("назо").includes("назовні"), "Expected alias suggestions to include назовні");
assert.ok(suggestAliasInputs("крик Допоможіть!").includes("крикнути"), "Expected alias suggestions to include крикнути");
assert.ok(suggestAliasInputs("крич").includes("кричати"), "Expected alias suggestions to include кричати");
assert.ok(suggestAliasInputs("шеп").includes("шепнути"), "Expected alias suggestions to include шепнути");
assert.ok(suggestAliasInputs("огл брама").includes("оглянути"), "Expected alias suggestions to include оглянути");
assert.ok(suggestAliasEntries("огл брама").map(formatAliasSuggestion).includes("оглянути (/examine)"), "Expected formatted suggestions to include slash command for оглянути");
assert.ok(suggestAliasEntries("швидк").map(formatAliasSuggestion).includes("швидкий огляд (/glance)"), "Expected formatted suggestions to include slash command for quick glance");

console.log("Input aliases OK");
