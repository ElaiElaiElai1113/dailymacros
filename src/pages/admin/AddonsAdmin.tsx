import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import IngredientCard from "@/components/IngredientCard";
import { logAudit } from "@/utils/audit";

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

/* Create new add-on (always is_addon=true) */
function NewAddonForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("addon");
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
      is_addon: true,
    });
    setSaving(false);
    if (error) return alert(error.message);
    await logAudit({
      action: "ingredient.created",
      entity_type: "ingredient",
      entity_id: null,
      metadata: {
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
        is_addon: true,
      },
    });
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
          {saving ? "Saving…" : "Save Add-on"}
        </button>
      </div>
    </div>
  );
}

export default function AddonsAdminPage() {
  const [ings, setIngs] = useState<IngredientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ingredients")
      .select(
        "*, ingredient_nutrition_base(per_100g_energy_kcal,per_100g_protein_g,per_100g_fat_g,per_100g_carbs_g,per_100g_sugars_g,per_100g_fiber_g,per_100g_sodium_mg)"
      )
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
    await logAudit({
      action: next ? "ingredient.activated" : "ingredient.deactivated",
      entity_type: "ingredient",
      entity_id: id,
      metadata: { is_addon: true },
    });
    load();
  }

  const base = showInactive
    ? ings.filter((i) => !i.is_active)
    : ings.filter((i) => i.is_active);
  const list = useMemo(
    () => base.filter((i) => i.name.toLowerCase().includes(q.toLowerCase())),
    [base, q]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">Add-ons Admin</h1>
        <div className="flex items-center gap-3">
          <input
            className="w-72 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
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

      <NewAddonForm onSaved={load} />

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <SectionTitle>
          {showInactive ? "Inactive" : "Active"} Add-ons
        </SectionTitle>
        {loading ? (
          <div className="mt-3 text-sm text-gray-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="mt-3 text-sm text-gray-500">
            {showInactive ? "No inactive add-ons." : "No active add-ons."}
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
