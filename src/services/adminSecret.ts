import { timingSafeEqual } from "crypto";
import { config } from "../config";

export function adminSecretMatches(input: string) {
  const secret = config.adminSetSecret;
  if (!secret) return false;

  const inputBuffer = Buffer.from(input, "utf8");
  const secretBuffer = Buffer.from(secret, "utf8");
  return inputBuffer.length === secretBuffer.length && timingSafeEqual(inputBuffer, secretBuffer);
}
