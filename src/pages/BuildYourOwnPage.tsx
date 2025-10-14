// src/pages/BuildYourOwnPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Ingredient, IngredientNutrition, LineIngredient } from "@/types";
import IngredientSelector from "@/components/IngredientSelector";
import NutritionBar from "@/components/NutritionBar";
import ExplainMath from "@/components/ExplainMath";
import { totalsFor } from "@/utils/nutrition";
import { useCart } from "@/context/CartContext";
import { COLORS, brand } from "@/theme/brand";
import logoUrl from "@/assets/dailymacroslogo.png";

type V100Row = {
  ingredient_id: string;
  per_100g_energy_kcal: number | null;
  per_100g_protein_g: number | null;
  per_100g_fat_g: number | null;
  per_100g_carbs_g: number | null;
  factor_per100?: number | null;
};

export default function BuildYourOwnPage() {
  const [ingDict, setIngDict] = useState<Record<string, Ingredient>>({});
  const [nutrDict, setNutrDict] = useState<Record<string, IngredientNutrition>>(
    {}
  );
  const [lines, setLines] = useState<LineIngredient[]>([]);
  const { addItem } = useCart();

  // Load ingredients + nutrition once
  useEffect(() => {
    (async () => {
      const [{ data: ii, error: e1 }, { data: nn, error: e2 }] =
        await Promise.all([
          supabase.from("ingredients").select("*").eq("is_active", true),
          supabase.from("ingredient_nutrition_v100").select("*"),
        ]);
      if (e1) console.error(e1);
      if (e2) console.error(e2);

      const ingredients = (ii ?? []) as Ingredient[];
      const v100Rows = (nn ?? []) as V100Row[];

      setIngDict(Object.fromEntries(ingredients.map((x) => [x.id, x])));

      const nutrRows: IngredientNutrition[] = v100Rows.map((r) => ({
        ingredient_id: r.ingredient_id,
        per_100g_energy_kcal: r.per_100g_energy_kcal ?? 0,
        per_100g_protein_g: r.per_100g_protein_g ?? 0,
        per_100g_fat_g: r.per_100g_fat_g ?? 0,
        per_100g_carbs_g: r.per_100g_carbs_g ?? 0,
        per_100g_sugars_g: 0,
        per_100g_fiber_g: 0,
        per_100g_sodium_mg: 0,
        factor_per100: r.factor_per100 ?? null,
      }));

      setNutrDict(
        Object.fromEntries(nutrRows.map((x) => [x.ingredient_id, x]))
      );
    })();
  }, []);

  // Live totals for the NutritionBar
  const { totals, allergens } = useMemo(
    () => totalsFor(lines, ingDict, nutrDict),
    [lines, ingDict, nutrDict]
  );

  // Handlers
  function handleAdd(ingredient: Ingredient, amount: number, unit: string) {
    setLines((prev) => [
      ...prev,
      { ingredient_id: ingredient.id, amount, unit },
    ]);
  }
  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }
  function clearLines() {
    setLines([]);
  }
  function addToCart() {
    const price_cents = 20000; // TODO: plug in pricing
    addItem({
      item_name: "Custom Shake",
      unit_price_cents: price_cents,
      lines,
    });
    setLines([]);
    alert("✅ Custom shake added to cart!");
  }

  // UI
  return (
    <div
      className="min-h-screen pb-24 md:pb-0"
      style={{
        // brand background with subtle radial highlight
        background: `
          radial-gradient(1200px 600px at 70% -10%, rgba(210,110,61,0.12), transparent 60%),
          radial-gradient(800px 500px at 10% 10%, rgba(89,145,144,0.12), transparent 50%),
          ${COLORS.bg}
        `,
      }}
    >
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <header className="pt-8 pb-5 text-center">
          <div className="inline-flex items-center gap-3">
            <img
              src={logoUrl}
              alt="DailyMacros"
              className="h-9 w-9 rounded-xl shadow"
              style={{ border: `2px solid ${COLORS.yellow}` }}
            />
            <h1
              className={`${brand.header}`}
              style={{ color: COLORS.redOrange }}
            >
              Build Your Own Shake
            </h1>
          </div>
          <p className="text-sm mt-2" style={{ color: "#5f5f5f" }}>
            Mix your favorite ingredients to craft your perfect DailyMacros
            blend.
          </p>
          <div className="mt-3">
            <span
              className={`${brand.chip}`}
              style={{ backgroundColor: COLORS.yellow, color: "#3f3f3f" }}
            >
              <span>⚡</span> Live macros preview
            </span>
          </div>
        </header>

        {/* Ingredient picker */}
        <section className={`${brand.panel}`}>
          <div className="mb-2 font-semibold" style={{ color: COLORS.cyan }}>
            Add ingredients
          </div>
          <IngredientSelector onAdd={handleAdd} />
        </section>

        {/* Selected lines */}
        <section className={`${brand.panel} mt-5`}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold" style={{ color: COLORS.cyan }}>
              Selected Ingredients
            </div>
            {lines.length > 0 && (
              <button
                onClick={clearLines}
                className="text-sm hover:underline"
                style={{ color: "#b91c1c" }}
              >
                Clear all
              </button>
            )}
          </div>

          {lines.length === 0 ? (
            <div className="text-sm text-gray-500">
              No ingredients yet — pick some above to start building.
            </div>
          ) : (
            <ul className="text-sm divide-y divide-gray-100">
              {lines.map((l, i) => (
                <li
                  key={`${l.ingredient_id}-${i}`}
                  className="py-2 flex items-center justify-between rounded-lg px-2 transition-colors"
                  style={{ backgroundColor: "transparent" }}
                >
                  <div>
                    <span className="font-medium text-gray-800">
                      {ingDict[l.ingredient_id]?.name ?? "Ingredient"}
                    </span>{" "}
                    <span className="text-gray-500">
                      — {l.amount} {l.unit}
                    </span>
                  </div>
                  <button
                    onClick={() => removeLine(i)}
                    className="text-xs hover:opacity-80"
                    style={{ color: COLORS.redOrange }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <button
              onClick={addToCart}
              disabled={lines.length === 0}
              className={brand.buttonPrimary}
              style={{ backgroundColor: COLORS.redOrange }}
            >
              Add to Cart
            </button>

            <ExplainMath
              lines={lines}
              ingDict={ingDict}
              nutrDict={nutrDict}
              buttonClassName={brand.buttonOutline}
              // outline w/ brand cyan
              styleOverride={{
                borderColor: COLORS.cyan,
                color: COLORS.cyan,
              }}
            />
          </div>
        </section>

        {/* Live totals */}
        <section className="mt-6">
          <NutritionBar totals={totals} allergens={allergens} />
        </section>

        {/* Footer brand */}
        <footer className="text-center text-xs mt-8 pb-8">
          <span className="font-semibold" style={{ color: COLORS.redOrange }}>
            DailyMacros
          </span>{" "}
          <span className="text-gray-500">— Fuel your day with balance.</span>
        </footer>
      </div>
    </div>
  );
}
