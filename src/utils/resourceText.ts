export function resourceAccusativeName(resourceType: { key?: string | null; name: string }) {
  if (resourceType.key === "grass") return "траву";
  if (resourceType.key === "berries") return "ягоди";
  if (resourceType.key === "mushrooms") return "гриби";
  if (resourceType.key === "herbs") return "лікарські трави";
  if (resourceType.key === "torch" || resourceType.key === "lit_torch" || resourceType.key === "doused_torch") return "факел";
  if (resourceType.key === "twigs") return "хмиз";
  if (resourceType.key === "raw_meat" || resourceType.key === "cooked_meat") return "м’ясо";
  return resourceType.name;
}

export function resourceAmountText(name: string, amount: number) {
  return amount > 1 ? `${name} ×${amount}` : name;
}
