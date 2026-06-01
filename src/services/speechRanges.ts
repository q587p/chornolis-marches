import { Direction } from "@prisma/client";

export type NearbySpeechExit = {
  toLocationId: number;
  direction: Direction | string;
  isHidden?: boolean | null;
};

export type NearbySpeechRecipient = {
  locationId: number;
  fromDirection?: Direction | string;
};

export type VerticalYellPromptDirection = "UP" | "DOWN";

export function nearbySpeechRecipients(currentLocationId: number, exits: NearbySpeechExit[]): NearbySpeechRecipient[] {
  const seen = new Set<number>([currentLocationId]);
  const recipients: NearbySpeechRecipient[] = [{ locationId: currentLocationId }];

  for (const exit of exits) {
    if (exit.isHidden) continue;
    if (seen.has(exit.toLocationId)) continue;
    seen.add(exit.toLocationId);
    recipients.push({ locationId: exit.toLocationId, fromDirection: exit.direction });
  }

  return recipients;
}

export function nearbySpeechDirectionIntro(direction: Direction | string | null | undefined) {
  switch (direction) {
    case "UP":
      return "Знизу долинає голос";
    case "DOWN":
      return "Згори долинає голос";
    case "NORTH":
      return "З півдня долинає голос";
    case "SOUTH":
      return "З півночі долинає голос";
    case "EAST":
      return "Із заходу долинає голос";
    case "WEST":
      return "Зі сходу долинає голос";
    case "INSIDE":
      return "Ззовні долинає голос";
    case "OUTSIDE":
      return "Зсередини долинає голос";
    default:
      return "Зовсім поруч долинає голос";
  }
}

export function verticalYellPromptDirectionText(direction: VerticalYellPromptDirection) {
  return direction === "UP" ? "вгору" : "вниз";
}

export function verticalYellPromptText(direction: VerticalYellPromptDirection) {
  return `Що гукнути ${verticalYellPromptDirectionText(direction)}? Напишіть текст.`;
}

export function verticalYellPromptPlaceholder(direction: VerticalYellPromptDirection) {
  return direction === "UP" ? "Гукнути вгору..." : "Гукнути вниз...";
}
