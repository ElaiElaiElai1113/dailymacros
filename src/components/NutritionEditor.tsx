import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { logAudit } from "@/utils/audit";
import { toast } from "@/hooks/use-toast";

type NutritionRow = {
  ingredient_id: string;
  per_100g_energy_kcal: number | null;
  per_100g_protein_g: number | null;
  per_100g_fat_g: number | null;
  per_100g_carbs_g: number | null;
  per_100g_sugars_g: number | null;
  per_100g_fiber_g: number | null;
  per_100g_sodium_mg: number | null;
};

const numberOrNull = (v: string) => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export default function NutritionEditor({
  ingredientId,
  onSaved,
}: {
  ingredientId: string;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vals, setVals] = useState({
    per_100g_energy_kcal: "",
    per_100g_protein_g: "",
    per_100g_fat_g: "",
    per_100g_carbs_g: "",
    per_100g_sugars_g: "",
    per_100g_fiber_g: "",
    per_100g_sodium_mg: "",
  });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ingredient_nutrition_base")
      .select(
        "ingredient_id,per_100g_energy_kcal,per_100g_protein_g,per_100g_fat_g,per_100g_carbs_g,per_100g_sugars_g,per_100g_fiber_g,per_100g_sodium_mg"
      )
      .eq("ingredient_id", ingredientId)
      .maybeSingle();
    setLoading(false);
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to load nutrition data",
        description: error.message,
      });
      return;
    }
    if (!data) return;
    const row = data as NutritionRow;
    setVals({
      per_100g_energy_kcal: row.per_100g_energy_kcal?.toString() ?? "",
      per_100g_protein_g: row.per_100g_protein_g?.toString() ?? "",
      per_100g_fat_g: row.per_100g_fat_g?.toString() ?? "",
      per_100g_carbs_g: row.per_100g_carbs_g?.toString() ?? "",
      per_100g_sugars_g: row.per_100g_sugars_g?.toString() ?? "",
      per_100g_fiber_g: row.per_100g_fiber_g?.toString() ?? "",
      per_100g_sodium_mg: row.per_100g_sodium_mg?.toString() ?? "",
    });
  }

  useEffect(() => {
    load();
  }, [ingredientId]);

  async function save() {
    setSaving(true);
    const payload: NutritionRow = {
      ingredient_id: ingredientId,
      per_100g_energy_kcal: numberOrNull(vals.per_100g_energy_kcal),
      per_100g_protein_g: numberOrNull(vals.per_100g_protein_g),
      per_100g_fat_g: numberOrNull(vals.per_100g_fat_g),
      per_100g_carbs_g: numberOrNull(vals.per_100g_carbs_g),
      per_100g_sugars_g: numberOrNull(vals.per_100g_sugars_g),
      per_100g_fiber_g: numberOrNull(vals.per_100g_fiber_g),
      per_100g_sodium_mg: numberOrNull(vals.per_100g_sodium_mg),
    };
    const { error } = await supabase
      .from("ingredient_nutrition_base")
      .upsert(payload, { onConflict: "ingredient_id" });
    setSaving(false);
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to save nutrition data",
        description: error.message,
      });
      return;
    }
    await logAudit({
      action: "ingredient_nutrition.upserted",
      entity_type: "ingredient",
      entity_id: ingredientId,
      metadata: payload,
    });
    onSaved?.();
  }

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-xs font-semibold text-gray-700">
        Nutrition per 100 g
      </div>
      {loading ? (
        <div className="mt-2 text-xs text-gray-500">Loading nutrition…</div>
      ) : (
        <div className="mt-2 grid gap-2 text-xs sm:grid-cols-4">
          <label className="space-y-1">
            <div className="text-[11px] text-gray-500">Energy (kcal)</div>
            <input
              className="w-full rounded-md border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
              type="number"
              value={vals.per_100g_energy_kcal}
              onChange={(e) =>
                setVals((p) => ({ ...p, per_100g_energy_kcal: e.target.value }))
              }
            />
          </label>
          <label className="space-y-1">
            <div className="text-[11px] text-gray-500">Protein (g)</div>
            <input
              className="w-full rounded-md border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
              type="number"
              value={vals.per_100g_protein_g}
              onChange={(e) =>
                setVals((p) => ({ ...p, per_100g_protein_g: e.target.value }))
              }
            />
          </label>
          <label className="space-y-1">
            <div className="text-[11px] text-gray-500">Fat (g)</div>
            <input
              className="w-full rounded-md border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
              type="number"
              value={vals.per_100g_fat_g}
              onChange={(e) =>
                setVals((p) => ({ ...p, per_100g_fat_g: e.target.value }))
              }
            />
          </label>
          <label className="space-y-1">
            <div className="text-[11px] text-gray-500">Carbs (g)</div>
            <input
              className="w-full rounded-md border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
              type="number"
              value={vals.per_100g_carbs_g}
              onChange={(e) =>
                setVals((p) => ({ ...p, per_100g_carbs_g: e.target.value }))
              }
            />
          </label>
          <label className="space-y-1">
            <div className="text-[11px] text-gray-500">Sugars (g)</div>
            <input
              className="w-full rounded-md border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
              type="number"
              value={vals.per_100g_sugars_g}
              onChange={(e) =>
                setVals((p) => ({ ...p, per_100g_sugars_g: e.target.value }))
              }
            />
          </label>
          <label className="space-y-1">
            <div className="text-[11px] text-gray-500">Fiber (g)</div>
            <input
              className="w-full rounded-md border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
              type="number"
              value={vals.per_100g_fiber_g}
              onChange={(e) =>
                setVals((p) => ({ ...p, per_100g_fiber_g: e.target.value }))
              }
            />
          </label>
          <label className="space-y-1">
            <div className="text-[11px] text-gray-500">Sodium (mg)</div>
            <input
              className="w-full rounded-md border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
              type="number"
              value={vals.per_100g_sodium_mg}
              onChange={(e) =>
                setVals((p) => ({ ...p, per_100g_sodium_mg: e.target.value }))
              }
            />
          </label>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-gray-500">
          Leave blank to store null values.
        </span>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save nutrition"}
        </button>
      </div>
    </div>
  );
}
