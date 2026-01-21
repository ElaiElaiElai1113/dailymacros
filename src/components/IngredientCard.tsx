import { useMemo, useState } from "react";
import PricingEditor from "@/components/PricingEditor";
import NutritionEditor from "@/components/NutritionEditor";
import { supabase } from "@/lib/supabaseClient";
import { logAudit } from "@/utils/audit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type IngredientCardRow = {
  id: string;
  name: string;
  category: string;
  unit_default: "g" | "ml" | "scoop" | "piece";
  grams_per_unit: number | null;
  density_g_per_ml: number | null;
  allergen_tags: string[] | null;
  is_active: boolean;
  is_addon?: boolean;
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

export default function IngredientCard({
  ing,
  onToggleActive,
  reload,
}: {
  ing: IngredientCardRow;
  onToggleActive: (id: string, next: boolean) => void;
  reload: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: ing.name ?? "",
    category: ing.category ?? "",
    unit_default: ing.unit_default ?? "g",
    grams_per_unit: ing.grams_per_unit?.toString() ?? "",
    density_g_per_ml: ing.density_g_per_ml?.toString() ?? "",
    allergen_tags: ing.allergen_tags?.join(", ") ?? "",
  });

  const needsGramsPerUnit =
    form.unit_default === "scoop" || form.unit_default === "piece";
  const needsDensity = form.unit_default === "ml";

  const r = (n?: number | null) =>
    typeof n === "number" && Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;

  const nut = ing.ingredient_nutrition_base || ing.ingredient_nutrition;

  const metaChips = useMemo(() => {
    const chips: React.ReactNode[] = [];
    chips.push(
      <Chip key="cat" tone="cyan">
        {ing.category}
      </Chip>
    );
    chips.push(<Chip key="unit">{ing.unit_default}</Chip>);
    if (ing.grams_per_unit)
      chips.push(<Chip key="gpu">{r(ing.grams_per_unit)} g/unit</Chip>);
    if (ing.density_g_per_ml)
      chips.push(<Chip key="dens">{r(ing.density_g_per_ml)} g/ml</Chip>);
    if (ing.allergen_tags?.length)
      chips.push(
        <Chip key="all" tone="red">
          allergens: {ing.allergen_tags.join(", ")}
        </Chip>
      );
    return chips;
  }, [ing]);

  const numberOrNull = (v: string) => {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  async function saveBasics() {
    if (!form.name.trim()) return alert("Name is required.");
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      unit_default: form.unit_default,
      grams_per_unit: needsGramsPerUnit
        ? numberOrNull(form.grams_per_unit)
        : null,
      density_g_per_ml: needsDensity
        ? numberOrNull(form.density_g_per_ml)
        : null,
      allergen_tags: form.allergen_tags
        ? form.allergen_tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    };
    setSaving(true);
    const { error } = await supabase
      .from("ingredients")
      .update(payload)
      .eq("id", ing.id);
    setSaving(false);
    if (error) return alert(error.message);
    await logAudit({
      action: "ingredient.updated",
      entity_type: "ingredient",
      entity_id: ing.id,
      metadata: { ...payload, is_addon: ing.is_addon ?? false },
    });
    reload();
  }

  return (
    <div className="rounded-2xl border bg-white shadow-sm transition hover:shadow-md">
      <div className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-gray-800">
            {ing.name}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {metaChips}
            <Chip tone={ing.is_active ? "green" : "yellow"}>
              {ing.is_active ? "active" : "inactive"}
            </Chip>
          </div>
          {nut ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
              <span className="rounded-full border bg-white px-3 py-1">
                {r(nut.per_100g_energy_kcal)} kcal
              </span>
              <span className="rounded-full border bg-white px-3 py-1">
                P: {r(nut.per_100g_protein_g)} g
              </span>
              <span className="rounded-full border bg-white px-3 py-1">
                C: {r(nut.per_100g_carbs_g)} g
              </span>
              <span className="rounded-full border bg-white px-3 py-1">
                F: {r(nut.per_100g_fat_g)} g
              </span>
            </div>
          ) : (
            <div className="mt-3 text-xs text-amber-700">
              Nutrition missing — open details to add per-100g values.
            </div>
          )}
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <button className="shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50">
              View details
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{ing.name}</DialogTitle>
              <DialogDescription>
                Edit nutrition, pricing, and inventory details for this
                ingredient. All nutrition values are per 100 g.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
              <div className="space-y-6">
                <section className="rounded-2xl border bg-white p-4">
                  <div className="text-sm font-semibold text-gray-800">
                    Basics
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    These values control how the ingredient appears in menus and
                    how quantity conversions are computed.
                  </div>
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <label className="space-y-1">
                      <div className="text-[11px] text-gray-500">Name</div>
                      <input
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
                        value={form.name}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, name: e.target.value }))
                        }
                      />
                      <div className="text-[11px] text-gray-400">
                        Use clear, customer-facing names.
                      </div>
                    </label>
                    <label className="space-y-1">
                      <div className="text-[11px] text-gray-500">Category</div>
                      <input
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
                        value={form.category}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, category: e.target.value }))
                        }
                        placeholder="e.g. base, protein, topping"
                      />
                      <div className="text-[11px] text-gray-400">
                        Used for filters and organization.
                      </div>
                    </label>
                    <label className="space-y-1">
                      <div className="text-[11px] text-gray-500">
                        Default unit
                      </div>
                      <select
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
                        value={form.unit_default}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            unit_default: e.target.value as any,
                          }))
                        }
                      >
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="scoop">scoop</option>
                        <option value="piece">piece</option>
                      </select>
                      <div className="text-[11px] text-gray-400">
                        Controls unit defaults in selectors.
                      </div>
                    </label>
                    <label className="space-y-1">
                      <div className="text-[11px] text-gray-500">
                        Grams per unit
                      </div>
                      <input
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
                        type="number"
                        value={form.grams_per_unit}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            grams_per_unit: e.target.value,
                          }))
                        }
                        placeholder="e.g. 30"
                        disabled={!needsGramsPerUnit}
                      />
                      <div className="text-[11px] text-gray-400">
                        Required for scoop/piece conversions.
                      </div>
                    </label>
                    <label className="space-y-1">
                      <div className="text-[11px] text-gray-500">
                        Density (g/ml)
                      </div>
                      <input
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
                        type="number"
                        value={form.density_g_per_ml}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            density_g_per_ml: e.target.value,
                          }))
                        }
                        placeholder="e.g. 1.02"
                        disabled={!needsDensity}
                      />
                      <div className="text-[11px] text-gray-400">
                        Required for ml conversions.
                      </div>
                    </label>
                    <label className="space-y-1 sm:col-span-2">
                      <div className="text-[11px] text-gray-500">Allergens</div>
                      <input
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
                        value={form.allergen_tags}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            allergen_tags: e.target.value,
                          }))
                        }
                        placeholder="milk,nuts,soy"
                      />
                      <div className="text-[11px] text-gray-400">
                        Comma-separated list for warnings in checkout.
                      </div>
                    </label>
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      onClick={saveBasics}
                      disabled={saving}
                      className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save basics"}
                    </button>
                  </div>
                </section>

                <section className="rounded-2xl border bg-white p-4">
                  <div className="text-sm font-semibold text-gray-800">
                    Nutrition (per 100 g)
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Enter nutrition values in grams or mg per 100 g of
                    ingredient. Leave blank to store null.
                  </div>
                  <div className="mt-3">
                    <NutritionEditor ingredientId={ing.id} onSaved={reload} />
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="rounded-2xl border bg-white p-4">
                  <div className="text-sm font-semibold text-gray-800">
                    Pricing
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Choose a pricing mode and set the peso value that should be
                    used when customers add this ingredient.
                  </div>
                  <div className="mt-3">
                    <PricingEditor ingredientId={ing.id} />
                  </div>
                </section>

                <section className="rounded-2xl border bg-white p-4">
                  <div className="text-sm font-semibold text-gray-800">
                    Availability
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Deactivate to hide this ingredient from selectors and
                    build-your-own flows.
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={() => onToggleActive(ing.id, !ing.is_active)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        ing.is_active
                          ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      {ing.is_active ? "Deactivate ingredient" : "Activate ingredient"}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
