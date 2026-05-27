export function chance(percent: number) {
  return Math.random() * 100 < percent;
}

export function chancePermille(permille: number) {
  return Math.random() * 1000 < permille;
}

export function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

export function pickOptional<T>(items: T[]) {
  if (items.length === 0) return undefined;
  return pick(items);
}

export function randomInt(min: number, max: number) {
  const low = Math.ceil(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  return low + Math.floor(Math.random() * (high - low + 1));
}

export function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}
