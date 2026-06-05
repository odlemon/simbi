// @ts-nocheck
import crypto from "crypto";

/**
 * Generate a random password meeting complexity rules (16+ chars).
 */
export function generateSecurePassword(length = 18): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*_-+=";
  const all = upper + lower + digits + symbols;

  const pick = (chars: string) => chars[crypto.randomInt(0, chars.length)];

  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rest: string[] = [];
  for (let i = required.length; i < length; i++) {
    rest.push(pick(all));
  }
  const combined = [...required, ...rest];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join("");
}
