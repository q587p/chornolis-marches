export type LifetimeBand = {
  key: "terrible" | "soon_spoils" | "not_great" | "average" | "ideal";
  label: string;
};

export const LIFETIME_BANDS: LifetimeBand[] = [
  { key: "terrible", label: "жахливо" },
  { key: "soon_spoils", label: "скоро зіпсується" },
  { key: "not_great", label: "не дуже добре" },
  { key: "average", label: "середньо" },
  { key: "ideal", label: "ідеально" },
];

export function lifetimeBand(left: number | null | undefined, total: number | null | undefined): LifetimeBand {
  const safeTotal = Math.max(1, Number(total ?? 1));
  const safeLeft = Math.max(0, Number(left ?? safeTotal));
  const percent = (safeLeft / safeTotal) * 100;

  if (percent < 20) return LIFETIME_BANDS[0];
  if (percent < 40) return LIFETIME_BANDS[1];
  if (percent < 60) return LIFETIME_BANDS[2];
  if (percent <= 80) return LIFETIME_BANDS[3];
  return LIFETIME_BANDS[4];
}

export function lifetimeSummary(left: number | null | undefined, total: number | null | undefined, options: { showTechnicalDetails?: boolean } = {}) {
  const band = lifetimeBand(left, total);
  if (!options.showTechnicalDetails) return band.label;

  const safeTotal = Math.max(1, Number(total ?? 1));
  const safeLeft = Math.max(0, Number(left ?? safeTotal));
  const percent = Math.round((safeLeft / safeTotal) * 100);
  return `${band.label}; лишилось приблизно ${safeLeft} тіків (${percent}%)`;
}
