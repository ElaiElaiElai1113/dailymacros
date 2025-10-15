import { useMemo, useState } from "react";
import PricingEditor from "@/components/PricingEditor";

export type IngredientRow = {
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

function fmt(n?: number | null, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const v = Number(n);
  return Math.abs(v) >= 1000 ? Math.round(v).toString() : v.toFixed(digits);
}

export default function IngredientCard({
  ing,
  onToggleActive,
  reload,
}: {
  ing: IngredientRow;
  onToggleActive: (id: string, next: boolean) => void;
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);

  const labels = useMemo(
    () => ({
      unit: ing.unit_default,
      gpu:
        ing.grams_per_unit != null
          ? `${fmt(ing.grams_per_unit, 0)} g / ${ing.unit_default}`
          : null,
      density:
        ing.density_g_per_ml != null
          ? `${fmt(ing.density_g_per_ml, 2)} g/ml`
          : null,
      allergens:
        ing.allergen_tags && ing.allergen_tags.length
          ? ing.allergen_tags.join(", ")
          : null,
    }),
    [ing]
  );

  const n = ing.ingredient_nutrition;

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start justify-between gap-3 p-4"
      >
        <div className="text-left">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{ing.name}</h3>
            {!ing.is_active && (
              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                Inactive
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-gray-500">
            {ing.category} • unit {labels.unit}
            {labels.gpu ? ` • ${labels.gpu}` : ""}
            {labels.density ? ` • ${labels.density}` : ""}
            {labels.allergens ? (
              <span className="text-rose-600">
                {" "}
                • allergens: {labels.allergens}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(ing.id, !ing.is_active);
            }}
            className={`rounded-lg border px-2.5 py-1 text-xs ${
              ing.is_active
                ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            {ing.is_active ? "Deactivate" : "Activate"}
          </button>
          <Chevron open={open} />
        </div>
      </button>

      {/* Collapsible content */}
      {open && (
        <div className="px-4 pb-4">
          {/* Nutrition */}
          <div className="rounded-lg border bg-gray-50/50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">
              Per 100g (Dietitian)
            </div>
            {n ? (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[13px] text-gray-800">
                <Chip label="kcal" value={fmt(n.per_100g_energy_kcal, 0)} />
                <Chip label="Protein g" value={fmt(n.per_100g_protein_g, 1)} />
                <Chip label="Fat g" value={fmt(n.per_100g_fat_g, 1)} />
                <Chip label="Carbs g" value={fmt(n.per_100g_carbs_g, 1)} />
                <Chip label="Sugars g" value={fmt(n.per_100g_sugars_g, 1)} />
                <Chip label="Fiber g" value={fmt(n.per_100g_fiber_g, 1)} />
                <Chip label="Sodium mg" value={fmt(n.per_100g_sodium_mg, 0)} />
              </div>
            ) : (
              <div className="mt-2 text-sm text-amber-700">
                Nutrition not set yet — add per-100g values below.
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="mt-3">
            <PricingEditor ingredientId={ing.id} onSaved={reload} />
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-white px-2 py-1.5">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-5 w-5 text-gray-500 transition-transform ${
        open ? "rotate-180" : ""
      }`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.17l3.71-2.94a.75.75 0 111.04 1.08l-4.24 3.36a.75.75 0 01-.94 0L5.21 8.31a.75.75 0 01.02-1.1z"
        clipRule="evenodd"
      />
    </svg>
  );
}
