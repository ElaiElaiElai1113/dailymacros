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
  const [uiErrors, setUiErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { addItem } = useCart();
  const navigate = useNavigate();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<DrinkRecord | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data: dd, error: de } = await supabase
          .from("drinks")
          .select(
            "id,name,description,base_size_ml,price_php,is_active,image_url"
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
          image_url?: string | null;
        }>;

        const normalized = drinkRows.map((d) => ({
          ...d,
          price_cents: Math.round((d.price_php ?? 0) * 100),
        }));

        const drinkIds = normalized.map((d) => d.id);

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

        const [{ data: ii, error: ie }, { data: nn, error: ne }] =
          await Promise.all([
            supabase.from("ingredients").select("*"),
            supabase.from("ingredient_nutrition_v100").select("*"),
          ]);
        if (ie) throw ie;
        if (ne) throw ne;

        setDrinks(normalized as any);
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
      } catch (e: any) {
        setErr(e.message || "Failed to load menu");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
      setSuccessMsg(null);
      setUiErrors([
        `"${drink.name}" does not have a recipe configured yet. Please choose another drink or contact the staff.`,
      ]);
      return;
    }
    addItem({
      item_name: drink.name,
      unit_price_cents: drink.price_cents,
      lines: drinkLines,
    });
    setUiErrors([]);
    setSuccessMsg(`${drink.name} added to cart.`);
  }

  function openDrawer(drink: DrinkRecord) {
    setSelected(drink);
    setDrawerOpen(true);
    setUiErrors([]);
    setSuccessMsg(null);
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg }}>
      <div className="mx-auto max-w-7xl px-4 pt-8 space-y-4">
        <div className="flex items-center justify-between">
          <Link
            to="/build"
            className="rounded-lg px-4 py-2 text-white text-sm font-medium hover:opacity-90"
            style={{ background: COLORS.redOrange }}
          >
            Build Your Own
          </Link>
          <Link
            to="/cart"
            className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-white/60"
          >
            View Cart
          </Link>
        </div>

        <div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
            Our Menu
          </h1>
          <p className="mt-2 text-gray-700">
            Dietitian-crafted shakes. Transparent macros. Tap a card for details
            or add to cart.
          </p>
        </div>

        {err && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex gap-3">
            <div className="mt-0.5">⚠️</div>
            <div>
              <div className="font-semibold mb-1">
                There was a problem loading the menu.
              </div>
              <div>{err}</div>
            </div>
          </div>
        )}

        {uiErrors.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex gap-3">
            <div className="mt-0.5">⚠️</div>
            <div>
              <div className="font-semibold mb-1">
                Please check the following:
              </div>
              <ul className="list-disc space-y-0.5 pl-4">
                {uiErrors.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex gap-3">
            <div className="mt-0.5">✅</div>
            <div>{successMsg}</div>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {loading ? (
          <div className="text-sm text-gray-700">Loading menu…</div>
        ) : !err && drinks.length === 0 ? (
          <div className="text-sm text-gray-700">
            No active drinks yet. Please check back later.
          </div>
        ) : (
          !err && (
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
          )
        )}
      </div>

      <DrinkDetailDrawer
        open={drawerOpen && !!selected}
        onClose={() => setDrawerOpen(false)}
        drink={selected}
        lines={selected ? drinkLinesMap[selected.id] || [] : []}
        ingDict={ingDict}
        nutrDict={nutrDict}
        onAddToCart={(scaledLines) => {
          if (!selected) return;
          const fallbackLines = drinkLinesMap[selected.id] || [];
          const linesToUse =
            scaledLines && scaledLines.length ? scaledLines : fallbackLines;
          if (!linesToUse.length) {
            setSuccessMsg(null);
            setUiErrors([
              `"${selected.name}" does not have a recipe configured yet. Please choose another drink or contact the staff.`,
            ]);
            return;
          }
          addItem({
            item_name: selected.name,
            unit_price_cents: selected.price_cents,
            lines: linesToUse,
          });
          setUiErrors([]);
          setSuccessMsg(`${selected.name} added to cart.`);
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
