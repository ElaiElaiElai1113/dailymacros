import { describe, it, expect } from "vitest";
import { gramsFrom, totalsFor, breakdownFor } from "@/utils/nutrition";
import type { Ingredient, IngredientNutrition, LineIngredient } from "@/types";

const ing: Ingredient = {
  id: "ing-1",
  name: "Test Ingredient",
  category: "Dairy",
  unit_default: "g",
  grams_per_unit: 30,
  density_g_per_ml: 2,
  allergen_tags: ["dairy"],
  is_active: true,
};

const nutr: IngredientNutrition = {
  ingredient_id: "ing-1",
  per_100g_energy_kcal: 200,
  per_100g_protein_g: 10,
  per_100g_fat_g: 5,
  per_100g_carbs_g: 20,
};

describe("nutrition utils", () => {
  it("converts grams directly", () => {
    expect(gramsFrom(25, "g", ing)).toBe(25);
  });

  it("converts ml using density", () => {
    expect(gramsFrom(10, "ml", ing)).toBe(20);
  });

  it("converts scoop using grams_per_unit", () => {
    expect(gramsFrom(2, "scoop", ing)).toBe(60);
  });

  it("computes totals for lines", () => {
    const lines: LineIngredient[] = [{ ingredient_id: "ing-1", amount: 50, unit: "g" }];
    const { totals, allergens } = totalsFor(lines, { "ing-1": ing }, { "ing-1": nutr });
    expect(totals.energy_kcal).toBe(100);
    expect(totals.protein_g).toBe(5);
    expect(allergens).toContain("dairy");
  });

  it("returns breakdown items", () => {
    const lines: LineIngredient[] = [{ ingredient_id: "ing-1", amount: 50, unit: "g" }];
    const breakdown = breakdownFor(lines, { "ing-1": ing }, { "ing-1": nutr });
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].grams_used).toBe(50);
  });
});
