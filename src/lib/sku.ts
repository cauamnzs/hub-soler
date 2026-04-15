/**
 * Generates a deterministic SKU preview from category code, model and variant.
 * Pattern: SLR-[CAT]-[MODEL 4 chars]-[VARIANT 3 chars]
 */
export function buildSkuPreview(
  categoryCode: string,
  model: string,
  variant: string,
): string {
  if (!categoryCode) return "SLR-???-????-???";

  const modelPart = model
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 4)
    .padEnd(4, "?");

  const variantPart = variant
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3)
    .padEnd(3, "?");

  return `SLR-${categoryCode}-${modelPart}-${variantPart}`;
}
