import { playerCanShowTechnicalDetails } from "../services/technicalDetails";

type DurationViewer = {
  role?: string | null;
  telegramId?: string | null;
  showTechnicalDetails?: boolean | null;
};

export function durationSecondsSuffix(viewer: DurationViewer | null | undefined, durationMs: number) {
  if (!playerCanShowTechnicalDetails(viewer)) return "";
  return ` (${Math.max(1, Math.ceil(durationMs / 1000))} с)`;
}

export function actionProgressSuffix(showTechnicalDetails: boolean, durationMs: number) {
  if (!showTechnicalDetails) return "";
  return `, ${Math.max(1, Math.ceil(durationMs / 1000))} с`;
}
