// @ts-nocheck

export type PackageTierCode = "SMALL" | "MEDIUM" | "LARGE";

/**
 * 3-tier classification: Small = all dims &lt; 30cm and weight &lt; 5kg;
 * Medium = within 60cm cube and 15kg; else Large.
 */
export function classifyPackageTier(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  weightKg: number
): PackageTierCode {
  const l = lengthCm || 0;
  const wcm = widthCm || 0;
  const h = heightCm || 0;
  const w = weightKg || 0;

  if (l < 30 && wcm < 30 && h < 30 && w < 5) {
    return "SMALL";
  }
  if (l <= 60 && wcm <= 60 && h <= 60 && w <= 15) {
    return "MEDIUM";
  }
  return "LARGE";
}
