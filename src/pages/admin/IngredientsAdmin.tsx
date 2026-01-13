import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import IngredientCard from "@/components/IngredientCard";

/* Helpers */
const numberOrNull = (v: string) => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/* Types */
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
  ingredient_nutrition_base?: {
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm font-semibold tracking-tight text-gray-800">
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "gray",
}: {
  label: string;
  value: string | number;
  tone?: "gray" | "green" | "amber";
}) {
  const toneMap = {
    gray: "bg-gray-50 text-gray-700 border-gray-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  } as const;
  return (
    <div className={`rounded-xl border px-3 py-2 text-xs ${toneMap[tone]}`}>
      <div className="text-[11px] uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-[#D26E3D]/40 bg-[#D26E3D]/10 text-[#9A4F2C]"
          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

/* Create new ingredient (always is_addon=false) */
function NewIngredientForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("base");
  const [unitDefault, setUnitDefault] = useState<
    "g" | "ml" | "scoop" | "piece"
  >("g");
  const [gramsPerUnit, setGramsPerUnit] = useState("");
  const [density, setDensity] = useState("");
  const [allergens, setAllergens] = useState("");
  const [saving, setSaving] = useState(false);

  const needsGramsPerUnit = unitDefault === "scoop" || unitDefault === "piece";
  const needsDensity = unitDefault === "ml";

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
      is_addon: false,
    });
    setSaving(false);
    if (error) return alert(error.message);
    setName("");
    setCategory("base");
    setUnitDefault("g");
    setGramsPerUnit("");
    setDensity("");
    setAllergens("");
    onSaved();
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <SectionTitle>New ingredient</SectionTitle>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-xs text-gray-600">Name</div>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <div className="text-xs text-gray-600">Category</div>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="base">base</option>
            <option value="protein">protein</option>
            <option value="sweetener">sweetener</option>
            <option value="topping">topping</option>
            <option value="other">other</option>
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-xs text-gray-600">Default Unit</div>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
            value={unitDefault}
            onChange={(e) => setUnitDefault(e.target.value as any)}
          >
            <option value="g">g</option>
            <option value="ml">ml</option>
            <option value="scoop">scoop</option>
            <option value="piece">piece</option>
          </select>
          <p className="text-[11px] text-gray-500">
            If unit is <b>ml</b>, set density (g/ml). If <b>scoop</b>/
            <b>piece</b>, set grams per unit.
          </p>
        </label>

        {needsGramsPerUnit && (
          <label className="space-y-1">
            <div className="text-xs text-gray-600">Grams per unit</div>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
              type="number"
              value={gramsPerUnit}
              onChange={(e) => setGramsPerUnit(e.target.value)}
              placeholder="e.g. 30"
            />
          </label>
        )}
        {needsDensity && (
          <label className="space-y-1">
            <div className="text-xs text-gray-600">Density g/ml</div>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
              type="number"
              value={density}
              onChange={(e) => setDensity(e.target.value)}
              placeholder="e.g. 1.02"
            />
          </label>
        )}
        <label className="space-y-1 md:col-span-2">
          <div className="text-xs text-gray-600">
            Allergens (comma-separated)
          </div>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
            value={allergens}
            onChange={(e) => setAllergens(e.target.value)}
            placeholder="milk,nuts,soy"
          />
        </label>
      </div>

      <div className="mt-4">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Ingredient"}
        </button>
      </div>
    </div>
  );
}

export default function IngredientsAdminPage() {
  const [ings, setIngs] = useState<IngredientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [category, setCategory] = useState<string>("all");
  const [missingOnly, setMissingOnly] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ingredients")
      .select(
        "*, ingredient_nutrition_base(per_100g_energy_kcal,per_100g_protein_g,per_100g_fat_g,per_100g_carbs_g,per_100g_sugars_g,per_100g_fiber_g,per_100g_sodium_mg)"
      )
      .eq("is_addon", false)
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

  const base = showInactive
    ? ings.filter((i) => !i.is_active)
    : ings.filter((i) => i.is_active);
  const categories = useMemo(() => {
    const set = new Set<string>();
    ings.forEach((i) => set.add(i.category));
    return Array.from(set).sort();
  }, [ings]);
  const list = useMemo(() => {
    const term = q.toLowerCase();
    return base.filter((i) => {
      if (category !== "all" && i.category !== category) return false;
      if (missingOnly && !!i.ingredient_nutrition_base) return false;
      return (
        i.name.toLowerCase().includes(term) ||
        i.category.toLowerCase().includes(term)
      );
    });
  }, [base, q, category, missingOnly]);

  const activeCount = ings.filter((i) => i.is_active).length;
  const inactiveCount = ings.filter((i) => !i.is_active).length;
  const missingNutritionCount = ings.filter(
    (i) => !i.ingredient_nutrition_base
  ).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-gray-900">Ingredients</h1>
            <p className="text-sm text-gray-600">
              Keep your nutrition data clean and consistent. Edit macros per
              ingredient and deactivate out-of-stock items.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                className="w-72 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
                placeholder="Search name or category…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Show inactive
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={missingOnly}
                onChange={(e) => setMissingOnly(e.target.checked)}
              />
              Missing nutrition
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Active" value={activeCount} tone="green" />
          <Stat label="Inactive" value={inactiveCount} />
          <Stat label="Missing nutrition" value={missingNutritionCount} tone="amber" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">
            Categories
          </span>
          <Chip active={category === "all"} onClick={() => setCategory("all")}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c}
              active={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </Chip>
          ))}
        </div>
      </div>

      <NewIngredientForm onSaved={load} />

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <SectionTitle>
          {showInactive ? "Inactive" : "Active"} ingredients
        </SectionTitle>
        {loading ? (
          <div className="mt-3 text-sm text-gray-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="mt-3 text-sm text-gray-500">
            {showInactive ? "No inactive ingredients." : "No active ingredients."}
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((ing) => (
              <IngredientCard
                key={ing.id}
                ing={ing as any}
                onToggleActive={toggleActive}
                reload={load}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
