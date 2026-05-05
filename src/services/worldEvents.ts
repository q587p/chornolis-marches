import { prisma } from "../db";

export async function logEvent(type: any, title: string, description?: string, locationId?: number) {
  try {
    await prisma.worldEvent.create({ data: { type, title, description, locationId } });
  } catch (error) {
    console.warn("Failed to write world event:", error);
  }
}
