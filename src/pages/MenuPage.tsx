import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import type { Ingredient, IngredientNutrition, LineIngredient } from "@/types";
import DrinkDetailDrawer from "@/components/DrinkDetailDrawer";
import DrinkCard, { type DrinkRecord } from "@/components/DrinkCard";

const COLORS = {
  redOrange: "#D26E3D",
  yellow: "#EECB65",
  cyan: "#599190",
  bg: "#F6ECC6",
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
  const navigate = useNavigate();

  // drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<DrinkRecord | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // 1) drinks
        const { data: dd, error: de } = await supabase
          .from("drinks")
          .select(
            "id,name,description,base_size_ml,price_php,is_active,image_url" // 👈 added image_url
          )
          .eq("is_active", true)
          .order("name", { ascending: true });
        if (de) throw de;

        const drinkRows = (dd || []) as Array<{
          id: string;
          name: string;
          description: string | null;
          base_size_ml: number | null;
          price_php: number | null;
          is_active: boolean;
          image_url?: string | null; // 👈 keep it
        }>;

        // Normalize price for UI that still uses cents
        const normalized = drinkRows.map((d) => ({
          ...d,
          price_cents: Math.round((d.price_php ?? 0) * 100),
        }));

        const drinkIds = normalized.map((d) => d.id);
        console.log("🧪 drinks loaded:", drinkIds.length);

        // 2) lines
        const { data: ll, error: le } = await supabase
          .from("drink_lines")
          .select("drink_id,ingredient_id,amount,unit,drinks!inner(id)")
          .in(
            "drink_id",
            drinkIds.length
              ? drinkIds
              : ["00000000-0000-0000-0000-000000000000"]
          );
        if (le) throw le;

        console.log("🧪 recipe lines loaded:", (ll || []).length);

        // 3) ingredients + nutrition
        const [{ data: ii, error: ie }, { data: nn, error: ne }] =
          await Promise.all([
            supabase.from("ingredients").select("*"),
            supabase.from("ingredient_nutrition_v100").select("*"),
          ]);
        if (ie) throw ie;
        if (ne) throw ne;

        setDrinks(normalized as any); // DrinkCard will now also get image_url
        setLines((ll || []) as any);
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

        if (!ll || ll.length === 0) {
          console.warn(
            "⚠️ No recipe lines returned. Likely causes: (a) RLS on drink_lines blocks select, (b) drink_lines is empty, (c) wrong schema/table name."
          );
        }
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

  function openDrawer(drink: DrinkRecord) {
    setSelected(drink);
    setDrawerOpen(true);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
      {/* Header */}
      <div className="mx-auto max-w-7xl px-4 pt-8">
        <div className="flex items-center justify-between">
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
                onOpen={() => openDrawer(d)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      <DrinkDetailDrawer
        open={drawerOpen && !!selected}
        onClose={() => setDrawerOpen(false)}
        drink={selected}
        lines={selected ? drinkLinesMap[selected.id] || [] : []}
        ingDict={ingDict}
        nutrDict={nutrDict}
        onAddToCart={(scaledLines) => {
          if (!selected) return;
          addItem({
            item_name: selected.name,
            unit_price_cents: selected.price_cents,
            lines:
              scaledLines && scaledLines.length
                ? scaledLines
                : drinkLinesMap[selected.id] || [],
          });
          setDrawerOpen(false);
        }}
        onCustomize={() => {
          setDrawerOpen(false);
          navigate("/build");
        }}
      />
    </div>
  );
}
