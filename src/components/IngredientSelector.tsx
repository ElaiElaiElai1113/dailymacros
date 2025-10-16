import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Ingredient } from "@/types";

type Props = {
  onAdd: (ing: Ingredient, amount: number, unit: string) => void;
  /** Optional: compute price shown per row for (ingredient, amount, unit) in PHP */
  getPricePHP?: (
    ing: Ingredient,
    amount: number,
    unit: string
  ) => number | null | undefined;
};

export default function IngredientSelector({ onAdd, getPricePHP }: Props) {
  const [ings, setIngs] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState<number>(1);
  const [unit, setUnit] = useState<string>("tablespoon"); // default to tablespoon since most add-ons are priced per tbsp

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data, error } = await supabase
          .from("ingredients")
          .select("*")
          .eq("is_active", true)
          .eq("is_addon", true)
          .order("name");
        if (error) throw error;
        setIngs((data || []) as Ingredient[]);
      } catch (e: any) {
        setErr(e.message || "Failed to load add-ons");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ings;
    return ings.filter((i) => i.name.toLowerCase().includes(q));
  }, [ings, search]);

  function onChangeAmount(v: string) {
    const n = Number(v);
    if (!Number.isFinite(n)) {
      setAmount(0);
      return;
    }
    setAmount(Math.max(0, n));
  }

  return (
    <div>
      {/* Controls */}
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-12">
        <input
          className="sm:col-span-7 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
          placeholder="Search add-ons (e.g. chia, honey, cocoa)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          type="number"
          min={0}
          step="any"
          className="sm:col-span-2 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
          value={amount}
          onChange={(e) => onChangeAmount(e.target.value)}
        />
        <select
          className="sm:col-span-3 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        >
          <option value="tablespoon">tablespoon</option>
          <option value="scoop">scoop</option>
          <option value="g">g</option>
          <option value="ml">ml</option>
          <option value="piece">piece</option>
        </select>
      </div>

      {/* Body */}
      {loading ? (
        <div className="text-sm text-gray-600">Loading add-ons…</div>
      ) : err ? (
        <div className="text-sm text-rose-700">Error: {err}</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-600">
          No add-ons match your search.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map((ing) => {
            const pricePHP =
              typeof getPricePHP === "function"
                ? getPricePHP(ing, amount, unit)
                : undefined;

            const disabled = !amount || amount <= 0;

            return (
              <button
                key={ing.id}
                onClick={() => !disabled && onAdd(ing, amount, unit)}
                disabled={disabled}
                className={`rounded-xl border bg-white p-3 text-left transition ${
                  disabled ? "opacity-60" : "hover:shadow-sm"
                }`}
                title={
                  pricePHP !== undefined && pricePHP !== null
                    ? `₱${pricePHP.toFixed(2)}`
                    : undefined
                }
              >
                <div className="truncate font-semibold text-gray-800">
                  {ing.name}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  {ing.category}
                </div>

                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="rounded bg-gray-50 px-2 py-0.5 text-gray-700">
                    {amount || 0} {unit}
                  </span>
                  {pricePHP !== undefined && pricePHP !== null ? (
                    <span className="font-semibold text-emerald-700">
                      ₱{pricePHP.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-400">no price</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
