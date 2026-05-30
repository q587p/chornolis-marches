export function normalizeCreatureActionText(action: string | null | undefined, fallback?: string) {
  if (!action) return fallback;
  return action
    .replace(/;\s*hunter_torches:\d+\b/g, "")
    .replace(/;\s*hunter_returning_for_torches\b/g, "")
    .replace(/^їсть трава$/, "їсть траву")
    .replace(/^йдемо на /, "йде на ")
    .replace(/^збираємо щось поблизу$/, "збирає щось поблизу")
    .replace(/^збираємо /, "збирає ")
    .replace(/^їмо$/, "їсть")
    .replace(/^озираємось$/, "озирається")
    .replace(/^роздивляємось ціль$/, "роздивляється")
    .replace(/^вітаємось$/, "вітається")
    .replace(/^атакуємо$/, "атакує")
    .replace(/^освіжуємо труп$/, "освіжує труп")
    .replace(/^говоримо$/, "говорить")
    .replace(/^вистежуємо$/, "вистежує")
    .replace(/^відпочиваємо$/, "відпочиває")
    .replace(/^ставимо пастку$/, "ставить пастку")
    .replace(/^чекаємо$/, "чекає");
}
