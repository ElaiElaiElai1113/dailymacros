import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Ingredient } from "@/types";

export default function IngredientSelector({
  onAdd,
  disabled = false,
}: {
  onAdd: (ing: Ingredient, amount: number, unit: string) => void;
  disabled?: boolean;
}) {
  const [ings, setIngs] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState(50);
  const [unit, setUnit] = useState<"g" | "ml" | "scoop" | "piece">("g");
  const [cat, setCat] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ingredients")
        .select("*")
        .eq("is_active", true)
        .order("name");
      setIngs((data as Ingredient[]) || []);
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(ings.map((i) => i.category).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [ings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ings.filter((i) => {
      const okCat = cat === "all" || i.category === cat;
      const okText = i.name.toLowerCase().includes(q);
      return okCat && okText;
    });
  }, [ings, search, cat]);

  return (
    <fieldset
      disabled={disabled}
      className={disabled ? "opacity-60 pointer-events-none" : ""}
    >
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          className="border px-3 py-2 rounded-lg w-full md:flex-1"
          placeholder="Search ingredients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="border px-3 py-2 rounded-lg"
          title="Filter by category"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All categories" : c}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          className="border px-3 py-2 rounded-lg w-28"
          value={amount}
          onChange={(e) => setAmount(+e.target.value || 0)}
          title="Amount"
        />
        <select
          className="border px-3 py-2 rounded-lg"
          value={unit}
          onChange={(e) => setUnit(e.target.value as any)}
          title="Unit"
        >
          <option>g</option>
          <option>ml</option>
          <option>scoop</option>
          <option>piece</option>
        </select>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((i) => (
          <button
            key={i.id}
            onClick={() => onAdd(i, amount, unit)}
            className="rounded-xl border bg-white p-3 text-left hover:shadow-sm transition"
            title={`Add ${i.name}`}
          >
            <div className="font-medium">{i.name}</div>
            <div className="mt-0.5 text-xs text-gray-500">
              {i.category || "Ingredient"}
            </div>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
