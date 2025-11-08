import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Ingredient, IngredientNutrition, LineIngredient } from "@/types";
import { totalsFor } from "@/utils/nutrition";

export type DrinkRecord = {
  id: string;
  name: string;
  description: string | null;
  base_size_ml: number | null;
  price_cents: number;
  is_active: boolean;
  image_url?: string | null; // 👈 allow image
};

export default function DrinkCard({
  drink,
  lines,
  ingDict,
  nutrDict,
  onAdd,
  onOpen,
}: {
  drink: DrinkRecord;
  lines: LineIngredient[];
  ingDict: Record<string, Ingredient>;
  nutrDict: Record<string, IngredientNutrition>;
  onAdd: () => void;
  onOpen: () => void;
}) {
  const { totals } = useMemo(
    () => totalsFor(lines, ingDict, nutrDict),
    [lines, ingDict, nutrDict]
  );

  return (
    <div
      className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md cursor-pointer"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
    >
      {/* IMAGE / HERO */}
      <div className="h-40 w-full rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
        {drink.image_url ? (
          <img
            src={drink.image_url}
            alt={drink.name}
            className="max-h-full max-w-full object-contain transition group-hover:scale-[1.01]"
          />
        ) : (
          <div
            className="h-full w-full rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(89,145,144,0.15), rgba(210,110,61,0.15))",
            }}
          />
        )}
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{drink.name}</div>
          <div className="text-sm text-gray-600 line-clamp-2">
            {drink.description || "Signature protein smoothie."}
          </div>
          {drink.base_size_ml ? (
            <div className="mt-1 text-xs text-gray-500">
              {drink.base_size_ml} ml base size
            </div>
          ) : null}
        </div>

        <div
          className="shrink-0 rounded-lg px-2.5 py-1 text-white text-xs font-medium"
          style={{ background: "#599190" }}
        >
          ₱{(drink.price_cents / 100).toFixed(2)}
        </div>
      </div>

      {/* Macro teaser */}
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
        <CardStat
          label="Kcal"
          value={
            Number.isFinite(totals.energy_kcal)
              ? Math.round(totals.energy_kcal).toString()
              : "—"
          }
        />
        <CardStat
          label="Protein"
          value={
            Number.isFinite(totals.protein_g) ? `${totals.protein_g}g` : "—"
          }
        />
        <CardStat
          label="Carbs"
          value={Number.isFinite(totals.carbs_g) ? `${totals.carbs_g}g` : "—"}
        />
        <CardStat
          label="Fat"
          value={Number.isFinite(totals.fat_g) ? `${totals.fat_g}g` : "—"}
        />
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          style={{ background: "#D26E3D" }}
          disabled={lines.length === 0}
          title={lines.length === 0 ? "No recipe lines found" : "Add to cart"}
        >
          Add to Cart
        </button>

        <Link
          to="/build"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Customize
        </Link>
      </div>
    </div>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white py-2">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}
