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
