import { describe, it, expect } from "vitest";
import { groupPricing, priceForLinePHP, priceForExtrasPHP } from "@/utils/pricing";
import type { IngredientPricing, LineIngredient } from "@/types";

const basePricing: IngredientPricing[] = [
  {
    id: "1",
    ingredient_id: "ing-1",
    pricing_mode: "per_unit",
    price_php: 10,
    per_php: null,
    unit_label: "scoop",
    is_active: true,
    updated_at: "now",
  },
  {
    id: "2",
    ingredient_id: "ing-1",
    pricing_mode: "per_gram",
    price_php: null,
    per_php: 0.5,
    unit_label: null,
    is_active: true,
    updated_at: "now",
  },
  {
    id: "3",
    ingredient_id: "ing-1",
    pricing_mode: "per_ml",
    price_php: null,
    per_php: 0.2,
    unit_label: null,
    is_active: true,
    updated_at: "now",
  },
  {
    id: "4",
    ingredient_id: "ing-1",
    pricing_mode: "flat",
    price_php: 15,
    per_php: null,
    unit_label: null,
    is_active: true,
    updated_at: "now",
  },
];

describe("pricing utils", () => {
  it("groups pricing by ingredient_id", () => {
    const dict = groupPricing(basePricing);
    expect(dict["ing-1"]).toHaveLength(4);
  });

  it("prices per_unit when unit label matches", () => {
    const dict = groupPricing(basePricing);
    const line: LineIngredient = { ingredient_id: "ing-1", amount: 2, unit: "scoop" };
    expect(priceForLinePHP(line, dict)).toBe(20);
  });

  it("prices per_gram when unit is g", () => {
    const dict = groupPricing(basePricing);
    const line: LineIngredient = { ingredient_id: "ing-1", amount: 10, unit: "g" };
    expect(priceForLinePHP(line, dict)).toBe(5);
  });

  it("prices per_ml when unit is ml", () => {
    const dict = groupPricing(basePricing);
    const line: LineIngredient = { ingredient_id: "ing-1", amount: 50, unit: "ml" };
    expect(priceForLinePHP(line, dict)).toBe(10);
  });

  it("falls back to flat pricing when no match", () => {
    const dict = groupPricing(basePricing);
    const line: LineIngredient = { ingredient_id: "ing-1", amount: 1, unit: "unknown" };
    expect(priceForLinePHP(line, dict)).toBe(15);
  });

  it("sums extras pricing", () => {
    const dict = groupPricing(basePricing);
    const extras: LineIngredient[] = [
      { ingredient_id: "ing-1", amount: 2, unit: "scoop" },
      { ingredient_id: "ing-1", amount: 10, unit: "g" },
    ];
    expect(priceForExtrasPHP(extras, dict)).toBe(25);
  });
});
