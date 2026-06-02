export const SHAH_RESOURCE_KEY = "shah";
export const HRYVNIA_RESOURCE_KEY = "hryvnia";
export const MONEY_RESOURCE_KEYS = [SHAH_RESOURCE_KEY, HRYVNIA_RESOURCE_KEY] as const;
export type MoneyResourceKey = (typeof MONEY_RESOURCE_KEYS)[number];

type MoneyResource = {
  amount: number;
  resourceType: {
    key: string;
  };
};

export function isMoneyResourceKey(key: string): key is MoneyResourceKey {
  return (MONEY_RESOURCE_KEYS as readonly string[]).includes(key);
}

function pluralForm(amount: number, forms: [string, string, string]) {
  const mod10 = amount % 10;
  const mod100 = amount % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export function shahText(amount: number) {
  const safeAmount = Math.max(0, Math.floor(amount));
  return `${safeAmount} ${pluralForm(safeAmount, ["шаг", "шаги", "шагів"])}`;
}

export function hryvniaText(amount: number) {
  const safeAmount = Math.max(0, Math.floor(amount));
  return `${safeAmount} ${pluralForm(safeAmount, ["ґривня", "ґривні", "ґривень"])}`;
}

export function moneyAmountText(key: MoneyResourceKey, amount: number) {
  return key === HRYVNIA_RESOURCE_KEY ? hryvniaText(amount) : shahText(amount);
}

export function playerMoneyText(resources: MoneyResource[]) {
  const amounts = moneyAmounts(resources);
  if (amounts.hryvnia <= 0 && amounts.shah <= 0) return "немає";
  return [
    amounts.hryvnia > 0 ? hryvniaText(amounts.hryvnia) : "",
    amounts.shah > 0 ? shahText(amounts.shah) : "",
  ].filter(Boolean).join(", ");
}

export function moneyAmounts(resources: MoneyResource[]) {
  return resources.reduce(
    (total, resource) => {
      const key = resource.resourceType.key;
      if (key === SHAH_RESOURCE_KEY) total.shah += Math.max(0, Number(resource.amount ?? 0));
      if (key === HRYVNIA_RESOURCE_KEY) total.hryvnia += Math.max(0, Number(resource.amount ?? 0));
      return total;
    },
    { shah: 0, hryvnia: 0 },
  );
}
