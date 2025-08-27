import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminPage() {
  const [ings, setIngs] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [cat, setCat] = useState("protein");
  const [unit, setUnit] = useState("g");

  async function load() {
    const { data } = await supabase
      .from("ingredients")
      .select("*")
      .order("name");
    setIngs(data || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!name) return;
    await supabase
      .from("ingredients")
      .insert({ name, category: cat, unit_default: unit, is_active: true });
    setName("");
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Admin</h1>
      <div className="bg-white border rounded p-3 flex gap-2 items-end">
        <div>
          <div className="text-sm">Name</div>
          <input
            className="border px-2 py-1 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <div className="text-sm">Category</div>
          <input
            className="border px-2 py-1 rounded"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          />
        </div>
        <div>
          <div className="text-sm">Unit</div>
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
        <button onClick={add} className="px-3 py-2 bg-black text-white rounded">
          Add
        </button>
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
        {ings.map((i) => (
          <div key={i.id} className="border rounded p-2 bg-white">
            <div className="font-medium">{i.name}</div>
            <div className="text-xs text-gray-500">
              {i.category} • unit {i.unit_default}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
