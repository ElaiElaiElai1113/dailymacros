import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import IngredientCard from "@/components/IngredientCard";
import { logAudit } from "@/utils/audit";
import { toast } from "@/hooks/use-toast";
import { Search } from "lucide-react";

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
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation error",
        description: "Name is required.",
      });
      return;
    }
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
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to create add-on",
        description: error.message,
      });
      return;
    }
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

    // Show success message
    toast({
      title: "Add-on created",
      description: `${name.trim()} has been added successfully.`,
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
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to load add-ons",
        description: error.message,
      });
      return;
    }
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
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to update add-on",
        description: error.message,
      });
      return;
    }
    await logAudit({
      action: next ? "ingredient.activated" : "ingredient.deactivated",
      entity_type: "ingredient",
      entity_id: id,
      metadata: { is_addon: true },
    });
    toast({
      title: "Add-on updated",
      description: next ? "Add-on has been activated" : "Add-on has been deactivated",
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
    <div className="space-y-8">
      {/* Header with search and filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add-ons</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Manage add-on inventory, pricing, and availability
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              className="w-80 rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30 focus:border-[#D26E3D]"
              placeholder="Search add-ons…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm rounded-lg border border-gray-200 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-[#D26E3D] focus:ring-[#D26E3D]"
            />
            <span className="text-gray-700">Show inactive</span>
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">Total</div>
          <div className="mt-1.5 text-2xl font-bold text-gray-900">{ings.length}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="text-[11px] uppercase tracking-wide text-emerald-700 font-medium">Active</div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-700">{ings.filter((i) => i.is_active).length}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">Inactive</div>
          <div className="mt-1.5 text-2xl font-bold text-gray-700">{ings.filter((i) => !i.is_active).length}</div>
        </div>
      </div>

      <NewAddonForm onSaved={load} />

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
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
