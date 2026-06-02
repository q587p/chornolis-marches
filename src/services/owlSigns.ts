import type { WorldDaypart } from "../data/worldClock";

const STARTER_CAMP_OWL_SAFE_LOCATION_KEYS = new Set([
  "start_border_camp",
  "start_border_watchtower",
]);

export function isStarterCampOwlSafeLocationKey(locationKey: string | null | undefined) {
  return Boolean(locationKey && STARTER_CAMP_OWL_SAFE_LOCATION_KEYS.has(locationKey));
}

export function owlSignDetailLine() {
  return "підказує, що вночі тут полює щось крилате";
}

export function owlSignInspectionText(daypart: WorldDaypart, description?: string | null) {
  const intro = description?.trim() || "У траві й під корою лишилися дрібні совині прикмети.";
  if (daypart === "dusk" || daypart === "night") {
    return [
      intro,
      "",
      "Тепер це не просто пір'я й подряпини. Десь угорі коротко стихає крило, і трава під ним наче згадує мишачий рух.",
      "Сова не показується просто так, але місцина вже має нічного слухача.",
      "",
      "Принаймні, так її назвав би той, хто не дивився надто довго.",
    ].join("\n");
  }

  if (daypart === "dawn") {
    return [
      intro,
      "",
      "Світлішає, і совина присутність відступає в гілля. Лишаються тільки сірі пір'їни та прим'ята трава там, де вночі щось падало згори.",
      "На межі ранку такі прикмети здаються простішими, ніж були в темряві.",
    ].join("\n");
  }

  return [
    intro,
    "",
    "Удень тут тихо. Якщо сова й поруч, вона тримається високо й нерухомо, злившись із корою.",
  ].join("\n");
}
