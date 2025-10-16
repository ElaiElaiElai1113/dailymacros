// src/components/IngredientSelector.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Ingredient } from "@/types";

export default function IngredientSelector({
  onAdd,
  getPricePHP, // NEW (optional): (ing, amount, unit) => number
}: {
  onAdd: (ing: Ingredient, amount: number, unit: string) => void;
  getPricePHP?: (
    ing: Ingredient,
    amount: number,
    unit: string
  ) => number | null | undefined;
}) {
  const [ings, setIngs] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState(50);
  const [unit, setUnit] = useState("g");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ingredients")
        .select("*")
        .eq("is_active", true)
        .order("name");
      setIngs((data || []) as Ingredient[]);
    })();
  }, []);

  const filtered = useMemo(
    () =>
      ings.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())),
    [ings, search]
  );

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <input
          className="w-full rounded border px-2 py-1"
          placeholder="Search ingredients"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          type="number"
          className="w-28 rounded border px-2 py-1"
          value={amount}
          onChange={(e) => setAmount(+e.target.value || 0)}
          min={0}
        />
        <select
          className="rounded border px-2 py-1"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        >
          <option>g</option>
          <option>ml</option>
          <option>scoop</option>
          <option>piece</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((i) => {
          const pricePHP =
            typeof getPricePHP === "function"
              ? getPricePHP(i, amount, unit) ?? 0
              : undefined;

          return (
            <button
              key={i.id}
              onClick={() => onAdd(i, amount, unit)}
              className="rounded border bg-white p-2 text-left transition hover:bg-gray-50"
              title={
                pricePHP !== undefined ? `₱${pricePHP.toFixed(2)}` : undefined
              }
            >
              <div className="font-medium">{i.name}</div>
              <div className="text-xs text-gray-500">{i.category}</div>
              {pricePHP !== undefined && (
                <div className="mt-1 text-xs text-emerald-700">
                  from <b>₱{pricePHP.toFixed(2)}</b>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
