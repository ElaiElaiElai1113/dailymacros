// src/pages/BuildYourOwnPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  groupPricing,
  priceForExtrasPHP,
  priceForLinePHP,
} from "@/utils/pricing";
import { totalsFor } from "@/utils/nutrition";
import { useCart } from "@/context/CartContext";
import IngredientSelector from "@/components/IngredientSelector";
import NutritionBar from "@/components/NutritionBar";
import ExplainMath from "@/components/ExplainMath";
import logoUrl from "@/assets/dailymacroslogo.png";

import type {
  CartItem,
  CartLine,
  Drink,
  Ingredient,
  IngredientNutrition,
  IngredientPricing,
} from "@/types";

const COLORS = {
  redOrange: "#D26E3D",
  yellow: "#EECB65",
  cyan: "#599190",
  bg: "#FFFDF8",
};

type BYODrink = Drink & {
  price_cents: number;
  image_url?: string | null;
};

type V100Row = {
  ingredient_id: string;
  per_100g_energy_kcal: number | null;
  per_100g_protein_g: number | null;
  per_100g_fat_g: number | null;
  per_100g_carbs_g: number | null;
};

export default function BuildYourOwnPage() {
  const { addItem } = useCart();

  // master data
  const [ingDict, setIngDict] = useState<Record<string, Ingredient>>({});
  const [nutrDict, setNutrDict] = useState<Record<string, IngredientNutrition>>(
    {}
  );
  const [pricingDict, setPricingDict] = useState<
    Record<string, IngredientPricing[]>
  >({});

  // drinks
  const [baseDrinks, setBaseDrinks] = useState<BYODrink[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);

  // lines
  const [baseLines, setBaseLines] = useState<CartLine[]>([]);
  const [extraLines, setExtraLines] = useState<CartLine[]>([]);

  // ui
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingBase, setLoadingBase] = useState(false);

  /* --------------------------------------------------------
   * 1) load master data (ingredients, nutrition, drinks, pricing)
   * ------------------------------------------------------ */
  useEffect(() => {
    (async () => {
      setLoadingAll(true);
      const [{ data: ii }, { data: nn }, { data: dd }, { data: pp }] =
        await Promise.all([
          supabase.from("ingredients").select("*").eq("is_active", true),
          supabase.from("ingredient_nutrition_v100").select("*"),
          supabase
            .from("drinks")
            .select(
              "id,name,description,price_php,base_size_ml,is_active,image_url"
            )
            .eq("is_active", true)
            .order("name"),
          supabase.from("ingredient_pricing_effective").select("*"),
        ]);

      // ingredients
      const ingredients = (ii ?? []) as Ingredient[];
      setIngDict(Object.fromEntries(ingredients.map((x) => [x.id, x])));

      // nutrition
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

      // pricing (PHP)
      const pricing = (pp ?? []) as IngredientPricing[];
      setPricingDict(groupPricing(pricing));

      // drinks
      const drinkRows = (dd ?? []) as Array<
        Omit<Drink, "price_cents"> & {
          price_php: number | null;
          image_url?: string | null;
        }
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

  /* --------------------------------------------------------
   * 2) load base recipe when user chooses a base drink
   * ------------------------------------------------------ */
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

      const rows =
        (data as Array<{
          ingredient_id: string;
          amount: number;
          unit: string;
        }>) ?? [];

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

  /* --------------------------------------------------------
   * 3) add-ons
   * ------------------------------------------------------ */
  function handleAddAddon(
    ingredient: Ingredient,
    amount: number,
    unit: string
  ) {
    if (!selectedBaseId) {
      alert("Pick a base drink first.");
      return;
    }

    const newLine: CartLine = {
      ingredient_id: ingredient.id,
      amount,
      unit,
      name: ingredient.name,
      role: "extra",
    };

    setExtraLines((prev) => [...prev, newLine]);
  }

  function removeAddon(idx: number) {
    setExtraLines((prev) => prev.filter((_, i) => i !== idx));
  }

  /* --------------------------------------------------------
   * 4) totals & pricing
   * ------------------------------------------------------ */
  const combinedLines = useMemo(
    () => [...baseLines, ...extraLines],
    [baseLines, extraLines]
  );

  const { totals, allergens } = useMemo(
    () => totalsFor(combinedLines, ingDict, nutrDict),
    [combinedLines, ingDict, nutrDict]
  );

  const selectedBase = baseDrinks.find((b) => b.id === selectedBaseId) || null;

  // add-ons priced in PHP
  const addons_price_php = useMemo(
    () => priceForExtrasPHP(extraLines, pricingDict),
    [extraLines, pricingDict]
  );

  const addons_price_cents = Math.round(addons_price_php * 100);
  const base_price_cents = selectedBase?.price_cents || 0;
  const total_price_cents = base_price_cents + addons_price_cents;

  const hasMissingNutrition = useMemo(
    () => combinedLines.some((l) => !nutrDict[l.ingredient_id]),
    [combinedLines, nutrDict]
  );

  // per-line PHP price helper
  const linePricePHP = (l: CartLine) => priceForLinePHP(l, pricingDict) ?? 0;

  /* --------------------------------------------------------
   * 5) add to cart
   * ------------------------------------------------------ */
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

  /* --------------------------------------------------------
   * 6) UI
   * ------------------------------------------------------ */
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
        {/* HEADER */}
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
              Pick a base, add protein / toppings, see macros live.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* LEFT */}
          <div className="col-span-12 space-y-6 md:col-span-7 lg:col-span-8">
            {/* STEP 1 */}
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold text-gray-800">
                  1️⃣ Choose your base drink
                </div>
                {loadingBase && (
                  <span className="text-[11px] text-gray-500">
                    Loading recipe…
                  </span>
                )}
              </div>

              {loadingAll ? (
                <div className="text-sm text-gray-500">Loading drinks…</div>
              ) : baseDrinks.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No active base drinks yet.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {baseDrinks.map((d) => {
                    const active = d.id === selectedBaseId;
                    return (
                      <button
                        key={d.id}
                        onClick={() => setSelectedBaseId(d.id)}
                        className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                          active
                            ? "ring-2 ring-[#D26E3D]/60"
                            : "hover:shadow-md hover:border-[#EECB65]"
                        }`}
                      >
                        {d.image_url ? (
                          <div className="h-32 w-full bg-white flex items-center justify-center overflow-hidden">
                            <img
                              src={d.image_url}
                              alt={d.name}
                              className="max-h-full max-w-full object-contain transition group-hover:scale-[1.01]"
                            />
                          </div>
                        ) : (
                          <div className="h-32 w-full bg-gradient-to-br from-[#FFE7D6] to-[#FFF8DE]" />
                        )}

                        <div className="p-3 space-y-1 text-left">
                          <div className="font-semibold text-gray-900">
                            {d.name}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {d.description || "Signature blend"}
                          </p>
                          <div className="text-xs font-medium text-[#599190]">
                            ₱{(d.price_cents / 100).toFixed(2)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* STEP 2 – Add-ons */}
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-semibold text-gray-800">2️⃣ Add-ons</div>
                <span
                  className="rounded-md px-2 py-0.5 text-xs"
                  style={{ backgroundColor: COLORS.yellow, color: "#3f3f3f" }}
                >
                  ⚡ Live macros & prices
                </span>
              </div>
              {!selectedBase ? (
                <div className="text-sm text-gray-500">
                  Choose a base drink first to enable add-ons.
                </div>
              ) : (
                <IngredientSelector
                  onAdd={handleAddAddon}
                  getPricePHP={(ing, amount, unit) =>
                    priceForLinePHP(
                      { ingredient_id: ing.id, amount, unit },
                      pricingDict
                    )
                  }
                  selectedIngredientIds={extraLines.map((l) => l.ingredient_id)}
                />
              )}
            </section>

            {/* Selected Add-ons */}
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
                  {extraLines.map((l, i) => {
                    const php = linePricePHP(l);
                    return (
                      <li
                        key={i}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-gray-800">
                            {l.name}
                          </span>{" "}
                          <span className="text-gray-500">
                            — {l.amount} {l.unit}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-gray-700">
                            ₱{php.toFixed(2)}
                          </span>
                          <button
                            onClick={() => removeAddon(i)}
                            className="text-xs text-rose-700 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* actions */}
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

          {/* RIGHT / sticky */}
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
                Prices include base + add-ons. Use <b>Explain my math</b> to see
                per-ingredient pricing and unit logic.
              </section>
            </div>
          </aside>
        </div>

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
