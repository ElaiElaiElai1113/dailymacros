import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import IngredientCard from "@/components/IngredientCard";

/* ---------- Types ---------- */
type IngredientRow = {
  id: string;
  name: string;
  category: string;
  unit_default: "g" | "ml" | "scoop" | "piece";
  grams_per_unit: number | null;
  density_g_per_ml: number | null;
  allergen_tags: string[] | null;
  is_active: boolean;
  ingredient_nutrition?: {
    ingredient_id: string;
    per_100g_energy_kcal: number;
    per_100g_protein_g: number;
    per_100g_fat_g: number;
    per_100g_carbs_g: number;
    per_100g_sugars_g: number;
    per_100g_fiber_g: number;
    per_100g_sodium_mg: number;
  } | null;
};

type DrinkRow = {
  id: string;
  name: string;
  price_php: number;
  is_active: boolean;
};

/* ---------- UI Bits ---------- */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm font-semibold tracking-tight text-gray-800">
      {children}
    </div>
  );
}

function Chip({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: "gray" | "green" | "red" | "yellow" | "cyan";
}) {
  const map = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-rose-100 text-rose-700",
    yellow: "bg-amber-100 text-amber-700",
    cyan: "bg-cyan-100 text-cyan-700",
  } as const;
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs ${map[tone]}`}>
      {children}
    </span>
  );
}

/* ---------- Drinks Admin ---------- */
function DrinksAdmin() {
  const [rows, setRows] = useState<DrinkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("drinks")
      .select("id,name,price_php,is_active")
      .order("name");
    setRows((data || []) as DrinkRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveDrink(d: DrinkRow) {
    const { error } = await supabase
      .from("drinks")
      .update({
        name: d.name,
        price_php: d.price_php,
        is_active: d.is_active,
      })
      .eq("id", d.id);
    if (error) alert(error.message);
    else load();
  }

  const filtered = rows.filter((r) =>
    r.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle>Base Drinks</SectionTitle>
        <input
          className="w-56 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
          placeholder="Search drinks…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-500">No drinks found.</div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {filtered.map((d, idx) => (
            <div
              key={d.id}
              className="grid grid-cols-6 items-center gap-2 rounded-xl border p-3 bg-gray-50"
            >
              <input
                className="col-span-3 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
                value={d.name}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((x, i) =>
                      i === idx ? { ...x, name: e.target.value } : x
                    )
                  )
                }
              />
              <div className="col-span-2 flex items-center gap-1">
                <span className="text-xs text-gray-500">₱</span>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
                  value={d.price_php}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((x, i) =>
                        i === idx
                          ? {
                              ...x,
                              price_php: Number(e.target.value || 0),
                            }
                          : x
                      )
                    )
                  }
                  type="number"
                />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={d.is_active}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((x, i) =>
                        i === idx ? { ...x, is_active: e.target.checked } : x
                      )
                    )
                  }
                />
                Active
              </label>
              <div className="col-span-6 flex justify-end">
                <button
                  onClick={() => saveDrink(d)}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- Main Admin Page ---------- */
export default function AdminPage() {
  const [ings, setIngs] = useState<IngredientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const active = useMemo(() => ings.filter((i) => i.is_active), [ings]);
  const inactive = useMemo(() => ings.filter((i) => !i.is_active), [ings]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ingredients")
      .select("*, ingredient_nutrition(*)")
      .order("name");
    setLoading(false);
    if (error) return alert(error.message);
    setIngs((data || []) as IngredientRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(id: string, next: boolean) {
    const { error } = await supabase
      .from("ingredients")
      .update({ is_active: next })
      .eq("id", id);
    if (error) return alert(error.message);
    load();
  }

  const list = (showInactive ? inactive : active).filter((i) =>
    i.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="sticky top-0 z-10 -mx-4 border-b bg-white/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            <input
              className="w-56 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
              placeholder="Search ingredients…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Show inactive
            </label>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-2">
          <SectionTitle>
            {showInactive ? "Inactive Ingredients" : "Active Ingredients"}
          </SectionTitle>
          {loading && <span className="text-xs text-gray-500">Loading…</span>}
          <Chip tone="gray">{list.length}</Chip>
        </div>

        {list.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-sm text-gray-500">
            {showInactive
              ? "No inactive ingredients."
              : "No active ingredients."}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((ing) => (
              <IngredientCard
                key={ing.id}
                ing={ing}
                onToggleActive={toggleActive}
                reload={load}
              />
            ))}
          </div>
        )}
      </section>

      <DrinksAdmin />
    </div>
  );
}
