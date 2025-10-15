// src/utils/pricing.ts
import type { Ingredient, IngredientPricing, LineIngredient } from "@/types";

export type PricingDict = Record<string, IngredientPricing[]>;

export function groupPricing(rows: IngredientPricing[]): PricingDict {
  const map: PricingDict = {};
  for (const r of rows) (map[r.ingredient_id] ||= []).push(r);
  return map;
}

export function priceForLineCents(
  line: LineIngredient & { name?: string },
  ingDict: Record<string, Ingredient>,
  pricingDict: PricingDict
): number {
  const list = pricingDict[line.ingredient_id] || [];
  if (!list.length) return 0;

  const unit = line.unit.toLowerCase();

  // per_unit exact match
  const perUnit = list.find(
    (p) =>
      p.pricing_mode === "per_unit" &&
      (p.unit_label?.toLowerCase() || "") === unit
  );
  if (perUnit?.cents_per)
    return Math.round(perUnit.cents_per * Number(line.amount || 0));

  // per_gram / per_ml
  const perGram = list.find((p) => p.pricing_mode === "per_gram");
  if (unit === "g" && perGram?.cents_per) {
    return Math.round(perGram.cents_per * Number(line.amount || 0));
  }
  const perMl = list.find((p) => p.pricing_mode === "per_ml");
  if (unit === "ml" && perMl?.cents_per) {
    return Math.round(perMl.cents_per * Number(line.amount || 0));
  }

  // flat fallback
  const flat = list.find((p) => p.pricing_mode === "flat");
  if (flat) return flat.price_cents || 0;

  return 0;
}

export function priceForExtrasCents(
  extras: (LineIngredient & { name?: string })[],
  ingDict: Record<string, Ingredient>,
  pricingDict: PricingDict
) {
  return extras.reduce(
    (acc, l) => acc + priceForLineCents(l, ingDict, pricingDict),
    0
  );
}
