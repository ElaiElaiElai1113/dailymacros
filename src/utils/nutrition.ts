// src/utils/nutrition.ts
import type { Ingredient, IngredientNutrition, LineIngredient } from "@/types";

function numOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
/** Convert the entered amount + unit to grams using density/grams_per_unit when provided */
export function gramsFrom(
  amount: number,
  unit: string,
  ing: Ingredient
): number {
  const a = Number(amount) || 0;
  if (a <= 0) return 0;

  switch (unit) {
    case "g":
      return a;

    case "ml": {
      // if null/undefined, fall back to 1.03 (milk/yogurt-ish)
      const density = numOr((ing as any).density_g_per_ml, 1.03);
      return a * density;
    }

    case "tbsp": {
      // prefer specific per-tbsp override, else generic grams_per_unit, else 12 g
      const g = numOr(
        (ing as any).grams_per_tbsp,
        numOr((ing as any).grams_per_unit, 12)
      );
      return a * g;
    }

    case "tsp": {
      const g = numOr(
        (ing as any).grams_per_tsp,
        numOr((ing as any).grams_per_unit, 4)
      );
      return a * g;
    }

    case "cup": {
      const g = numOr(
        (ing as any).grams_per_cup,
        numOr((ing as any).grams_per_unit, 80)
      );
      return a * g;
    }

    case "scoop":
    case "piece": {
      const g = numOr((ing as any).grams_per_unit, 30);
      return a * g;
    }

    default:
      // unknown unit: assume value is already grams
      return a;
  }
}

/** Sum nutrition across all selected line ingredients (client-side live preview) */
export function totalsFor(
  lines: LineIngredient[],
  dict: Record<string, Ingredient>,
  nutr: Record<string, IngredientNutrition>
) {
  let kcal = 0,
    protein = 0,
    fat = 0,
    carbs = 0,
    sugars = 0,
    fiber = 0,
    sodium = 0;
  const allergens = new Set<string>();

  for (const li of lines) {
    const ing = dict[li.ingredient_id];
    const n = nutr[li.ingredient_id];
    if (!ing || !n) continue;

    const g = gramsFrom(li.amount, li.unit, ing);
    const factor = g / 100;

    kcal += factor * n.per_100g_energy_kcal;
    protein += factor * n.per_100g_protein_g;
    fat += factor * n.per_100g_fat_g;
    carbs += factor * n.per_100g_carbs_g;
    sugars += factor * (n.per_100g_sugars_g ?? 0);
    fiber += factor * (n.per_100g_fiber_g ?? 0);
    sodium += factor * (n.per_100g_sodium_mg ?? 0);

    (ing.allergen_tags || []).forEach((a: string) => allergens.add(a));
  }

  return {
    totals: {
      energy_kcal: +kcal.toFixed(1),
      protein_g: +protein.toFixed(1),
      fat_g: +fat.toFixed(1),
      carbs_g: +carbs.toFixed(1),
      sugars_g: +sugars.toFixed(1),
      fiber_g: +fiber.toFixed(1),
      sodium_mg: Math.round(sodium),
    },
    allergens: Array.from(allergens),
  };
}

/** Types + per-ingredient breakdown for the “Explain my math” modal */
export type NutritionBreakdownItem = {
  ingredient_id: string;
  name: string;
  input: { amount: number; unit: string };
  grams_used: number; // after conversion
  factor: number; // grams_used / 100
  contrib: {
    energy_kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    sugars_g: number;
    fiber_g: number;
    sodium_mg: number;
  };
};

export function breakdownFor(
  lines: LineIngredient[],
  dict: Record<string, Ingredient>,
  nutr: Record<string, IngredientNutrition>
): NutritionBreakdownItem[] {
  const out: NutritionBreakdownItem[] = [];
  for (const li of lines) {
    const ing = dict[li.ingredient_id];
    const n = nutr[li.ingredient_id];
    if (!ing || !n) continue;

    const g = gramsFrom(li.amount, li.unit, ing);
    const factor = g / 100;

    out.push({
      ingredient_id: li.ingredient_id,
      name: ing.name,
      input: { amount: li.amount, unit: li.unit },
      grams_used: +g.toFixed(2),
      factor: +factor.toFixed(4),
      contrib: {
        energy_kcal: +(factor * n.per_100g_energy_kcal).toFixed(2),
        protein_g: +(factor * n.per_100g_protein_g).toFixed(2),
        fat_g: +(factor * n.per_100g_fat_g).toFixed(2),
        carbs_g: +(factor * n.per_100g_carbs_g).toFixed(2),
        sugars_g: +(factor * (n.per_100g_sugars_g ?? 0)).toFixed(2),
        fiber_g: +(factor * (n.per_100g_fiber_g ?? 0)).toFixed(2),
        sodium_mg: Math.round(factor * (n.per_100g_sodium_mg ?? 0)),
      },
    });
  }
  return out;
}
