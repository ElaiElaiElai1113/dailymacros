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
    const price_cents = 20000; // TODO: pricing
    addItem({
      item_name: "Custom Shake",
      unit_price_cents: price_cents,
      lines,
    });
    setLines([]);
    alert("✅ Custom shake added to cart!");
  }

  const hasMissingNutrition = useMemo(
    () => lines.some((l) => !nutrDict[l.ingredient_id]),
    [lines, nutrDict]
  );

  return (
    <div
      className="min-h-[120vh] pb-24 md:pb-10"
      style={{
        background: `
          radial-gradient(1200px 600px at 70% -10%, rgba(210,110,61,0.12), transparent 60%),
          radial-gradient(800px 500px at 10% 10%, rgba(89,145,144,0.12), transparent 50%),
          ${COLORS.bg}
        `,
      }}
    >
      <div className="mx-auto w-full max-w-7xl px-4">
        {/* Header */}
        <header className="pt-8 pb-6">
          <div className="flex items-center gap-3">
            <div className="relative grid h-14 w-14 place-items-center rounded-2xl border bg-white shadow-md">
              <img
                src={logoUrl}
                alt="DailyMacros"
                className="h-10 w-10 object-contain"
              />
            </div>
            <div>
              <h1
                className={`${brand.header} text-2xl md:text-3xl`}
                style={{ color: COLORS.redOrange }}
              >
                Build Your Own Shake
              </h1>
              <p className="text-sm text-gray-600">
                Mix ingredients and see macros update live.
              </p>
            </div>
          </div>
        </header>

        {/* Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Builder */}
          <div className="col-span-12 md:col-span-7 lg:col-span-8 space-y-6">
            <section className={`${brand.panel}`}>
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold" style={{ color: COLORS.cyan }}>
                  Add ingredients
                </div>
                <span
                  className={`${brand.chip}`}
                  style={{ backgroundColor: COLORS.yellow, color: "#3f3f3f" }}
                >
                  ⚡ Live macros preview
                </span>
              </div>
              <IngredientSelector onAdd={handleAdd} />
            </section>

            <section className={`${brand.panel}`}>
              <div className="flex items-center justify-between mb-3">
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
                      className="py-2 flex items-center justify-between px-1"
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
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={addToCart}
                  disabled={lines.length === 0}
                  className={`${brand.buttonPrimary} disabled:opacity-50`}
                  style={{ backgroundColor: COLORS.redOrange }}
                >
                  Add to Cart
                </button>

                <ExplainMath
                  lines={lines}
                  ingDict={ingDict}
                  nutrDict={nutrDict}
                  buttonClassName={brand.buttonOutline}
                  styleOverride={{
                    borderColor: COLORS.cyan,
                    color: COLORS.cyan,
                  }}
                />

                {hasMissingNutrition && (
                  <span className="ml-auto text-xs text-amber-700">
                    Some ingredients don’t have nutrition data yet.
                  </span>
                )}
              </div>
            </section>

            {/* Mobile bottom bar with totals */}
            <section className="md:hidden sticky bottom-3">
              <div className="rounded-2xl border bg-white/90 backdrop-blur p-3 shadow-lg">
                <NutritionBar totals={totals} allergens={allergens} />
              </div>
            </section>
          </div>

          {/* Right: Sticky nutrition (desktop) */}
          <aside className="col-span-12 md:col-span-5 lg:col-span-4">
            <div className="md:sticky md:top-24 space-y-4">
              <section className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-semibold text-gray-800">Your Macros</div>
                  <span
                    className="rounded-md px-2 py-0.5 text-xs"
                    style={{ backgroundColor: "#f3f4f680", color: "#374151" }}
                  >
                    Live
                  </span>
                </div>
                <NutritionBar totals={totals} allergens={allergens} />
              </section>

              <section className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="text-sm text-gray-600">
                  Tip: tap <span className="font-medium">Explain my math</span>{" "}
                  to see a per-ingredient breakdown and unit conversions.
                </div>
              </section>
            </div>
          </aside>
        </div>

        {/* Footer brand */}
        <footer className="text-center text-xs mt-10 pb-10">
          <span className="font-semibold" style={{ color: COLORS.redOrange }}>
            DailyMacros
          </span>{" "}
          <span className="text-gray-500">— Fuel your day with balance.</span>
        </footer>
      </div>
    </div>
  );
}
