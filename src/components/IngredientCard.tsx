import { useMemo, useState } from "react";
import PricingEditor from "@/components/PricingEditor";

export type IngredientCardRow = {
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
}: {
  ing: IngredientCardRow;
  onToggleActive: (id: string, next: boolean) => void;
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const r = (n?: number | null) =>
    typeof n === "number" && Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;

  const nut = ing.ingredient_nutrition;

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

  return (
    <div className="rounded-2xl border bg-white shadow-sm transition hover:shadow-md">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <div className="truncate font-semibold text-gray-800">{ing.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {metaChips}
          </div>
        </div>
        <div className="shrink-0 text-sm text-gray-500">{open ? "▲" : "▼"}</div>
      </button>

      {nut && (
        <div className="grid grid-cols-4 gap-2 px-4 pb-3 text-xs text-gray-600 sm:grid-cols-7">
          <div>Kcal: {r(nut.per_100g_energy_kcal)}</div>
          <div>P: {r(nut.per_100g_protein_g)} g</div>
          <div>F: {r(nut.per_100g_fat_g)} g</div>
          <div>C: {r(nut.per_100g_carbs_g)} g</div>
          <div>Sug: {r(nut.per_100g_sugars_g)} g</div>
          <div>Fib: {r(nut.per_100g_fiber_g)} g</div>
          <div>Na: {r(nut.per_100g_sodium_mg)} mg</div>
        </div>
      )}

      {open && (
        <div className="space-y-3 border-t bg-gray-50/60 px-4 py-3">
          {nut ? (
            <div className="text-xs text-gray-600">
              Nutrition shown is <b>per 100 g</b> and rounded for readability.
            </div>
          ) : (
            <div className="text-xs text-amber-700">
              No nutrition yet — add it in the ingredient editor if needed.
            </div>
          )}

          <PricingEditor ingredientId={ing.id} />

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-500">
              Toggle to hide from selectors & BYO.
            </span>
            <button
              onClick={() => onToggleActive(ing.id, !ing.is_active)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                ing.is_active
                  ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                  : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              {ing.is_active ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
