// src/pages/MenuPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import type { Ingredient, IngredientNutrition, LineIngredient } from "@/types";
import { totalsFor } from "@/utils/nutrition";

const COLORS = {
  redOrange: "#D26E3D",
  yellow: "#EECB65",
  cyan: "#599190",
  bg: "#F6ECC6",
};

type DrinkRecord = {
  id: string;
  name: string;
  description: string | null;
  base_size_ml: number | null;
  price_cents: number;
  is_active: boolean;
};

type DrinkLineRow = {
  id: string;
  drink_id: string;
  ingredient_id: string;
  amount: number;
  unit: string;
};

export default function MenuPage() {
  const [drinks, setDrinks] = useState<DrinkRecord[]>([]);
  const [lines, setLines] = useState<DrinkLineRow[]>([]);
  const [ingDict, setIngDict] = useState<Record<string, Ingredient>>({});
  const [nutrDict, setNutrDict] = useState<Record<string, IngredientNutrition>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // 1) drinks
        const { data: dd, error: de } = await supabase
          .from("drinks")
          .select("id,name,description,base_size_ml,price_cents,is_active")
          .eq("is_active", true)
          .order("name", { ascending: true });
        if (de) throw de;

        // 2) lines for those drinks
        const drinkIds = (dd || []).map((d) => d.id);
        const { data: ll, error: le } = await supabase
          .from("drink_lines")
          .select("*")
          .in(
            "drink_id",
            drinkIds.length
              ? drinkIds
              : ["00000000-0000-0000-0000-000000000000"]
          );
        if (le) throw le;

        // 3) ingredients + nutrition dicts
        const [{ data: ii, error: ie }, { data: nn, error: ne }] =
          await Promise.all([
            supabase.from("ingredients").select("*"),
            supabase.from("ingredient_nutrition_v100").select("*"),
          ]);
        if (ie) throw ie;
        if (ne) throw ne;

        setDrinks((dd || []) as DrinkRecord[]);
        setLines((ll || []) as DrinkLineRow[]);
        setIngDict(
          Object.fromEntries(((ii || []) as Ingredient[]).map((x) => [x.id, x]))
        );
        setNutrDict(
          Object.fromEntries(
            ((nn || []) as IngredientNutrition[]).map((x) => [
              x.ingredient_id,
              x,
            ])
          )
        );
      } catch (e: any) {
        setErr(e.message || "Failed to load menu");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Map drinkId -> LineIngredient[]
  const drinkLinesMap = useMemo(() => {
    const map: Record<string, LineIngredient[]> = {};
    for (const r of lines) {
      (map[r.drink_id] ||= []).push({
        ingredient_id: r.ingredient_id,
        amount: Number(r.amount),
        unit: r.unit,
      });
    }
    return map;
  }, [lines]);

  function handleAddToCart(drink: DrinkRecord) {
    const drinkLines = drinkLinesMap[drink.id] || [];
    if (drinkLines.length === 0) {
      alert("This drink has no recipe lines yet.");
      return;
    }
    addItem({
      item_name: drink.name,
      unit_price_cents: drink.price_cents,
      lines: drinkLines,
    });
    alert(`${drink.name} added to cart`);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
      {/* Header */}
      <div className="mx-auto max-w-7xl px-4 pt-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="DailyMacros logo"
              className="h-9 w-9 rounded-lg"
            />
            <span className="font-semibold tracking-tight text-lg">
              DailyMacros
            </span>
          </Link>
          <Link
            to="/build"
            className="rounded-lg px-4 py-2 text-white text-sm font-medium hover:opacity-90"
            style={{ background: COLORS.redOrange }}
          >
            Build Your Own
          </Link>
        </div>

        <h1 className="mt-8 text-3xl font-extrabold tracking-tight">
          Our Menu
        </h1>
        <p className="mt-2 text-gray-700">
          Dietitian-crafted shakes. Transparent macros. Tap a card for details
          or add to cart.
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {loading ? (
          <div className="text-sm text-gray-700">Loading menu…</div>
        ) : err ? (
          <div className="text-sm text-rose-700">Error: {err}</div>
        ) : drinks.length === 0 ? (
          <div className="text-sm text-gray-700">
            No active drinks yet. Add some in Admin.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drinks.map((d) => (
              <DrinkCard
                key={d.id}
                drink={d}
                lines={drinkLinesMap[d.id] || []}
                ingDict={ingDict}
                nutrDict={nutrDict}
                onAdd={() => handleAddToCart(d)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DrinkCard({
  drink,
  lines,
  ingDict,
  nutrDict,
  onAdd,
}: {
  drink: DrinkRecord;
  lines: LineIngredient[];
  ingDict: Record<string, Ingredient>;
  nutrDict: Record<string, IngredientNutrition>;
  onAdd: () => void;
}) {
  const { totals } = useMemo(
    () => totalsFor(lines, ingDict, nutrDict),
    [lines, ingDict, nutrDict]
  );

  return (
    <div className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md">
      <div
        className="aspect-[16/9] w-full rounded-xl"
        style={{
          background:
            "linear-gradient(135deg, rgba(89,145,144,0.15), rgba(210,110,61,0.15))",
        }}
      />
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{drink.name}</div>
          <div className="text-sm text-gray-600 line-clamp-2">
            {drink.description || "Signature protein smoothie."}
          </div>
          {drink.base_size_ml ? (
            <div className="mt-1 text-xs text-gray-500">
              {drink.base_size_ml} ml base size
            </div>
          ) : null}
        </div>
        <div
          className="shrink-0 rounded-lg px-2.5 py-1 text-white text-xs font-medium"
          style={{ background: "#599190" }}
        >
          ₱{(drink.price_cents / 100).toFixed(2)}
        </div>
      </div>

      {/* Macro teaser */}
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
        <Stat
          label="Kcal"
          value={
            Number.isFinite(totals.energy_kcal)
              ? Math.round(totals.energy_kcal).toString()
              : "—"
          }
        />
        <Stat
          label="Protein"
          value={
            Number.isFinite(totals.protein_g) ? `${totals.protein_g}g` : "—"
          }
        />
        <Stat
          label="Carbs"
          value={Number.isFinite(totals.carbs_g) ? `${totals.carbs_g}g` : "—"}
        />
        <Stat
          label="Fat"
          value={Number.isFinite(totals.fat_g) ? `${totals.fat_g}g` : "—"}
        />
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={onAdd}
          className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          style={{ background: "#D26E3D" }}
          disabled={lines.length === 0}
          title={lines.length === 0 ? "No recipe lines found" : "Add to cart"}
        >
          Add to Cart
        </button>
        <Link
          to="/build"
          className="inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Customize
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white py-2">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}
