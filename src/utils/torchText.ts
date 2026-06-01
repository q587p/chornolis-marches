type TorchStateText = {
  isLit: boolean;
  litAmount?: number;
};

export function visibleHeldTorchText(torchState: TorchStateText) {
  return visibleHeldTorchTextWithContext(torchState);
}

export function visibleHeldTorchTextWithContext(torchState: TorchStateText, options: { hasOtherHeldItem?: boolean } = {}) {
  if (!torchState.isLit && options.hasOtherHeldItem) return "";
  if (!torchState.isLit) return "Руки порожні.";
  const count = torchState.litAmount ?? 1;
  if (count > 1) return "В обох руках горять запалені факели.";
  return "У руці горить запалений факел.";
}

export function ownHeldTorchText(torchState: TorchStateText) {
  if (!torchState.isLit) return "";
  const count = torchState.litAmount ?? 1;
  if (count > 1) return `\nУ вас горять запалені факели (${count}).`;
  return "\nУ вас горить запалений факел.";
}
