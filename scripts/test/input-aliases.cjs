const assert = require("node:assert/strict");

require("ts-node/register");

const { normalizeInput, parseAlias, suggestAliasInputs } = require("../../src/input/aliases");
const { isDreamGateOpeningPhrase } = require("../../src/services/tutorial");

function assertAlias(input, expected) {
  assert.deepEqual(parseAlias(input), expected, `Unexpected alias parse for: ${input}`);
}

assert.equal(normalizeInput("  /Look@Chornolis_bot!!!  "), "/look");
assert.equal(normalizeInput("з’їсти   ягоди."), "з'їсти ягоди");

assertAlias("/look", { kind: "location" });
assertAlias("див", { kind: "look-action" });
assertAlias("дивитися", { kind: "look-action" });
assertAlias("роздивитися", { kind: "look-action" });
assertAlias("/examine", { kind: "look-action" });

assertAlias("південь", { kind: "move", direction: "SOUTH" });
assertAlias("пів", { kind: "move", direction: "SOUTH" });
assertAlias("йти на захід", { kind: "move", direction: "WEST" });
assertAlias("/n", { kind: "move", direction: "NORTH" });
assertAlias("вср", { kind: "move", direction: "INSIDE" });
assertAlias("/inside", { kind: "move", direction: "INSIDE" });
assertAlias("наз", { kind: "move", direction: "OUTSIDE" });
assertAlias("назовні", { kind: "move", direction: "OUTSIDE" });

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

assertAlias("збирати ягоди", { kind: "gather", resourceKey: "berries" });
assertAlias("збирати гриби", { kind: "gather", resourceKey: "mushrooms" });
assertAlias("збирати лікарські трави", { kind: "gather", resourceKey: "herbs" });
assertAlias("підібрати хмиз", { kind: "pickup-target", target: "хмиз" });

assertAlias("з'їсти ягоди", { kind: "use-item", item: "berries" });
assertAlias("зʼїсти гриби", { kind: "use-item", item: "mushrooms" });
assertAlias("використати лікарські трави", { kind: "use-item", item: "herbs" });
assertAlias("запалити факел", { kind: "light-torch" });
assertAlias("погасити факел", { kind: "douse-torch" });

assertAlias("навчальний сон", { kind: "sleep", tutorial: true });
assertAlias("навчання", { kind: "sleep", tutorial: true });
assertAlias("туторіал", { kind: "sleep", tutorial: true });
assertAlias("пройти навчання", { kind: "sleep", tutorial: true });
assertAlias("повернутися до навчання", { kind: "sleep", tutorial: true });
assertAlias("сон", { kind: "sleep" });
assertAlias("спати", { kind: "sleep" });
assertAlias("прокинутися", { kind: "wake" });
assertAlias("відкрити", { kind: "open" });

assertAlias("відпочити", { kind: "rest", mode: "start" });
assertAlias("додати відпочинок у чергу", { kind: "rest", mode: "queue" });
assertAlias("перервати відпочинок", { kind: "rest", mode: "interrupt" });
assertAlias("черга", { kind: "queue", mode: "status" });
assertAlias("скасувати", { kind: "queue", mode: "cancel-current" });
assertAlias("очистити чергу", { kind: "queue", mode: "clear" });

assertAlias("сказати Хай стежка буде м'якою.", { kind: "say", text: "Хай стежка буде м'якою." });
assertAlias("/say Відчинитися", { kind: "say", text: "Відчинитися" });
assertAlias("Сказати «Відчинитися»", { kind: "say", text: "«Відчинитися»" });
assertAlias("говорити Відчинись будь ласка", { kind: "say", text: "Відчинись будь ласка" });
assertAlias("ск Можеш відчинитися", { kind: "say", text: "Можеш відчинитися" });
assertAlias("/сказ Відчинися", { kind: "say", text: "Відчинися" });
assertAlias("гов Відкрийся", { kind: "say", text: "Відкрийся" });
assert.equal(isDreamGateOpeningPhrase("Відчинитися"), true);
assert.equal(isDreamGateOpeningPhrase("Відчинись будь ласка"), true);
assert.equal(isDreamGateOpeningPhrase("Можеш відчинитися?"), true);
assert.equal(isDreamGateOpeningPhrase("Сьогодні гарний туман"), false);
assertAlias("роздивитися труп", { kind: "target-action", action: "inspect", target: "труп" });
assertAlias("атакувати мишу", { kind: "target-action", action: "attack", target: "мишу" });
assertAlias("привітати 1", { kind: "target-action", action: "greet", target: "1" });
assertAlias("говорити з мандрівником", { kind: "target-action", action: "greet", target: "мандрівником" });
assertAlias("освіжити труп", { kind: "target-action", action: "freshen", target: "труп" });
assertAlias("викинути факел", { kind: "drop-inventory-item", target: "факел" });
assertAlias("річ ягоди", { kind: "inspect-inventory-item", target: "ягоди" });
assertAlias("кивнути Здравомир", { kind: "social-signal", signal: "nod", target: "здравомир" });

assert.equal(parseAlias("це точно не команда"), null);
assert.ok(suggestAliasInputs("роздивит").includes("роздивитися"), "Expected alias suggestions to include роздивитися");
assert.ok(suggestAliasInputs("пів").includes("південь"), "Expected alias suggestions to include південь");
assert.ok(suggestAliasInputs("назо").includes("назовні"), "Expected alias suggestions to include назовні");

console.log("Input aliases OK");
