export type TeleportCoordinateRef = {
  x: number;
  y: number;
  z: number;
};

function encodeCoordinate(value: number) {
  return value < 0 ? `_${Math.abs(value)}` : String(value);
}

function decodeCoordinate(value: string) {
  return value.startsWith("_") ? -Number(value.slice(1)) : Number(value);
}

export function formatTeleportCoordinateCommand(location: TeleportCoordinateRef) {
  return `/tp_${encodeCoordinate(location.x)}_${encodeCoordinate(location.y)}_${encodeCoordinate(location.z)}`;
}

export function parseTeleportCoordinateCommand(input: string): string | null {
  const match = input.trim().match(/^\/?tp_(_?\d+)_(_?\d+)_(_?\d+)(?:@\w+)?$/i);
  if (!match) return null;

  const coords = match.slice(1).map(decodeCoordinate);
  if (coords.some((coord) => !Number.isSafeInteger(coord))) return null;
  return `${coords[0]},${coords[1]},${coords[2]}`;
}
