// src/utils/pricing.ts
import type { IngredientPricing, LineIngredient } from "@/types";

export type PricingDict = Record<string, IngredientPricing[]>;

export function groupPricing(rows: IngredientPricing[]): PricingDict {
  const map: PricingDict = {};
  for (const r of rows) (map[r.ingredient_id] ||= []).push(r);
  return map;
}

/**
 * Compute the price in PESOS for a single line, using the pricing rows for that ingredient.
 * Modes:
 *  - per_unit: use price_php * amount (requires unit_label to match the line's unit)
 *  - per_gram / per_ml: use per_php * amount
 *  - flat: use price_php (one-time add-on)
 */
export function priceForLinePHP(
  line: LineIngredient & { name?: string },
  pricingDict: PricingDict
): number {
  const list = pricingDict[line.ingredient_id] || [];
  if (!list.length) return 0;

  const unit = (line.unit || "").toLowerCase();
  const amount = Number(line.amount || 0);

  // per_unit with matching unit_label
  const perUnit = list.find(
    (p) =>
      p.pricing_mode === "per_unit" &&
      (p.unit_label?.toLowerCase() || "") === unit
  );
  if (perUnit?.price_php != null) {
    return Number(perUnit.price_php) * amount;
  }

  // per_gram
  const perGram = list.find((p) => p.pricing_mode === "per_gram");
  if (unit === "g" && perGram?.per_php != null) {
    return Number(perGram.per_php) * amount;
  }

  // per_ml
  const perMl = list.find((p) => p.pricing_mode === "per_ml");
  if (unit === "ml" && perMl?.per_php != null) {
    return Number(perMl.per_php) * amount;
  }

  // flat fallback (one-time)
  const flat = list.find((p) => p.pricing_mode === "flat");
  if (flat?.price_php != null) {
    return Number(flat.price_php);
  }

  return 0;
}

/** Sum price for extras in PESOS. */
export function priceForExtrasPHP(
  extras: (LineIngredient & { name?: string })[],
  pricingDict: PricingDict
): number {
  return extras.reduce((acc, l) => acc + priceForLinePHP(l, pricingDict), 0);
}
