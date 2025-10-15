// src/pages/BuildYourOwnPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type {
  CartItem,
  CartLine,
  Drink,
  Ingredient,
  IngredientNutrition,
  IngredientPricing,
} from "@/types";
import IngredientSelector from "@/components/IngredientSelector";
import NutritionBar from "@/components/NutritionBar";
import ExplainMath from "@/components/ExplainMath";
import { totalsFor } from "@/utils/nutrition";
import { groupPricing, priceForExtrasPHP } from "@/utils/pricing";
import { useCart } from "@/context/CartContext";
import logoUrl from "@/assets/dailymacroslogo.png";

const COLORS = {
  redOrange: "#D26E3D",
  yellow: "#EECB65",
  cyan: "#599190",
  bg: "#FFFDF8",
};

// Local shape for drinks in this page: DB returns price_php; we normalize to price_cents for the app
type BYODrink = Drink & { price_cents: number };

type V100Row = {
  ingredient_id: string;
  per_100g_energy_kcal: number | null;
  per_100g_protein_g: number | null;
  per_100g_fat_g: number | null;
  per_100g_carbs_g: number | null;
};

export default function BuildYourOwnPage() {
  const { addItem } = useCart();

  // data dictionaries
  const [ingDict, setIngDict] = useState<Record<string, Ingredient>>({});
  const [nutrDict, setNutrDict] = useState<Record<string, IngredientNutrition>>(
    {}
  );
  const [pricingDict, setPricingDict] = useState<
    Record<string, IngredientPricing[]>
  >({});

  // base drinks + selection
  const [baseDrinks, setBaseDrinks] = useState<BYODrink[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);

  // lines
  const [baseLines, setBaseLines] = useState<CartLine[]>([]);
  const [extraLines, setExtraLines] = useState<CartLine[]>([]);

  // ui state
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingBase, setLoadingBase] = useState(false);

  // ---------------- Load master data ----------------
  useEffect(() => {
    (async () => {
      setLoadingAll(true);
      const [{ data: ii }, { data: nn }, { data: dd }, { data: pp }] =
        await Promise.all([
          supabase.from("ingredients").select("*").eq("is_active", true),
          supabase.from("ingredient_nutrition_v100").select("*"),
          supabase
            .from("drinks")
            .select("id,name,description,price_php,base_size_ml,is_active")
            .eq("is_active", true)
            .order("name"),
          supabase.from("ingredient_pricing_effective").select("*"),
        ]);

      // Ingredients
      const ingredients = (ii ?? []) as Ingredient[];
      setIngDict(Object.fromEntries(ingredients.map((x) => [x.id, x])));

      // Per-100g nutrition
      const v100 = (nn ?? []) as V100Row[];
      setNutrDict(
        Object.fromEntries(
          v100.map((r) => [
            r.ingredient_id,
            {
              ingredient_id: r.ingredient_id,
              per_100g_energy_kcal: r.per_100g_energy_kcal ?? 0,
              per_100g_protein_g: r.per_100g_protein_g ?? 0,
              per_100g_fat_g: r.per_100g_fat_g ?? 0,
              per_100g_carbs_g: r.per_100g_carbs_g ?? 0,
            } as IngredientNutrition,
          ])
        )
      );

      // Pricing (already in PHP in your DB view)
      const pricing = (pp ?? []) as IngredientPricing[];
      setPricingDict(groupPricing(pricing));

      // Drinks: normalize price_php -> price_cents (for existing cart logic)
      const drinkRows = (dd ?? []) as Array<
        Omit<Drink, "price_cents"> & { price_php: number | null }
      >;
      const normalized: BYODrink[] = drinkRows.map((d) => ({
        ...d,
        price_cents:
          typeof d.price_php === "number" ? Math.round(d.price_php * 100) : 0,
      }));
      setBaseDrinks(normalized);

      setLoadingAll(false);
    })();
  }, []);

  // --------------- Load base recipe when selected ---------------
  useEffect(() => {
    if (!selectedBaseId) {
      setBaseLines([]);
      return;
    }
    (async () => {
      setLoadingBase(true);
      const { data } = await supabase
        .from("drink_lines")
        .select("ingredient_id,amount,unit")
        .eq("drink_id", selectedBaseId);
      const rows = (data ?? []) as Array<{
        ingredient_id: string;
        amount: number;
        unit: string;
      }>;
      setBaseLines(
        rows.map((r) => ({
          ingredient_id: r.ingredient_id,
          amount: Number(r.amount),
          unit: r.unit,
          role: "base",
          name: ingDict[r.ingredient_id]?.name,
        }))
      );
      setLoadingBase(false);
    })();
  }, [selectedBaseId, ingDict]);

  // --------------- Add-ons handlers ---------------
  function handleAddAddon(
    ingredient: Ingredient,
    amount: number,
    unit: string
  ) {
    if (!selectedBaseId) {
      alert("Pick a base drink first.");
      return;
    }
    setExtraLines((p) => [
      ...p,
      {
        ingredient_id: ingredient.id,
        amount,
        unit,
        name: ingredient.name,
        role: "extra",
      },
    ]);
  }
  function removeAddon(i: number) {
    setExtraLines((p) => p.filter((_, x) => x !== i));
  }

  // --------------- Totals & pricing ---------------
  const combinedLines = useMemo(
    () => [...baseLines, ...extraLines],
    [baseLines, extraLines]
  );

  const { totals, allergens } = useMemo(
    () => totalsFor(combinedLines, ingDict, nutrDict),
    [combinedLines, ingDict, nutrDict]
  );

  const selectedBase = baseDrinks.find((b) => b.id === selectedBaseId) || null;

  // Add-ons are priced in PHP via pricing table
  const addons_price_php = useMemo(
    () => priceForExtrasPHP(extraLines, pricingDict),
    [extraLines, pricingDict]
  );
  const addons_price_cents = Math.round(addons_price_php * 100);

  // Base price currently in cents (normalized above)
  const base_price_cents = selectedBase?.price_cents || 0;
  const total_price_cents = base_price_cents + addons_price_cents;

  // --------------- Add to cart ---------------
  function addToCart() {
    if (!selectedBase) return;
    const cartItem: CartItem = {
      item_name: "Custom — " + selectedBase.name,
      drink_id: selectedBase.id,
      unit_price_cents: total_price_cents,
      base_price_cents,
      addons_price_cents,
      base_drink_name: selectedBase.name,
      lines: [...baseLines, ...extraLines],
    };
    addItem(cartItem);
    setExtraLines([]);
    alert("✅ Added to cart!");
  }

  const hasMissingNutrition = useMemo(
    () => combinedLines.some((l) => !nutrDict[l.ingredient_id]),
    [combinedLines, nutrDict]
  );

  // --------------- UI ---------------
  return (
    <div
      className="min-h-screen"
      style={{
        background: `
          radial-gradient(1200px 600px at 70% -10%, rgba(210,110,61,0.08), transparent 60%),
          radial-gradient(800px 500px at 10% 10%, rgba(89,145,144,0.08), transparent 50%),
          ${COLORS.bg}
        `,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-6 flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border bg-white shadow">
            <img
              src={logoUrl}
              alt="DailyMacros"
              className="h-10 w-10 object-contain"
            />
          </div>
          <div>
            <h1
              className="text-2xl md:text-3xl font-extrabold"
              style={{ color: COLORS.redOrange }}
            >
              Build Your Own Shake
            </h1>
            <p className="text-sm text-gray-600">
              Select a base, then add your extras. Live macros included.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* Left: builder */}
          <div className="col-span-12 space-y-6 md:col-span-7 lg:col-span-8">
            {/* Step 1: Base */}
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="mb-2 font-semibold text-gray-800">
                1️⃣ Choose your base drink
              </div>

              {loadingAll ? (
                <div className="text-sm text-gray-500">Loading drinks…</div>
              ) : baseDrinks.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No active base drinks yet.
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {baseDrinks.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedBaseId(d.id)}
                      className={`rounded-xl border p-3 text-left transition ${
                        d.id === selectedBaseId
                          ? "ring-2 ring-[#D26E3D]"
                          : "hover:shadow-sm"
                      }`}
                      title={`₱${(d.price_cents / 100).toFixed(2)}`}
                    >
                      <div className="font-semibold">{d.name}</div>
                      <div className="text-xs text-gray-500 line-clamp-2">
                        {d.description || "Signature blend"}
                      </div>
                      <div className="mt-2 text-xs text-[#599190]">
                        ₱{(d.price_cents / 100).toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {loadingBase && (
                <div className="mt-2 text-xs text-gray-500">
                  Loading recipe…
                </div>
              )}
            </section>

            {/* Step 2: Add-ons */}
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold text-gray-800">2️⃣ Add-ons</div>
                <span
                  className="rounded-md px-2 py-0.5 text-xs"
                  style={{ backgroundColor: COLORS.yellow, color: "#3f3f3f" }}
                >
                  ⚡ Live macros preview
                </span>
              </div>
              {!selectedBase ? (
                <div className="text-sm text-gray-500">
                  Choose a base drink first to enable add-ons.
                </div>
              ) : (
                <IngredientSelector onAdd={handleAddAddon} />
              )}
            </section>

            {/* Selected add-ons */}
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold text-gray-800">
                  Selected Add-ons
                </div>
                {extraLines.length > 0 && (
                  <button
                    onClick={() => setExtraLines([])}
                    className="text-sm text-rose-700 hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {extraLines.length === 0 ? (
                <div className="text-sm text-gray-500">No add-ons yet.</div>
              ) : (
                <ul className="divide-y divide-gray-100 text-sm">
                  {extraLines.map((l, i) => (
                    <li key={i} className="flex justify-between py-2">
                      <div>
                        <span className="font-medium text-gray-800">
                          {l.name}
                        </span>{" "}
                        <span className="text-gray-500">
                          — {l.amount} {l.unit}
                        </span>
                      </div>
                      <button
                        onClick={() => removeAddon(i)}
                        className="text-xs text-rose-700 hover:underline"
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
                  disabled={!selectedBase}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: COLORS.redOrange }}
                >
                  Add to Cart — ₱{(total_price_cents / 100).toFixed(2)}
                </button>

                <ExplainMath
                  lines={combinedLines}
                  ingDict={ingDict}
                  nutrDict={nutrDict}
                  buttonClassName="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
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
          </div>

          {/* Right: sticky macros & cost breakdown */}
          <aside className="col-span-12 md:col-span-5 lg:col-span-4">
            <div className="space-y-4 md:sticky md:top-24">
              <section className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="mb-2 flex justify-between">
                  <div className="font-semibold text-gray-800">Your Macros</div>
                  <span className="rounded px-2 py-0.5 text-xs text-gray-600 bg-gray-50">
                    Live
                  </span>
                </div>
                <NutritionBar totals={totals} allergens={allergens} />
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-700">
                  <div className="rounded border bg-gray-50 p-2">
                    <div className="text-xs text-gray-500">Base</div>
                    <div className="font-semibold">
                      ₱{((base_price_cents || 0) / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded border bg-gray-50 p-2">
                    <div className="text-xs text-gray-500">Add-ons</div>
                    <div className="font-semibold">
                      ₱{addons_price_php.toFixed(2)}
                    </div>
                  </div>
                </div>
              </section>
              <section className="rounded-2xl border bg-white p-4 text-sm text-gray-600 shadow-sm">
                Prices include base + add-ons. Use <b>Explain my math</b> for a
                per-ingredient breakdown and unit conversions.
              </section>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="mt-10 pb-10 text-center text-xs text-gray-500">
          <span className="font-semibold" style={{ color: COLORS.redOrange }}>
            DailyMacros
          </span>{" "}
          — Fuel your day with balance.
        </footer>
      </div>
    </div>
  );
}
