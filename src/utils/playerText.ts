type PlayerStats = {
  steps: number;
  looks: number;
  says: number;
  greetings: number;
  gatherAttempts: number;
  successfulGathers: number;
  berriesGathered: number;
  mushroomsGathered: number;
  herbsGathered: number;
  animalsKilled: number;
  restStarts?: number | null;
  restFullRecoveries?: number | null;
};

type PlayerFatigue = {
  isResting?: boolean | null;
  fatigueState?: string | null;
};

type PlayerVitals = {
  hp: number;
  hpMax?: number | null;
  stamina: number;
  staminaMax?: number | null;
  hunger?: number | null;
  grammaticalGender?: string | null;
  pronoun?: string | null;
};

type ObservedPlayerGender = "MASCULINE" | "FEMININE" | "NEUTER" | "PLURAL";

function observedGender(player: { grammaticalGender?: string | null; pronoun?: string | null }): ObservedPlayerGender {
  if (player.grammaticalGender === "FEMININE" || player.grammaticalGender === "NEUTER" || player.grammaticalGender === "PLURAL") return player.grammaticalGender;
  if (player.pronoun === "SHE") return "FEMININE";
  if (player.pronoun === "THEY") return "PLURAL";
  return "MASCULINE";
}

function observedWord(player: { grammaticalGender?: string | null; pronoun?: string | null }, forms: Record<ObservedPlayerGender, string>) {
  return forms[observedGender(player)];
}

export function formatPercent(success: number, attempts: number) {
  if (!attempts) return "0%";
  return `${Math.round((success / attempts) * 100)}%`;
}

export function formatFatigueText(player: PlayerFatigue) {
  if (player.isResting) return "Відпочиває";
  if (player.fatigueState === "VERY_TIRED") return "Дуже втомлений";
  if (player.fatigueState === "TIRED") return "Втомлений";
  return "Відпочивший";
}

export function formatResourceState(value: number, max: number, zeroLabel = "нема") {
  if (value <= 0) return zeroLabel;
  if (value > max) return "екстра";
  const ratio = max > 0 ? value / max : 0;
  if (ratio >= 1) return "повно";
  if (ratio >= 0.75) return "багато";
  if (ratio >= 0.4) return "середньо";
  return "мало";
}

export function formatLifeState(value: number, max: number) {
  if (value <= 0) return "непритомн.";
  return formatResourceState(value, max, "кепсько");
}

export function formatHungerState(value: number, max = 13) {
  if (value > max) return "Ви екстра голодні.";
  const normalized = Math.max(0, Math.min(max, value));
  if (normalized <= 0) return "Ви не голодні.";
  const ratio = max > 0 ? normalized / max : 0;
  if (ratio >= 0.9) return "Ви дуже голодні.";
  if (ratio >= 0.55) return "Ви середньо голодні.";
  return "Ви слабо голодні.";
}

export function formatPostureText(player: PlayerFatigue & { isSleeping?: boolean | null }) {
  if (player.isSleeping) return "Ви спите.";
  if (player.isResting) return "Ви сидите.";
  return "Ви стоїте.";
}

export function formatObservedPostureText(player: PlayerFatigue & { isSleeping?: boolean | null; grammaticalGender?: string | null; pronoun?: string | null }) {
  const plural = observedGender(player) === "PLURAL";
  if (player.isSleeping) return plural ? "Сплять." : "Спить.";
  if (player.isResting) return plural ? "Сидять." : "Сидить.";
  return plural ? "Стоять." : "Стоїть.";
}

export function formatVitalsLine(player: PlayerVitals, options: { showTechnicalDetails?: boolean; hpFallback: number; staminaFallback: number }) {
  const hpMax = player.hpMax ?? options.hpFallback;
  const staminaMax = player.staminaMax ?? options.staminaFallback;
  if (options.showTechnicalDetails) return [`Життя: ${player.hp}/${hpMax}`, `Снага: ${player.stamina}/${staminaMax}`];
  return [`Життя: ${formatLifeState(player.hp, hpMax)}`, `Снага: ${formatResourceState(player.stamina, staminaMax)}`];
}

export function formatObservedVitalsText(player: PlayerVitals, options: { hpFallback: number; staminaFallback: number }) {
  const hpMax = player.hpMax ?? options.hpFallback;
  const staminaMax = player.staminaMax ?? options.staminaFallback;
  const hpRatio = hpMax > 0 ? player.hp / hpMax : 0;
  const staminaRatio = staminaMax > 0 ? player.stamina / staminaMax : 0;
  const looks = observedGender(player) === "PLURAL" ? "Виглядають" : "Виглядає";
  const lifeText = player.hp <= 0
    ? `${looks} ${observedWord(player, { MASCULINE: "непритомним", FEMININE: "непритомною", NEUTER: "непритомним", PLURAL: "непритомними" })}.`
    : hpRatio >= 0.85
      ? `${looks} ${observedWord(player, { MASCULINE: "сповненим", FEMININE: "сповненою", NEUTER: "сповненим", PLURAL: "сповненими" })} життя.`
      : hpRatio >= 0.45
        ? `${looks} ${observedWord(player, { MASCULINE: "побитим", FEMININE: "побитою", NEUTER: "побитим", PLURAL: "побитими" })}, але ${observedGender(player) === "PLURAL" ? "тримаються" : "тримається"}.`
        : `${looks} тяжко ${observedWord(player, { MASCULINE: "пораненим", FEMININE: "пораненою", NEUTER: "пораненим", PLURAL: "пораненими" })}.`;
  const staminaText = player.stamina <= 0
    ? `${looks} ${observedWord(player, { MASCULINE: "виснаженим", FEMININE: "виснаженою", NEUTER: "виснаженим", PLURAL: "виснаженими" })}.`
    : staminaRatio >= 0.75
      ? `${looks} ${observedWord(player, { MASCULINE: "відпочилим", FEMININE: "відпочилою", NEUTER: "відпочилим", PLURAL: "відпочилими" })}.`
      : staminaRatio >= 0.4
        ? `${looks} трохи ${observedWord(player, { MASCULINE: "втомленим", FEMININE: "втомленою", NEUTER: "втомленим", PLURAL: "втомленими" })}.`
        : `${looks} ${observedWord(player, { MASCULINE: "втомленим", FEMININE: "втомленою", NEUTER: "втомленим", PLURAL: "втомленими" })}.`;
  return [lifeText, staminaText].join("\n");
}

export function formatPlayerStats(player: PlayerStats, options: { includeRestStats?: boolean } = {}) {
  const lines = [
    `Переходів між місцинами: ${player.steps}`,
    `Оглядів: ${player.looks}`,
    `Сказано фраз: ${player.says}`,
    `Привітань: ${player.greetings}`,
    `Спроб збору: ${player.gatherAttempts}`,
    `Вдалого збору: ${player.successfulGathers} (${formatPercent(player.successfulGathers, player.gatherAttempts)})`,
    `Зібрано ягід: ${player.berriesGathered}`,
    `Зібрано грибів: ${player.mushroomsGathered}`,
    `Зібрано лікарських трав: ${player.herbsGathered}`,
    `Убито тварин: ${player.animalsKilled}`,
  ];

  if (options.includeRestStats) {
    lines.push(
      `Почато відпочинків: ${player.restStarts ?? 0}`,
      `Повних відновлень: ${player.restFullRecoveries ?? 0}`,
    );
  }

  return lines.join("\n");
}
