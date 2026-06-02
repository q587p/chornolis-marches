export function predatorMissCurrentAction(speciesKey: string, targetAccusative: string, targetNominative: string) {
  if (speciesKey === "owl") return `промахнулася, падаючи на ${targetAccusative}`;
  if (speciesKey === "camp_spirit_cat") return `стрибнув на ${targetAccusative}, але здобич вислизнула`;
  return `промахнувся, нападаючи на ${targetNominative}`;
}

export function predatorKillCurrentAction(speciesKey: string, targetAccusative: string, targetNominative: string) {
  if (speciesKey === "owl") return `безшумно вполювала ${targetAccusative} й тримається поруч зі здобиччю`;
  if (speciesKey === "camp_spirit_cat") return `вполював ${targetAccusative} й тихо сидить поруч`;
  return `убив ${targetNominative} і тримається поруч зі здобиччю`;
}

export function predatorWoundCurrentAction(speciesKey: string, targetAccusative: string, targetNominative: string) {
  if (speciesKey === "owl") return `зачепила ${targetAccusative} кігтями`;
  if (speciesKey === "camp_spirit_cat") return `коротко кинувся на ${targetAccusative}`;
  return `атакує ${targetNominative}`;
}

export function predatorMissObserverText(speciesKey: string, targetAccusative: string, targetNominative: string) {
  if (speciesKey === "owl") return `Крилата тінь беззвучно падає на ${targetAccusative}, але здобич вислизає.`;
  if (speciesKey === "camp_spirit_cat") return `Кіт-бережник кидається на ${targetAccusative}, але мишаче шарудіння вислизає з-під лап.`;
  return `Щось кидається на ${targetNominative}, але здобич вислизає.`;
}

export function predatorKillObserverText(speciesKey: string, targetNominative: string) {
  if (speciesKey === "owl") return `Крилата тінь падає згори. За мить ${targetNominative} завмирає в траві.`;
  if (speciesKey === "camp_spirit_cat") return `Кіт-бережник падає в тінь коротким стрибком. За мить ${targetNominative} завмирає біля його лап.`;
  return `Щось кидається на здобич. За мить ${targetNominative} падає нерухомо.`;
}

export function predatorWoundObserverText(speciesKey: string, targetAccusative: string, targetNominative: string) {
  if (speciesKey === "owl") return `Крилата тінь зачіпає ${targetAccusative} й знову губиться вгорі.`;
  if (speciesKey === "camp_spirit_cat") return `Кіт-бережник коротко кидається на ${targetAccusative}; тиша біля скрині стає гострішою.`;
  return `Щось нападає на ${targetNominative}.`;
}
