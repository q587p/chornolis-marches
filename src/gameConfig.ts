export const TICK_MS = 1500;

export const gatherConfig: Record<string, { chance: number; ticks: number }> = {
  mushrooms: { chance: 1 / 3, ticks: 2 },
  berries: { chance: 1 / 4, ticks: 2 },
  herbs: { chance: 1 / 5, ticks: 3 },
};
