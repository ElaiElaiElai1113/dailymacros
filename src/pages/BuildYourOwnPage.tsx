import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type {
  CartItem,
  CartLine,
  Drink,
  Ingredient,
  IngredientNutrition,
  IngredientPricing,
  LineIngredient,
} from "@/types";
import IngredientSelector from "@/components/IngredientSelector";
import NutritionBar from "@/components/NutritionBar";
import ExplainMath from "@/components/ExplainMath";
import { totalsFor } from "@/utils/nutrition";
import { groupPricing, priceForExtrasCents } from "@/utils/pricing";
import { useCart } from "@/context/CartContext";
import logoUrl from "@/assets/dailymacroslogo.png";

const COLORS = {
  redOrange: "#D26E3D",
  yellow: "#EECB65",
  cyan: "#599190",
  bg: "#FFFDF8",
};

export default function BuildYourOwnPage() {
  const { addItem } = useCart();

  const [ingDict, setIngDict] = useState<Record<string, Ingredient>>({});
  const [nutrDict, setNutrDict] = useState<Record<string, IngredientNutrition>>(
    {}
  );
  const [pricingDict, setPricingDict] = useState<
    Record<string, IngredientPricing[]>
  >({});

  const [baseDrinks, setBaseDrinks] = useState<Drink[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);

  const [baseLines, setBaseLines] = useState<CartLine[]>([]);
  const [extraLines, setExtraLines] = useState<CartLine[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingBase, setLoadingBase] = useState(false);

  // Load ingredients, nutrition, pricing, base drinks
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: ii }, { data: nn }, { data: dd }, { data: pp }] =
        await Promise.all([
          supabase.from("ingredients").select("*").eq("is_active", true),
          supabase.from("ingredient_nutrition_v100").select("*"),
          supabase
            .from("drinks")
            .select("id,name,description,price_cents,base_size_ml,is_active")
            .eq("is_active", true)
            .order("name"),
          supabase.from("ingredient_pricing_effective").select("*"),
        ]);

      const ingredients = (ii ?? []) as Ingredient[];
      const v100 = (nn ?? []) as any[];
      const drinks = (dd ?? []) as Drink[];
      const pricing = (pp ?? []) as IngredientPricing[];

      setIngDict(Object.fromEntries(ingredients.map((x) => [x.id, x])));
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
      setPricingDict(groupPricing(pricing));
      setBaseDrinks(drinks);

      setLoading(false);
    })();
  }, []);

  // Load recipe lines of selected base drink
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
      const rows = (data ?? []) as any[];
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

  // Add-ons handlers
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

  // Totals / macros
  const combinedLines = useMemo(
    () => [...baseLines, ...extraLines],
    [baseLines, extraLines]
  );
  const { totals, allergens } = useMemo(
    () => totalsFor(combinedLines, ingDict, nutrDict),
    [combinedLines, ingDict, nutrDict]
  );

  // Price calc
  const selectedBase = baseDrinks.find((b) => b.id === selectedBaseId) || null;
  const addons_price_cents = useMemo(
    () => priceForExtrasCents(extraLines, ingDict, pricingDict),
    [extraLines, ingDict, pricingDict]
  );
  const total_price_cents =
    (selectedBase?.price_cents || 0) + addons_price_cents;

  // Add to cart
  function addToCart() {
    if (!selectedBase) return;
    const cartItem: CartItem = {
      item_name: "Custom — " + selectedBase.name,
      drink_id: selectedBase.id,
      unit_price_cents: total_price_cents,
      base_price_cents: selectedBase.price_cents,
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
        <div className="flex items-center gap-3 mb-6">
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
              Select your base and mix add-ons to create your perfect blend.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left */}
          <div className="col-span-12 md:col-span-7 lg:col-span-8 space-y-6">
            {/* Step 1: Base */}
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="mb-2 font-semibold text-gray-800">
                1️⃣ Choose your base drink
              </div>
              {loading ? (
                <div className="text-sm text-gray-500">Loading drinks…</div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
              <div className="flex items-center justify-between mb-2">
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
              <div className="flex items-center justify-between mb-2">
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
                <ul className="text-sm divide-y divide-gray-100">
                  {extraLines.map((l, i) => (
                    <li key={i} className="py-2 flex justify-between">
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

          {/* Right */}
          <aside className="col-span-12 md:col-span-5 lg:col-span-4">
            <div className="md:sticky md:top-24 space-y-4">
              <section className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="mb-2 flex justify-between">
                  <div className="font-semibold text-gray-800">Your Macros</div>
                  <span className="text-xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded">
                    Live
                  </span>
                </div>
                <NutritionBar totals={totals} allergens={allergens} />
                <div className="mt-3 text-sm text-gray-700 grid grid-cols-2 gap-2">
                  <div className="rounded border p-2 bg-gray-50">
                    <div className="text-xs text-gray-500">Base</div>
                    <div className="font-semibold">
                      ₱{((selectedBase?.price_cents || 0) / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded border p-2 bg-gray-50">
                    <div className="text-xs text-gray-500">Add-ons</div>
                    <div className="font-semibold">
                      ₱{(addons_price_cents / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              </section>
              <section className="rounded-2xl border bg-white p-4 shadow-sm text-sm text-gray-600">
                Includes both base and add-ons. Use “Explain my math” for
                details.
              </section>
            </div>
          </aside>
        </div>

        <footer className="text-center text-xs mt-10 pb-10 text-gray-500">
          <span className="font-semibold text-[#D26E3D]">DailyMacros</span> —
          Fuel your day with balance.
        </footer>
      </div>
    </div>
  );
}
