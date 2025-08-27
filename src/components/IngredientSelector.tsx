import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Ingredient } from "@/types";

export default function IngredientSelector({
  onAdd,
}: {
  onAdd: (ing: Ingredient, amount: number, unit: string) => void;
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
      setIngs(data || []);
    })();
  }, []);

  const filtered = ings.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          className="border px-2 py-1 rounded w-full"
          placeholder="Search ingredients"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          type="number"
          className="border px-2 py-1 rounded w-28"
          value={amount}
          onChange={(e) => setAmount(+e.target.value)}
        />
        <select
          className="border px-2 py-1 rounded"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        >
          <option>g</option>
          <option>ml</option>
          <option>scoop</option>
          <option>piece</option>
        </select>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {filtered.map((i) => (
          <button
            key={i.id}
            onClick={() => onAdd(i, amount, unit)}
            className="border rounded p-2 bg-white hover:bg-gray-50 text-left"
          >
            <div className="font-medium">{i.name}</div>
            <div className="text-xs text-gray-500">{i.category}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
