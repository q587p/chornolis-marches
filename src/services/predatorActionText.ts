export function predatorMissCurrentAction(speciesKey: string, targetAccusative: string, targetNominative: string) {
  if (speciesKey === "owl") return `промахнулася, падаючи на ${targetAccusative}`;
  return `промахнувся, нападаючи на ${targetNominative}`;
}

export function predatorKillCurrentAction(speciesKey: string, targetAccusative: string, targetNominative: string) {
  if (speciesKey === "owl") return `безшумно вполювала ${targetAccusative} й тримається поруч зі здобиччю`;
  return `убив ${targetNominative} і тримається поруч зі здобиччю`;
}

export function predatorWoundCurrentAction(speciesKey: string, targetAccusative: string, targetNominative: string) {
  if (speciesKey === "owl") return `зачепила ${targetAccusative} кігтями`;
  return `атакує ${targetNominative}`;
}

export function predatorMissObserverText(speciesKey: string, targetAccusative: string, targetNominative: string) {
  if (speciesKey === "owl") return `Крилата тінь беззвучно падає на ${targetAccusative}, але здобич вислизає.`;
  return `Щось кидається на ${targetNominative}, але здобич вислизає.`;
}

export function predatorKillObserverText(speciesKey: string, targetNominative: string) {
  if (speciesKey === "owl") return `Крилата тінь падає згори. За мить ${targetNominative} завмирає в траві.`;
  return `Щось кидається на здобич. За мить ${targetNominative} падає нерухомо.`;
}

export function predatorWoundObserverText(speciesKey: string, targetAccusative: string, targetNominative: string) {
  if (speciesKey === "owl") return `Крилата тінь зачіпає ${targetAccusative} й знову губиться вгорі.`;
  return `Щось нападає на ${targetNominative}.`;
}
