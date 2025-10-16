// src/pages/AdminPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import IngredientCard from "@/components/IngredientCard";

/* ---------- tiny helpers ---------- */
function numberOrNull(v: string) {
  const x = v.trim();
  if (!x) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

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
  is_addon: boolean;
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

function Field({
  label,
  value,
  setValue,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string | number;
  setValue: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number";
}) {
  return (
    <label className="space-y-1">
      <div className="text-xs text-gray-600">{label}</div>
      <input
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

/* ---------- New Add-on form (always is_addon=true) ---------- */
function NewAddonForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("addon");
  const [unitDefault, setUnitDefault] = useState<
    "g" | "ml" | "scoop" | "piece"
  >("g");
  const [gramsPerUnit, setGramsPerUnit] = useState("");
  const [density, setDensity] = useState("");
  const [allergens, setAllergens] = useState("");

  const needsGramsPerUnit = unitDefault === "scoop" || unitDefault === "piece";
  const needsDensity = unitDefault === "ml";
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return alert("Name is required.");
    setSaving(true);

    const { error } = await supabase.from("ingredients").insert({
      name: name.trim(),
      category,
      unit_default: unitDefault,
      grams_per_unit: needsGramsPerUnit ? numberOrNull(gramsPerUnit) : null,
      density_g_per_ml: needsDensity ? numberOrNull(density) : null,
      allergen_tags: allergens
        ? allergens
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      is_active: true,
      is_addon: true, // <- enforce add-on
    });

    setSaving(false);
    if (error) return alert(error.message);

    // reset
    setName("");
    setCategory("addon");
    setUnitDefault("g");
    setGramsPerUnit("");
    setDensity("");
    setAllergens("");

    onSaved();
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <SectionTitle>Add New Add-on</SectionTitle>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Name" value={name} setValue={setName} />
        <label className="space-y-1">
          <div className="text-xs text-gray-600">Category</div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
          >
            <option value="addon">addon</option>
            <option value="protein">protein</option>
            <option value="sweetener">sweetener</option>
            <option value="topping">topping</option>
            <option value="other">other</option>
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-xs text-gray-600">Default Unit</div>
          <select
            value={unitDefault}
            onChange={(e) =>
              setUnitDefault(e.target.value as "g" | "ml" | "scoop" | "piece")
            }
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
          >
            <option value="g">g</option>
            <option value="ml">ml</option>
            <option value="scoop">scoop</option>
            <option value="piece">piece</option>
          </select>
          <p className="text-[11px] text-gray-500">
            If unit is <b>ml</b>, set density (g/ml). If <b>scoop/piece</b>, set
            grams per unit.
          </p>
        </label>

        {needsGramsPerUnit && (
          <Field
            label="Grams per unit"
            value={gramsPerUnit}
            setValue={setGramsPerUnit}
            placeholder="e.g. 30"
            type="number"
          />
        )}
        {needsDensity && (
          <Field
            label="Density g/ml"
            value={density}
            setValue={setDensity}
            placeholder="e.g. 1.02"
            type="number"
          />
        )}

        <Field
          label="Allergens (comma-separated)"
          value={allergens}
          setValue={setAllergens}
          placeholder="milk,nuts,soy"
        />
      </div>

      <div className="mt-4">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Add-on"}
        </button>
      </div>
    </div>
  );
}

/* ---------- Drinks Admin (unchanged) ---------- */
function DrinksAdmin() {
  const [rows, setRows] = useState<DrinkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("drinks")
      .select("id,name,price_php,is_active")
      .order("name");
    setLoading(false);
    if (error) return alert(error.message);
    setRows((data || []) as DrinkRow[]);
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
              className="grid grid-cols-6 items-center gap-2 rounded-xl border bg-gray-50 p-3"
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
                          ? { ...x, price_php: Number(e.target.value || 0) }
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

  // Load ONLY add-ons
  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .eq("is_addon", true)
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

  // filters
  const active = useMemo(() => ings.filter((i) => i.is_active), [ings]);
  const inactive = useMemo(() => ings.filter((i) => !i.is_active), [ings]);
  const baseList = showInactive ? inactive : active;
  const list = baseList.filter((i) =>
    i.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-4 border-b bg-white/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            <input
              className="w-56 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
              placeholder="Search add-ons…"
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

      {/* Add new add-on */}
      <NewAddonForm onSaved={load} />

      {/* Add-on grid */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <SectionTitle>
            {showInactive ? "Inactive" : "Active"} Add-ons
          </SectionTitle>
          {loading && <span className="text-xs text-gray-500">Loading…</span>}
          <Chip tone="gray">{list.length}</Chip>
        </div>

        {list.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-sm text-gray-500">
            {showInactive ? "No inactive add-ons." : "No active add-ons."}
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

      {/* Drinks admin (kept) */}
      <DrinksAdmin />
    </div>
  );
}
