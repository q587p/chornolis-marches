export function heraldTrailPhrase(value: number) {
  if (value <= 0) return "Канцелярія ще майже не має записів про ці кроки.";
  if (value < 15) return "сліди трапляються зрідка";
  if (value < 80) return "ліс уже пам’ятає ці кроки";
  return "це ім’я повторюється в польових нотатках про дороги";
}

export function heraldPracticePhrase(value: number, noun: string) {
  if (value <= 0) return `${noun}: у книзі майже порожньо.`;
  if (value < 8) return `${noun}: записи з’являються зрідка.`;
  if (value < 35) return `${noun}: рука вже знає кілька певних рухів.`;
  return `${noun}: це ім’я повторюється в польових нотатках.`;
}

export function heraldGatheringLine(gatherAttempts: number, gathered: number) {
  if (gatherAttempts <= 0 && gathered <= 0) return "Збір: Канцелярія ще майже не має записів.";
  if (gathered <= 0) return "Збір: спроби є, але кошик поки частіше лишався порожнім.";
  if (gathered < 10) return "Збір: дрібні знахідки вже траплялися під рукою.";
  if (gathered < 50) return "Збір: трави, ягоди й гриби вже не раз лягали до речей.";
  return "Збір: польові нотатки часто повертаються до цієї руки й її знахідок.";
}
