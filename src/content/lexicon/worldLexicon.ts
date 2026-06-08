export type GrammarCase =
  | "nominative"
  | "genitive"
  | "dative"
  | "accusative"
  | "instrumental"
  | "locative"
  | "vocative";

export type NameForms = Record<GrammarCase, string>;
export type GrammaticalGender = "MASCULINE" | "FEMININE" | "NEUTER" | "PLURAL";
export type Animacy = "ANIMATE" | "INANIMATE";
export type LexiconKind = "creature" | "profession" | "spirit" | "resource" | "feature" | "common";

export type LexiconEntry = {
  key: string;
  kind: LexiconKind;
  forms: NameForms;
  grammaticalGender: GrammaticalGender;
  animacy: Animacy;
  tags: readonly string[];
};

export const WORLD_LEXICON = [
  entry("animal.rabbit", "creature", "MASCULINE", "ANIMATE", ["animal", "prey", "current"], ["заєць", "зайця", "зайцю", "зайця", "зайцем", "зайці", "зайцю"]),
  entry("animal.rabbit_male", "creature", "MASCULINE", "ANIMATE", ["animal", "prey", "current", "sexed"], ["заєць", "зайця", "зайцеві", "зайця", "зайцем", "зайцеві", "зайцю"]),
  entry("animal.rabbit_female", "creature", "FEMININE", "ANIMATE", ["animal", "prey", "current", "sexed"], ["зайчиха", "зайчихи", "зайчисі", "зайчиху", "зайчихою", "зайчисі", "зайчихо"]),
  entry("animal.mouse", "creature", "FEMININE", "ANIMATE", ["animal", "prey", "current"], ["миша", "миші", "миші", "мишу", "мишею", "миші", "мише"]),
  entry("animal.mouse_male", "creature", "MASCULINE", "ANIMATE", ["animal", "prey", "current", "sexed"], ["миш", "миша", "мишу", "миша", "мишем", "миші", "мишу"]),
  entry("animal.fox", "creature", "FEMININE", "ANIMATE", ["animal", "predator", "current"], ["лисиця", "лисиці", "лисиці", "лисицю", "лисицею", "лисиці", "лисице"]),
  entry("animal.fox_male", "creature", "MASCULINE", "ANIMATE", ["animal", "predator", "current", "sexed"], ["лис", "лиса", "лисові", "лиса", "лисом", "лисові", "лисе"]),
  entry("animal.fox_female", "creature", "FEMININE", "ANIMATE", ["animal", "predator", "current", "sexed"], ["лисиця", "лисиці", "лисиці", "лисицю", "лисицею", "лисиці", "лисице"]),
  entry("animal.wolf", "creature", "MASCULINE", "ANIMATE", ["animal", "predator", "current"], ["вовк", "вовка", "вовку", "вовка", "вовком", "вовку", "вовче"]),
  entry("animal.wolf_male", "creature", "MASCULINE", "ANIMATE", ["animal", "predator", "current", "sexed"], ["вовк", "вовка", "вовкові", "вовка", "вовком", "вовкові", "вовче"]),
  entry("animal.wolf_female", "creature", "FEMININE", "ANIMATE", ["animal", "predator", "current", "sexed"], ["вовчиця", "вовчиці", "вовчиці", "вовчицю", "вовчицею", "вовчиці", "вовчице"]),
  entry("animal.boar", "creature", "MASCULINE", "ANIMATE", ["animal", "forest", "future"], ["кабан", "кабана", "кабану", "кабана", "кабаном", "кабані", "кабане"]),
  entry("animal.deer", "creature", "MASCULINE", "ANIMATE", ["animal", "forest", "future"], ["олень", "оленя", "оленю", "оленя", "оленем", "олені", "оленю"]),
  entry("animal.roe", "creature", "FEMININE", "ANIMATE", ["animal", "forest", "future"], ["сарна", "сарни", "сарні", "сарну", "сарною", "сарні", "сарно"]),
  entry("animal.bear", "creature", "MASCULINE", "ANIMATE", ["animal", "predator", "future"], ["ведмідь", "ведмедя", "ведмедю", "ведмедя", "ведмедем", "ведмеді", "ведмедю"]),
  entry("animal.snake", "creature", "FEMININE", "ANIMATE", ["animal", "swamp", "future"], ["змія", "змії", "змії", "змію", "змією", "змії", "зміє"]),
  entry("animal.hedgehog", "creature", "MASCULINE", "ANIMATE", ["animal", "forest", "future"], ["їжак", "їжака", "їжаку", "їжака", "їжаком", "їжаку", "їжаче"]),
  entry("animal.raven", "creature", "MASCULINE", "ANIMATE", ["animal", "bird", "future"], ["крук", "крука", "круку", "крука", "круком", "круку", "круче"]),
  entry("animal.crow", "creature", "FEMININE", "ANIMATE", ["animal", "bird", "future"], ["ворона", "ворони", "вороні", "ворону", "вороною", "вороні", "вороно"]),
  entry("animal.owl", "creature", "FEMININE", "ANIMATE", ["animal", "bird", "night", "future"], ["сова", "сови", "сові", "сову", "совою", "сові", "сово"]),
  entry("animal.hawk", "creature", "MASCULINE", "ANIMATE", ["animal", "bird", "predator", "future"], ["сокіл", "сокола", "соколу", "сокола", "соколом", "соколі", "соколе"]),
  entry("animal.frog", "creature", "FEMININE", "ANIMATE", ["animal", "swamp", "future"], ["жаба", "жаби", "жабі", "жабу", "жабою", "жабі", "жабо"]),
  entry("animal.fish", "creature", "FEMININE", "ANIMATE", ["animal", "river", "future"], ["риба", "риби", "рибі", "рибу", "рибою", "рибі", "рибо"]),
  entry("animal.dog", "creature", "MASCULINE", "ANIMATE", ["animal", "settlement", "future"], ["пес", "пса", "псу", "пса", "псом", "псі", "псе"]),
  entry("animal.cat", "creature", "MASCULINE", "ANIMATE", ["animal", "settlement", "future"], ["кіт", "кота", "коту", "кота", "котом", "коті", "коте"]),
  entry("animal.horse", "creature", "MASCULINE", "ANIMATE", ["animal", "settlement", "future"], ["кінь", "коня", "коню", "коня", "конем", "коні", "коню"]),
  entry("local_person", "creature", "FEMININE", "ANIMATE", ["human", "local", "current"], ["місцева людина", "місцевої людини", "місцевій людині", "місцеву людину", "місцевою людиною", "місцевій людині", "місцева людино"]),

  entry("profession.herbalist.m", "profession", "MASCULINE", "ANIMATE", ["human", "healer", "current"], ["травник", "травника", "травнику", "травника", "травником", "травнику", "травнику"]),
  entry("profession.herbalist.f", "profession", "FEMININE", "ANIMATE", ["human", "healer", "future"], ["травниця", "травниці", "травниці", "травницю", "травницею", "травниці", "травнице"]),
  entry("profession.hunter.m", "profession", "MASCULINE", "ANIMATE", ["human", "hunter", "current"], ["мисливець", "мисливця", "мисливцю", "мисливця", "мисливцем", "мисливці", "мисливцю"]),
  entry("profession.hunter.f", "profession", "FEMININE", "ANIMATE", ["human", "hunter", "current"], ["мисливиця", "мисливиці", "мисливиці", "мисливицю", "мисливицею", "мисливиці", "мисливице"]),
  entry("profession.healer.m", "profession", "MASCULINE", "ANIMATE", ["human", "healer", "folk"], ["знахар", "знахаря", "знахарю", "знахаря", "знахарем", "знахарі", "знахарю"]),
  entry("profession.healer.f", "profession", "FEMININE", "ANIMATE", ["human", "healer", "folk"], ["знахарка", "знахарки", "знахарці", "знахарку", "знахаркою", "знахарці", "знахарко"]),
  entry("profession.vedun.m", "profession", "MASCULINE", "ANIMATE", ["human", "knowledge", "magic"], ["відун", "відуна", "відуну", "відуна", "відуном", "відуні", "відуне"]),
  entry("profession.vedun.f", "profession", "FEMININE", "ANIMATE", ["human", "knowledge", "magic"], ["відунка", "відунки", "відунці", "відунку", "відункою", "відунці", "відунко"]),
  entry("profession.potioner.m", "profession", "MASCULINE", "ANIMATE", ["human", "healer", "craft"], ["зелійник", "зелійника", "зелійнику", "зелійника", "зелійником", "зелійнику", "зелійнику"]),
  entry("profession.potioner.f", "profession", "FEMININE", "ANIMATE", ["human", "healer", "craft"], ["зелійниця", "зелійниці", "зелійниці", "зелійницю", "зелійницею", "зелійниці", "зелійнице"]),
  entry("profession.rootkeeper.m", "profession", "MASCULINE", "ANIMATE", ["human", "forest", "roots"], ["кореняр", "кореняра", "кореняру", "кореняра", "коренярем", "коренярі", "кореняре"]),
  entry("profession.rootkeeper.f", "profession", "FEMININE", "ANIMATE", ["human", "forest", "roots"], ["коренярка", "коренярки", "коренярці", "коренярку", "кореняркою", "коренярці", "коренярко"]),
  entry("profession.doctor.m", "profession", "MASCULINE", "ANIMATE", ["human", "healer"], ["лікар", "лікаря", "лікарю", "лікаря", "лікарем", "лікарі", "лікарю"]),
  entry("profession.doctor.f", "profession", "FEMININE", "ANIMATE", ["human", "healer"], ["лікарка", "лікарки", "лікарці", "лікарку", "лікаркою", "лікарці", "лікарко"]),
  entry("profession.whisperer.m", "profession", "MASCULINE", "ANIMATE", ["human", "healer", "charm"], ["шептун", "шептуна", "шептуну", "шептуна", "шептуном", "шептуні", "шептуне"]),
  entry("profession.whisperer.f", "profession", "FEMININE", "ANIMATE", ["human", "healer", "charm"], ["шептуха", "шептухи", "шептусі", "шептуху", "шептухою", "шептусі", "шептухо"]),
  entry("profession.seer.m", "profession", "MASCULINE", "ANIMATE", ["human", "knowledge", "omen"], ["віщун", "віщуна", "віщуну", "віщуна", "віщуном", "віщуні", "віщуне"]),
  entry("profession.seer.f", "profession", "FEMININE", "ANIMATE", ["human", "knowledge", "omen"], ["віщунка", "віщунки", "віщунці", "віщунку", "віщункою", "віщунці", "віщунко"]),
  entry("profession.brewer.m", "profession", "MASCULINE", "ANIMATE", ["human", "healer", "craft"], ["зіллєвар", "зіллєвара", "зіллєвару", "зіллєвара", "зіллєваром", "зіллєварі", "зіллєваре"]),
  entry("profession.brewer.f", "profession", "FEMININE", "ANIMATE", ["human", "healer", "craft"], ["зіллєварка", "зіллєварки", "зіллєварці", "зіллєварку", "зіллєваркою", "зіллєварці", "зіллєварко"]),

  entry("spirit.lisovyk", "spirit", "MASCULINE", "ANIMATE", ["spirit", "forest", "current"], ["лісовик", "лісовика", "лісовику", "лісовика", "лісовиком", "лісовику", "лісовику"]),
  entry("spirit.camp_spirit_cat", "spirit", "MASCULINE", "ANIMATE", ["spirit", "camp", "cat", "current"], ["кіт-бережник", "кота-бережника", "коту-бережнику", "кота-бережника", "котом-бережником", "коті-бережнику", "коте-бережнику"]),
  entry("spirit.stezhnyk", "spirit", "MASCULINE", "ANIMATE", ["spirit", "hidden-presence", "future"], ["стежник", "стежника", "стежнику", "стежника", "стежником", "стежнику", "стежнику"]),
  entry("spirit.lisovytsia", "spirit", "FEMININE", "ANIMATE", ["spirit", "forest", "future"], ["лісовиця", "лісовиці", "лісовиці", "лісовицю", "лісовицею", "лісовиці", "лісовице"]),
  entry("spirit.mavka", "spirit", "FEMININE", "ANIMATE", ["spirit", "forest", "future"], ["мавка", "мавки", "мавці", "мавку", "мавкою", "мавці", "мавко"]),
  entry("spirit.rusalka", "spirit", "FEMININE", "ANIMATE", ["spirit", "water", "future"], ["русалка", "русалки", "русалці", "русалку", "русалкою", "русалці", "русалко"]),
  entry("spirit.domovyk", "spirit", "MASCULINE", "ANIMATE", ["spirit", "settlement", "future"], ["домовик", "домовика", "домовику", "домовика", "домовиком", "домовику", "домовику"]),
  entry("spirit.vodianyk", "spirit", "MASCULINE", "ANIMATE", ["spirit", "water", "future"], ["водяник", "водяника", "водянику", "водяника", "водяником", "водянику", "водянику"]),
  entry("spirit.polovyk", "spirit", "MASCULINE", "ANIMATE", ["spirit", "field", "future"], ["польовик", "польовика", "польовику", "польовика", "польовиком", "польовику", "польовику"]),
  entry("spirit.bolotnyk", "spirit", "MASCULINE", "ANIMATE", ["spirit", "swamp", "future"], ["болотник", "болотника", "болотнику", "болотника", "болотником", "болотнику", "болотнику"]),
  entry("spirit.bolotnytsia", "spirit", "FEMININE", "ANIMATE", ["spirit", "swamp", "future"], ["болотниця", "болотниці", "болотниці", "болотницю", "болотницею", "болотниці", "болотнице"]),

  entry("common.corpse", "common", "MASCULINE", "INANIMATE", ["corpse", "body"], ["труп", "трупа", "трупу", "труп", "трупом", "трупі", "трупе"]),
  entry("common.trace", "common", "MASCULINE", "INANIMATE", ["track"], ["слід", "сліду", "сліду", "слід", "слідом", "сліді", "сліде"]),
  entry("common.human_trace", "common", "MASCULINE", "INANIMATE", ["track"], ["людський слід", "людського сліду", "людському сліду", "людський слід", "людським слідом", "людському сліді", "людський сліде"]),

  entry("resource.grass", "resource", "FEMININE", "INANIMATE", ["resource", "forage", "current"], ["трава", "трави", "траві", "траву", "травою", "траві", "траво"]),
  entry("resource.herbs", "resource", "PLURAL", "INANIMATE", ["resource", "gathering", "current"], ["лікарські трави", "лікарських трав", "лікарським травам", "лікарські трави", "лікарськими травами", "лікарських травах", "лікарські трави"]),
  entry("resource.berries", "resource", "PLURAL", "INANIMATE", ["resource", "gathering", "current"], ["ягоди", "ягід", "ягодам", "ягоди", "ягодами", "ягодах", "ягоди"]),
  entry("resource.mushrooms", "resource", "PLURAL", "INANIMATE", ["resource", "gathering", "current"], ["гриби", "грибів", "грибам", "гриби", "грибами", "грибах", "гриби"]),
  entry("resource.root", "resource", "MASCULINE", "INANIMATE", ["resource", "roots", "future"], ["корінь", "кореня", "кореню", "корінь", "коренем", "корені", "кореню"]),
  entry("resource.potion", "resource", "NEUTER", "INANIMATE", ["resource", "potion", "future"], ["зілля", "зілля", "зіллю", "зілля", "зіллям", "зіллі", "зілля"]),
  entry("resource.raw_meat", "resource", "NEUTER", "INANIMATE", ["resource", "food", "current"], ["сире м'ясо", "сирого м'яса", "сирому м'ясу", "сире м'ясо", "сирим м'ясом", "сирому м'ясі", "сире м'ясо"]),
  entry("resource.cooked_meat", "resource", "NEUTER", "INANIMATE", ["resource", "food", "current"], ["смажене м'ясо", "смаженого м'яса", "смаженому м'ясу", "смажене м'ясо", "смаженим м'ясом", "смаженому м'ясі", "смажене м'ясо"]),
  entry("resource.torch", "resource", "MASCULINE", "INANIMATE", ["resource", "fire", "light", "current"], ["факел", "факела", "факелу", "факел", "факелом", "факелі", "факеле"]),
  entry("resource.lit_torch", "resource", "MASCULINE", "INANIMATE", ["resource", "fire", "light", "current"], ["запалений факел", "запаленого факела", "запаленому факелу", "запалений факел", "запаленим факелом", "запаленому факелі", "запалений факеле"]),
  entry("resource.doused_torch", "resource", "MASCULINE", "INANIMATE", ["resource", "fire", "light", "current"], ["притушений факел", "притушеного факела", "притушеному факелу", "притушений факел", "притушеним факелом", "притушеному факелі", "притушений факеле"]),
  entry("resource.twigs", "resource", "MASCULINE", "INANIMATE", ["resource", "fire", "fuel", "current"], ["хмиз", "хмизу", "хмизу", "хмиз", "хмизом", "хмизі", "хмизе"]),
  entry("resource.shah", "resource", "MASCULINE", "INANIMATE", ["resource", "money", "current"], ["шаг", "шага", "шагу", "шаг", "шагом", "шагу", "шагу"]),
  entry("resource.grivna", "resource", "FEMININE", "INANIMATE", ["resource", "money", "current"], ["ґривня", "ґривні", "ґривні", "ґривню", "ґривнею", "ґривні", "ґривне"]),
  entry("resource.honey", "resource", "MASCULINE", "INANIMATE", ["resource", "apiary", "food", "current"], ["мед", "меду", "меду", "мед", "медом", "меді", "меде"]),
  entry("resource.beeswax", "resource", "MASCULINE", "INANIMATE", ["resource", "apiary", "craft", "current"], ["віск", "воску", "воску", "віск", "воском", "воску", "воску"]),
  entry("resource.knife", "resource", "MASCULINE", "INANIMATE", ["resource", "weapon", "tool", "current"], ["простий ніж", "простого ножа", "простому ножу", "простий ніж", "простим ножем", "простому ножі", "простий ножу"]),
  entry("resource.hunting_spear", "resource", "MASCULINE", "INANIMATE", ["resource", "weapon", "hunter", "current"], ["мисливський спис", "мисливського списа", "мисливському спису", "мисливський спис", "мисливським списом", "мисливському списі", "мисливський списе"]),
  entry("resource.sickle", "resource", "MASCULINE", "INANIMATE", ["resource", "weapon", "tool", "current"], ["серп", "серпа", "серпу", "серп", "серпом", "серпі", "серпе"]),
  entry("resource.hand_axe", "resource", "FEMININE", "INANIMATE", ["resource", "weapon", "tool", "current"], ["мала сокира", "малої сокири", "малій сокирі", "малу сокиру", "малою сокирою", "малій сокирі", "мала сокиро"]),
  entry("resource.short_sword", "resource", "MASCULINE", "INANIMATE", ["resource", "weapon", "current"], ["короткий меч", "короткого меча", "короткому мечу", "короткий меч", "коротким мечем", "короткому мечі", "короткий мече"]),

  entry("feature.bortya", "feature", "FEMININE", "INANIMATE", ["feature", "apiary", "current"], ["бортя", "борті", "борті", "бортю", "бортєю", "борті", "борте"]),
  entry("feature.campfire", "feature", "NEUTER", "INANIMATE", ["feature", "fire", "current"], ["вогнище", "вогнища", "вогнищу", "вогнище", "вогнищем", "вогнищі", "вогнище"]),
  entry("feature.magic_campfire", "feature", "NEUTER", "INANIMATE", ["feature", "fire", "magic", "current"], ["незгасне вогнище", "незгасного вогнища", "незгасному вогнищу", "незгасне вогнище", "незгасним вогнищем", "незгасному вогнищі", "незгасне вогнище"]),
  entry("feature.border_marker", "feature", "MASCULINE", "INANIMATE", ["feature", "border", "current"], ["межовий знак", "межового знака", "межовому знаку", "межовий знак", "межовим знаком", "межовому знаку", "межовий знаку"]),
  entry("feature.newcomer_board", "feature", "FEMININE", "INANIMATE", ["feature", "onboarding", "current"], ["дошка для прибулих", "дошки для прибулих", "дошці для прибулих", "дошку для прибулих", "дошкою для прибулих", "дошці для прибулих", "дошко для прибулих"]),
  entry("feature.torch_stand", "feature", "FEMININE", "INANIMATE", ["feature", "fire", "light", "current"], ["смоляна поставка", "смоляної поставки", "смоляній поставці", "смоляну поставку", "смоляною поставкою", "смоляній поставці", "смоляна поставко"]),
  entry("feature.watchtower", "feature", "FEMININE", "INANIMATE", ["feature", "vertical", "camp", "current"], ["сторожова вежа", "сторожової вежі", "сторожовій вежі", "сторожову вежу", "сторожовою вежею", "сторожовій вежі", "сторожова веже"]),
  entry("feature.watchtower_stairs", "feature", "PLURAL", "INANIMATE", ["feature", "vertical", "camp", "current"], ["сходи вниз", "сходів униз", "сходам униз", "сходи вниз", "сходами вниз", "сходах униз", "сходи вниз"]),
  entry("feature.pine", "feature", "FEMININE", "INANIMATE", ["feature", "tree", "current"], ["сосна", "сосни", "сосні", "сосну", "сосною", "сосні", "сосно"]),
  entry("feature.branch", "feature", "FEMININE", "INANIMATE", ["feature", "tree", "current"], ["гілка", "гілки", "гілці", "гілку", "гілкою", "гілці", "гілко"]),
] as const satisfies readonly LexiconEntry[];

function entry(
  key: string,
  kind: LexiconKind,
  grammaticalGender: GrammaticalGender,
  animacy: Animacy,
  tags: readonly string[],
  forms: readonly [string, string, string, string, string, string, string]
): LexiconEntry {
  return {
    key,
    kind,
    forms: {
      nominative: forms[0],
      genitive: forms[1],
      dative: forms[2],
      accusative: forms[3],
      instrumental: forms[4],
      locative: forms[5],
      vocative: forms[6],
    },
    grammaticalGender,
    animacy,
    tags,
  };
}

export function findLexiconEntry(key: string) {
  return WORLD_LEXICON.find((lexiconEntry) => lexiconEntry.key === key);
}

export function requireLexiconEntry(key: string) {
  const lexiconEntry = findLexiconEntry(key);
  if (!lexiconEntry) throw new Error(`Unknown lexicon key: ${key}`);
  return lexiconEntry;
}

export function creatureSpeciesNameFields(key: string) {
  const lexiconEntry = resolveCreatureSpeciesEntry(key);
  return {
    name: lexiconEntry.forms.nominative,
    nameGenitive: lexiconEntry.forms.genitive,
    nameDative: lexiconEntry.forms.dative,
    nameAccusative: lexiconEntry.forms.accusative,
    nameInstrumental: lexiconEntry.forms.instrumental,
    nameLocative: lexiconEntry.forms.locative,
    nameVocative: lexiconEntry.forms.vocative,
    grammaticalGender: lexiconEntry.grammaticalGender,
    animacy: lexiconEntry.animacy,
  };
}

function resolveCreatureSpeciesEntry(key: string) {
  const candidates = [
    key,
    `animal.${key}`,
    `spirit.${key}`,
    `profession.${key}.m`,
  ];
  const lexiconEntry = candidates.map(findLexiconEntry).find(Boolean);
  if (!lexiconEntry) throw new Error(`Unknown lexicon key: ${key}`);
  return lexiconEntry;
}

export function formsByNominative() {
  return Object.fromEntries(
    WORLD_LEXICON.map((lexiconEntry) => [
      lexiconEntry.forms.nominative.toLocaleLowerCase("uk-UA"),
      {
        ...lexiconEntry.forms,
        gender: lexiconEntry.grammaticalGender,
        animacy: lexiconEntry.animacy,
      },
    ])
  );
}
