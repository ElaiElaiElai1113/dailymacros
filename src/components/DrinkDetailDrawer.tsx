import { useEffect, useMemo, useState } from "react";
import type { Ingredient, IngredientNutrition, LineIngredient } from "@/types";
import { totalsFor, breakdownFor } from "@/utils/nutrition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";

type Drink = {
  id: string;
  name: string;
  description: string | null;
  base_size_ml: number | null;
  price_cents: number;
  image_url?: string | null;
};

const SIZES = [
  { label: "12 oz", ml: 355 },
  { label: "16 oz", ml: 473 },
];

function scaleLines(
  lines: LineIngredient[],
  referenceMl: number | null,
  targetMl: number
): LineIngredient[] {
  if (!referenceMl || referenceMl <= 0) return lines;
  const factor = targetMl / referenceMl;
  return lines.map((l) => ({ ...l, amount: Number(l.amount) * factor }));
}

export default function DrinkDetailDrawer({
  open,
  onClose,
  drink,
  lines,
  sizeLines,
  ingDict,
  nutrDict,
  onAddToCart,
  onCustomize,
}: {
  open: boolean;
  onClose: () => void;
  drink: Drink | null;
  lines: LineIngredient[];
  sizeLines?: Record<string, LineIngredient[]>;
  ingDict: Record<string, Ingredient>;
  nutrDict: Record<string, IngredientNutrition>;
  onAddToCart: (scaledLines?: LineIngredient[]) => void;
  onCustomize: () => void;
}) {
  if (!drink) return null;

  const [sizeMl, setSizeMl] = useState<number>(
    () => drink?.base_size_ml ?? 473
  );

  useEffect(() => {
    if (drink?.base_size_ml) setSizeMl(drink.base_size_ml);
  }, [drink?.id, drink?.base_size_ml]);

  const scaledLines = useMemo(
    () => scaleLines(lines, drink?.base_size_ml ?? null, sizeMl),
    [lines, drink?.base_size_ml, sizeMl]
  );

  const sizeLinesForSelection = useMemo(
    () => sizeLines?.[String(sizeMl)] ?? [],
    [sizeLines, sizeMl]
  );

  const effectiveLines =
    sizeLinesForSelection.length > 0 ? sizeLinesForSelection : scaledLines;

  const { totals } = useMemo(
    () => totalsFor(effectiveLines, ingDict, nutrDict),
    [effectiveLines, ingDict, nutrDict]
  );

  const breakdown = useMemo(
    () => breakdownFor(effectiveLines, ingDict, nutrDict),
    [effectiveLines, ingDict, nutrDict]
  );

  const showUnknown =
    !Number.isFinite(totals.energy_kcal) || totals.energy_kcal <= 0;

  const activeDrink = drink;
  if (!activeDrink) return null;

  function handleAddToCart() {
    onAddToCart(effectiveLines);
  }

  async function handleShareOrPrint() {
    const price = `PHP ${(activeDrink.price_cents / 100).toFixed(2)}`;
    const ingList = effectiveLines
      .map(
        (l) =>
          `${ingDict[l.ingredient_id]?.name || "Ingredient"} - ${l.amount.toFixed(
            1
          )} ${l.unit}`
      )
      .join("\n");

    const summary = `DailyMacros - ${activeDrink.name}
Size: ${sizeMl} ml - Price: ${price}

Ingredients:
${ingList}

Nutrition (est.):
- Energy: ${Math.round(totals.energy_kcal)} kcal
- Protein: ${totals.protein_g} g
- Carbs: ${totals.carbs_g} g
- Fat: ${totals.fat_g} g`;

    if (navigator.share && navigator.canShare?.({ text: summary })) {
      try {
        await navigator.share({
          title: `${activeDrink.name} - Nutrition`,
          text: summary,
        });
        return;
      } catch {
        /* noop */
      }
    }

    const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(activeDrink.name)} - Nutrition Label</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; margin: 24px; }
  .card { width: 360px; border: 1px solid #ddd; border-radius: 12px; padding: 16px; }
  .title { font-weight: 700; font-size: 16px; }
  .muted { color: #666; font-size: 12px; margin-top: 2px; }
  .section { margin-top: 12px; }
  ul { padding-left: 18px; margin: 6px 0; }
  li { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 13px; }
  .right { text-align: right; }
  .footer { margin-top: 12px; font-size: 11px; color: #777; }
  @media print { body { margin: 0; } .card { border: none; } }
</style>
</head>
<body>
  <div class="card">
    <div class="title">DailyMacros - ${escapeHtml(activeDrink.name)}</div>
    <div class="muted">Size: ${sizeMl} ml - Price: ${price}</div>

    <div class="section">
      <strong>Ingredients</strong>
      <ul>
        ${scaledLines
          .map(
            (l) =>
              `<li>${escapeHtml(
                ingDict[l.ingredient_id]?.name || "Ingredient"
              )} - ${l.amount.toFixed(1)} ${l.unit}</li>`
          )
          .join("")}
      </ul>
    </div>

    <div class="section">
      <strong>Estimated Nutrition</strong>
      <table>
        <tr><td>Energy</td><td class="right">${Math.round(
          totals.energy_kcal
        )} kcal</td></tr>
        <tr><td>Protein</td><td class="right">${totals.protein_g} g</td></tr>
        <tr><td>Carbs</td><td class="right">${totals.carbs_g} g</td></tr>
        <tr><td>Fat</td><td class="right">${totals.fat_g} g</td></tr>
      </table>
    </div>

    <div class="footer">Nutrition estimates are computed from ingredient-level data.</div>
  </div>
  <script>window.print();</script>
</body>
</html>`;
    const w = window.open("", "_blank", "width=420,height=720");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-muted" />
        <SheetHeader className="mt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle>{activeDrink.name}</SheetTitle>
              <SheetDescription>
                {activeDrink.description || "Signature protein blend."}
              </SheetDescription>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {activeDrink.base_size_ml ? (
                  <Badge variant="secondary">
                    Base {activeDrink.base_size_ml} ml
                  </Badge>
                ) : null}
                <Badge variant="glow">
                  PHP {(activeDrink.price_cents / 100).toFixed(2)}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="aspect-[16/10] w-full overflow-hidden rounded-3xl border bg-white">
              {activeDrink.image_url ? (
                <img
                  src={activeDrink.image_url}
                  alt={activeDrink.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[#FFE7C5] via-white to-[#D7EFEA]" />
              )}
            </div>

            <Card>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-semibold">Choose size</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SIZES.map((s) => (
                      <Button
                        key={s.ml}
                        variant={sizeMl === s.ml ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSizeMl(s.ml)}
                      >
                        {s.label}
                      </Button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {sizeLinesForSelection.length > 0
                      ? "Uses the saved recipe for this size."
                      : `Scales from base size ${activeDrink.base_size_ml ?? "default"} ml.`}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleAddToCart}>
                    Add to Cart
                  </Button>
                  <Button variant="secondary" onClick={onCustomize}>
                    Customize
                  </Button>
                  <Button variant="outline" onClick={handleShareOrPrint}>
                    Share / Print
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="text-sm font-semibold">
                  Estimated Nutrition ({sizeMl} ml)
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                  <Stat
                    label="Kcal"
                    value={
                      showUnknown
                        ? "--"
                        : Math.round(totals.energy_kcal).toString()
                    }
                  />
                  <Stat
                    label="Protein"
                    value={showUnknown ? "--" : `${totals.protein_g}g`}
                  />
                  <Stat
                    label="Carbs"
                    value={showUnknown ? "--" : `${totals.carbs_g}g`}
                  />
                  <Stat
                    label="Fat"
                    value={showUnknown ? "--" : `${totals.fat_g}g`}
                  />
                </div>
                {showUnknown && (
                  <div className="mt-2 text-[11px] text-amber-600">
                    Nutrition data missing for one or more ingredients.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardContent>
                <div className="text-sm font-semibold">Ingredients</div>
                {effectiveLines.length === 0 ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    No recipe lines found.
                  </div>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {effectiveLines.map((l, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate">
                          {ingDict[l.ingredient_id]?.name || "Ingredient"}
                        </span>
                        <span className="text-muted-foreground">
                          {l.amount.toFixed(
                            l.unit === "scoop" || l.unit === "piece" ? 2 : 1
                          )}{" "}
                          {l.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="text-sm font-semibold">Explain my math</div>
                {breakdown.length === 0 ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Nothing to show.
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {breakdown.map((b) => (
                      <div
                        key={b.ingredient_id}
                        className="rounded-2xl border p-3 text-xs"
                      >
                        <div className="mb-1 font-medium">{b.name}</div>
                        <div className="text-muted-foreground">
                          Input: {b.input.amount} {b.input.unit} - {b.grams_used} g
                        </div>
                        <div className="mt-2 grid grid-cols-5 gap-2 text-center">
                          <SmallStat
                            label="Kcal"
                            value={b.contrib.energy_kcal.toFixed(0)}
                          />
                          <SmallStat
                            label="Prot"
                            value={b.contrib.protein_g.toFixed(1)}
                          />
                          <SmallStat
                            label="Carbs"
                            value={b.contrib.carbs_g.toFixed(1)}
                          />
                          <SmallStat
                            label="Fat"
                            value={b.contrib.fat_g.toFixed(1)}
                          />
                          <SmallStat
                            label="Na"
                            value={String(b.contrib.sodium_mg || 0)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/70 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white py-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-[11px] font-medium">{value}</div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
