# Camp Spirit Cat / Табірний кіт-бережник

## One-line pitch

Табірний кіт-бережник — безмовна духовна істота, прив’язана до меж табору: ловить мишей, краде або випрошує сире м’ясо, гріється біля вогнища, реагує тілом на погоду й темряву та дає гравцям малі взаємодії без перетворення на повноцінного компаньйона. Годування сирим м’ясом не є окремим social: це перший живий приклад generic `give`.

## Чому це не просто декоративна тварина

Кіт має закривати три діри у відчутті табору:

1. **Екологічна:** у таборі є миші — отже має бути хтось, хто на них реагує локально.
2. **Соціальна:** гравець отримує маленькі, зрозумілі, тілесні взаємодії без реплік NPC.
3. **Атмосферна:** табір має почуватися обжитим, теплим і трохи дивним навіть без великих квестів.

## Рекомендована форма

Не фіксувати стать як механіку. У даних можна мати display-варианти:

- “кіт” — базова назва для UI й коду;
- “киця” / “кішка” — можливий локалізований варіант у текстах;
- власне ім’я, якщо буде табірний lore: `Вуглик`, `Попілько`, `Мурко`, `Жаринка`, `Курний`, `Димко`.

Найкращий компроміс: **“табірний кіт-бережник”** як системна назва, а стать/ім’я — flavor, не геймплей.

## Nature / природа істоти

- Не старіє.
- Не помирає від віку, голоду, погоди чи звичайної екології.
- Не має голоду як survival-потреби, але може використовувати `EAT` як дію/анімацію, коли їсть сире м’ясо або здобич.
- Не виходить за межі табору.
- Може ходити “вгору” у межах табору: на дах, полицю, дерево над табором, камінь, піч, стіс, балку.
- При переляку або програній соціальній сцені тікає “вниз” або в безпечну табірну нішу.
- Не говорить людськими репліками.
- Комунікує тілом: поглядом, хвостом, вухами, муркотінням, шипінням, тертям об ноги, дряпанням, позою.

## Core behavior priorities

Порядок бажаний саме такий, щоб кіт не ставав хаотичним генератором дрібних подій:

1. **Safety / boundary correction** — якщо кіт чомусь поза табором, повернути в найближчу табірну локацію.
2. **Flee down** — якщо наляканий, біжить вниз/в укриття, не за межі табору.
3. **Mouse hunting** — якщо у таборі є миші, це найвищий нормальний пріоритет.
4. **Meat interest** — якщо є сире м’ясо у скрині/коробці/на землі/у гравця поруч, кіт проявляє інтерес.
5. **Fire comfort** — якщо холодно, темно, мокро або є активне вогнище, кіт іде/лягає ближче до тепла.
6. **Social seeking** — ластиться до гравця, особливо якщо той має сире м’ясо.
7. **Ambient life** — сидить, лежить, вмивається, дрімає, ходить кругами, дивиться у темряву.

## Mouse hunting

### Rules

- Кіт полює тільки у camp-tagged локаціях або на camp-linked vertical nodes.
- Миші у таборі мають вищий пріоритет за м’ясо.
- Кіт не повинен бігти в ліс за мишею.
- Якщо миша тікає з табору назовні, кіт зупиняється на межі й повертається.
- Для MVP кіт може вбивати мишу через існуючу `ATTACK` / predator логіку або через спеціальний локальний `HUNT_MOUSE` helper, якщо загальна predator система надто важка.

### Flavor

- Перед атакою: “Кіт завмер, притиснувши вуса до темного кута.”
- Успіх: “Писк обривається. Кіт обережно несе мишу вбік від вогнища.”
- Невдача: “Миша шмигнула під дошку. Кіт довго дивиться туди, ніби дошка винна.”

## Meat behavior

### Sources

- Сире м’ясо у табірній скрині/коробці.
- Сире м’ясо на землі.
- Сире м’ясо в інвентарі персонажа поруч.
- Свіжа здобич / труп миші.

### Camp box theft scene

Коли м’ясо є у коробці і немає мишей:

1. Кіт підходить до коробки.
2. Сідає занадто прямо, хвіст нервово рухається.
3. Гравцям поруч відкриваються малі response options:
   - social/gesture: `Шуганути`;
   - social/gesture: `Замахати руками`;
   - social/gesture або ambient call: `Покликати`;
   - inventory command: `Дати сире м’ясо` → canonical `give сире м’ясо коту`;
   - passive response: `Не чіпати`.
4. Якщо ніхто не реагує, кіт може витягнути 1 одиницю сирого м’яса, відбігти вниз/убік і певний час `EAT`.

### Desired affordance text

> Кіт сидить біля коробки з таким виглядом, ніби це коробка сама його покликала. Він переводить погляд з тебе на м’ясо.

Buttons / aliases:

- `Шуганути` / `/shoo`
- `Замахати руками` / `/wave_off`
- `Дати сире м’ясо` / `give сире м’ясо коту` / `/give raw_meat cat`
- legacy/comfort aliases: `/feed_raw_meat` and forgiving typo alias `/feed_raw_meet`, both routed internally to `give сире м’ясо коту`
- `Покликати` / `/call`

### Balance

- Не красти занадто часто: cooldown на сцену.
- Не красти останній критичний ресурс під час туторіалу, якщо це ламає ранній досвід.
- Якщо гравець вже добровільно дав м’ясо, не красти ще певний час.

## Social gestures to add or generalize

### `CIRCLE_AROUND` / “ходити колом довкола”

General social / movement-flavor action.

Targets:

- self: “ходить колом навколо себе”, ганяється за хвостом;
- creature/player: обходить ноги, нюхає край плаща, перевіряє;
- object/feature: обходить коробку, вогнище, стіс, двері.

Useful beyond cat:

- NPC може ходити довкола вогнища;
- тварини можуть обходити небезпечний предмет;
- ritual content later can reuse the action.

### `RUB_AGAINST` / “ластитися”

Targeted social action by creature toward player/NPC/object.

Rules:

- Кіт може ластитися до персонажів поруч.
- Вищий шанс, якщо target має сире м’ясо.
- Дає гравцеві опцію `Дати сире м’ясо`, якщо м’ясо є, але ця опція має запускати generic `give`, а не окремий social.
- Якщо гравець дає м’ясо через `give`, кіт певний час їсть.
- Якщо гравець ігнорує, кіт може лягти поруч, піти до вогню або перейти до коробки.

### `SHOO` / “шуганути”

Player social response.

- М’яке відлякування, не атака.
- Скасовує meat theft scene.
- Кіт тікає вниз / до безпечного укриття.
- Невеликий cooldown на повторне наближення.

### `WAVE_OFF` / “замахати руками”

М’якший або ширший жест, ніж `SHOO`.

- Може не тільки кота відганяти, а й майбутніх дрібних істот.
- Для кота: припиняє спробу крадіжки, але не робить його “ворожим”.

## `GIVE` tie-in / “дати сире м’ясо коту”

Годування кота має бути першим маленьким, видимим прикладом generic item transfer, а не окремим social action.

Canonical intent for the first MVP:

- `/give сире м’ясо коту`;
- `дати сире м’ясо коту`;
- button `Дати сире м’ясо`, shown only when the player has valid raw meat and the cat is a valid nearby target.

`0.15.12` parser slice for fuller `give` (`GIVE-002`), using the existing Ukrainian lexicon/grammar shape and target aliases where possible rather than a separate cat-only command:

- `дати м’яса коту`;
- `дати мясо кіт`;
- `дати сирого м’яса бережнику`;
- apostrophe variants such as `м’ясо`, `мʼясо`, `м'ясо`, and missing-apostrophe `мясо`;
- target case variants and hyphenated aliases such as `коту-бережнику`, if the cat uses a hyphenated epithet/name.

Future `GIVE-002` slices should broaden the same approach beyond the raw-meat/camp-cat case: player/NPC gifts, quest hand-ins, item-instance ambiguity and barter should reuse this parser shape instead of adding one-off verbs.

Compatibility aliases:

- `/feed_raw_meat` → parse as `give raw meat cat`;
- `/feed_raw_meet` → forgiving typo alias, also parse as `give raw meat cat`;
- any older `/feed_cat` alias, if already present, should also route to `give` rather than introduce a separate action type.

Rules:

- Перевіряє raw meat в інвентарі або в іншому supported source, якщо generic `give` уже дозволяє source selection.
- Знімає рівно 1 одиницю з giver-а.
- Записує ordinary transfer / `GIVE` action or event first.
- Після успішного `GIVE` черга дії кота отримує `EAT` / “їсть м’ясо” або короткий eating cooldown.
- Записує коротку пам’ять: цей персонаж пахне м’ясом / нещодавно годував.
- Cat-specific code may validate “cat accepts raw meat”, but item transfer semantics should live in `give`, not in social gestures.

## Weather and time reactions

### Daypart

- Dawn: кіт обходить межу табору, нюхає сліди, сідає біля входу.
- Day: багато лежить, вмивається, спить у теплому місці.
- Dusk: активніший; слухає мишей, дивиться в кутки.
- Night: тримається ближче до вогню або висоти; очі відбивають світло.

### Weather

- Rain: ховається під навіс, струшує лапи, невдоволено дивиться на калюжі.
- Storm: притискає вуха, зникає вниз/під лаву, може шипіти на грім.
- Snow/cold: згортається біля жару, лізе до людей ближче.
- Fog: сидить вище й довго дивиться в одну сторону; не називає загрозу, тільки створює напругу.
- Clear night: ходить краєм світла й темряви.

## Camp boundary and verticality

`0.15.4` implementation note: the first runtime boundary is intentionally narrow. The cat may move only between `start_border_camp` and `start_border_watchtower` through the existing `UP`/`DOWN` exits, and a world tick corrects it back to `start_border_camp` if an admin/debug action or seed drift places it outside those keys. Wider camp tags, flee-down scenes and mouse-priority hunting remain future slices.

`0.15.6` implementation note: the first watch-posture slice adds quiet body-language text for camp-local mice, night/dusk/dawn, active campfire light and the starter watchtower. Direct `look` and `examine` inspection are intentionally distinct: brief look stays compact, while full examination gives richer attentive detail about the cat's boundary-guard nature. This is a visible-state/copy layer only: no proactive chat, no exact hidden-target warning, no hunting and no companion behavior.

### Boundary

- Кіт має `campBound: true` або еквівалент у species/behavior config.
- Дозволені локації — ті, що мають tag `camp`, `campInterior`, `campVertical`, `campRoof`, `campCellar`, `campPerch`.
- Якщо route веде поза табір — не брати її, крім forced admin/debug correction.
- Якщо кіт опинився поза табором — наступний tick повертає його в anchor.

### Vertical behavior

- Up: дах, балка, дерево над табором, полиця, високий камінь, стіс.
- Down: під лаву, під настил, у суху яму, до тепла, в нору біля складу.
- При `SHOO`/`WAVE_OFF`: prefer down/safe node.
- При мишах: може йти down, якщо миша “внизу”, але не за межі табору.

## Signals and body language

Кіт не повинен перетворитися на детектор усього. Сигнали мають бути неточними:

- **Миша поруч:** кіт завмирає, рухає вухами, дивиться в нижній кут.
- **М’ясо поруч:** сідає біля коробки, муркоче занадто голосно, торкає край лапою.
- **Темрява/небезпека:** вигинає спину, шипить у бік темряви, але не називає істоту.
- **Холод:** лізе ближче до вогню або до людини.
- **Дощ:** ховається й обтрушує лапи.
- **Гравець з м’ясом:** ластиться до ніг, дивиться на руки.

## Additional activity ideas

- Приносить мертву мишу на край світла як “подарунок”.
- Лягає на теплу золу після згаслого вогню, поки там ще є тепло.
- Наступає лапою на dropped item і вдає, що не має стосунку до цього.
- Спить на коробці, через що гравцеві треба “попросити відійти” або “зняти кота” м’якою дією.
- Дере кігті об табірний стовп; пізніше це може бути “мітка”, що кіт давно тут.
- Сидить спиною до гравця, коли образився після частого `SHOO`.
- Муркоче біля хворого/втомленого персонажа — чистий flavor або слабкий atmospheric cue без механічного лікування.
- Стрибає на висоту, якщо у таборі багато руху/натовпу.
- Не любить воду: не переходить мокрі/затоплені camp nodes, якщо є сухий шлях.

## MVP scope

MVP не має включати:

- повноцінний companion/follow режим;
- приручення;
- смерть кота;
- розмноження;
- інвентар кота;
- складні статуси довіри;
- реальні діалоги;
- вихід у ліс;
- магічні бойові здібності.

MVP має включати:

- один seeded табірний кіт;
- camp-bound movement;
- mouse-first behavior;
- idle/fire/body-language ambient actions;
- meat-interest scene з 2–4 player responses;
- generic `give` bridge for `Дати сире м’ясо коту`;
- `RUB_AGAINST` і, якщо дешево, generalized `CIRCLE_AROUND`;
- тести boundary + mouse priority + meat scene + no aging/death.

## Acceptance criteria

- Кіт не старіє і не вмирає від natural lifecycle/hunger.
- Кіт не виходить за межі табору під normal ticks.
- Якщо у таборі є миша, кіт обирає mouse-hunting behavior перед meat theft/idle.
- Якщо мишей немає, а сире м’ясо є у доступній табірній коробці, кіт може почати meat-interest scene.
- Гравець поруч бачить щонайменше `Шуганути` або `Замахати руками`; якщо має сире м’ясо — також `Дати сире м’ясо`, яка викликає generic `give`.
- `Шуганути`/`Замахати руками` скасовує сцену і кіт тікає вниз/у безпечну camp node.
- `Дати сире м’ясо` / `/feed_raw_meat` / `/feed_raw_meet` парсяться у `give raw meat cat`; успішний `GIVE` знімає 1 raw meat і ставить коту eating action/cooldown. З `0.15.12` перший `GIVE-002` parser slice також приймає природніші форми на кшталт `дати м’яса коту`, `дати мясо кіт`, `дати сирого м’яса бережнику`, але ширші gifts/barter лишаються майбутньою роботою.
- У дощ/бурю/холод/ніч кіт має безмовні body-language lines, але не дає точних debug-підказок.
- Тести покривають no-boundary-leak, mouse priority, meat response і immortal/lifecycle guard.
