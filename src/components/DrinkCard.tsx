import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Ingredient, IngredientNutrition, LineIngredient } from "@/types";
import { totalsFor } from "@/utils/nutrition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type DrinkRecord = {
  id: string;
  name: string;
  description: string | null;
  base_size_ml: number | null;
  price_cents: number;
  is_active: boolean;
  image_url?: string | null;
};

export default function DrinkCard({
  drink,
  lines,
  ingDict,
  nutrDict,
  sizeOptions,
  onAdd,
  onOpen,
}: {
  drink: DrinkRecord;
  lines: LineIngredient[];
  ingDict: Record<string, Ingredient>;
  nutrDict: Record<string, IngredientNutrition>;
  sizeOptions?: Array<{ label: string; price_cents?: number | null }>;
  onAdd: () => void;
  onOpen: () => void;
}) {
  const { totals } = useMemo(
    () => totalsFor(lines, ingDict, nutrDict),
    [lines, ingDict, nutrDict]
  );

  return (
    <Card
      className="group relative overflow-hidden border-transparent bg-white/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(226,188,120,0.35),_transparent_55%)]" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/70 to-transparent" />

      <CardContent className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-base font-semibold">{drink.name}</div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {drink.description || "Signature protein blend."}
            </p>
            {drink.base_size_ml ? (
              <div className="text-xs text-muted-foreground">
                {Math.round(drink.base_size_ml / 29.5735 * 10) / 10} oz base size
              </div>
            ) : null}
            {sizeOptions && sizeOptions.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Sizes:{" "}
                {sizeOptions
                  .map((s) =>
                    typeof s.price_cents === "number"
                      ? `${s.label} ₱${(s.price_cents / 100).toFixed(2)}`
                      : s.label
                  )
                  .join(" • ")}
              </div>
            )}
          </div>
          <Badge variant="glow" className="text-xs">
            PHP {(drink.price_cents / 100).toFixed(2)}
          </Badge>
        </div>

        <div className="mt-4 aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-white">
          {drink.image_url ? (
            <img
              src={drink.image_url}
              alt={drink.name}
              loading="lazy"
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#FFE7C5] via-white to-[#D7EFEA]" />
          )}
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
          <CardStat
            label="Kcal"
            value={
              Number.isFinite(totals.energy_kcal)
                ? Math.round(totals.energy_kcal).toString()
                : "--"
            }
          />
          <CardStat
            label="Protein"
            value={
              Number.isFinite(totals.protein_g) ? `${totals.protein_g}g` : "--"
            }
          />
          <CardStat
            label="Carbs"
            value={Number.isFinite(totals.carbs_g) ? `${totals.carbs_g}g` : "--"}
          />
          <CardStat
            label="Fat"
            value={Number.isFinite(totals.fat_g) ? `${totals.fat_g}g` : "--"}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            disabled={lines.length === 0}
            title={lines.length === 0 ? "No recipe lines found" : "Add to cart"}
          >
            Add to Cart
          </Button>
          <Button
            asChild
            variant="secondary"
            onClick={(e) => e.stopPropagation()}
          >
            <Link to="/build">Customize</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/70 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}
