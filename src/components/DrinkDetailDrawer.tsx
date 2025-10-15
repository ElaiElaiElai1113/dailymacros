// src/pages/DrinkDetailDrawer.tsx
import { useEffect, useMemo, useState } from "react";
import type { Ingredient, IngredientNutrition, LineIngredient } from "@/types";
import { totalsFor, breakdownFor } from "@/utils/nutrition";

type Drink = {
  id: string;
  name: string;
  description: string | null;
  base_size_ml: number | null; // used as reference for scaling
  price_cents: number;
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
  ingDict,
  nutrDict,
  onAddToCart,
  onCustomize,
}: {
  open: boolean;
  onClose: () => void;
  drink: Drink | null;
  lines: LineIngredient[];
  ingDict: Record<string, Ingredient>;
  nutrDict: Record<string, IngredientNutrition>;
  onAddToCart: (scaledLines?: LineIngredient[]) => void;
  onCustomize: () => void;
}) {
  // ❗ Hard guard FIRST so hooks are never conditionally skipped
  if (!open || !drink) return null;

  // `drink` is non-null from here on
  const d = drink as Drink;

  // state
  const [sizeMl, setSizeMl] = useState<number>(() => d.base_size_ml ?? 473);

  // effects (always declared, gated inside if needed)
  useEffect(() => {
    // lock scroll while open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []); // runs on mount/unmount of the drawer

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // when drink changes, reset size to base
  useEffect(() => {
    if (d.base_size_ml) setSizeMl(d.base_size_ml);
  }, [d.id, d.base_size_ml]);

  // memo calculations
  const scaledLines = useMemo(
    () => scaleLines(lines, d.base_size_ml, sizeMl),
    [lines, d.base_size_ml, sizeMl]
  );

  const { totals } = useMemo(
    () => totalsFor(scaledLines, ingDict, nutrDict),
    [scaledLines, ingDict, nutrDict]
  );

  const breakdown = useMemo(
    () => breakdownFor(scaledLines, ingDict, nutrDict),
    [scaledLines, ingDict, nutrDict]
  );

  // optional debug
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.groupCollapsed(`🧪 Nutrition debug — ${d.name} (${sizeMl}ml)`);
    // eslint-disable-next-line no-console
    console.table(
      scaledLines.map((l) => ({
        ingredient_id: l.ingredient_id,
        name: ingDict[l.ingredient_id]?.name,
        amount: l.amount,
        unit: l.unit,
      }))
    );
    // eslint-disable-next-line no-console
    console.log("totals:", totals);
    // eslint-disable-next-line no-console
    console.groupEnd();
  }, [d.name, sizeMl, scaledLines, ingDict, totals]);

  function handleAddToCart() {
    onAddToCart(scaledLines);
  }

  async function handleShareOrPrint() {
    const price = `₱${(d.price_cents / 100).toFixed(2)}`;
    const ingList = scaledLines
      .map(
        (l) =>
          `${
            ingDict[l.ingredient_id]?.name || "Ingredient"
          } — ${l.amount.toFixed(1)} ${l.unit}`
      )
      .join("\n");

    const summary = `DailyMacros — ${d.name}
Size: ${sizeMl} ml • Price: ${price}

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
          title: `${d.name} — Nutrition`,
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
<title>${escapeHtml(d.name)} — Nutrition Label</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 24px; }
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
    <div class="title">DailyMacros — ${escapeHtml(d.name)}</div>
    <div class="muted">Size: ${sizeMl} ml • Price: ${price}</div>

    <div class="section">
      <strong>Ingredients</strong>
      <ul>
        ${scaledLines
          .map(
            (l) =>
              `<li>${escapeHtml(
                ingDict[l.ingredient_id]?.name || "Ingredient"
              )} — ${l.amount.toFixed(1)} ${l.unit}</li>`
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

    <div class="footer">Nutrition estimates are computed from ingredient-level data and selected size.</div>
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

  const showUnknown =
    !Number.isFinite(totals.energy_kcal) || totals.energy_kcal <= 0;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-2xl rounded-t-2xl bg-white shadow-2xl md:inset-0 md:m-auto md:h-auto md:rounded-2xl">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b p-4">
          <div>
            <h3 className="text-lg font-semibold">{d.name}</h3>
            <p className="text-sm text-gray-600">
              {d.description || "Signature protein smoothie."}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Base size: {d.base_size_ml ? `${d.base_size_ml} ml` : "—"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <div
              className="aspect-[16/10] w-full rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(89,145,144,0.15), rgba(210,110,61,0.15))",
              }}
            />
            <div className="mt-4">
              <div className="mb-1 text-sm font-semibold">Choose size</div>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s.ml}
                    onClick={() => setSizeMl(s.ml)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      sizeMl === s.ml
                        ? "bg-black text-white"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Scaling recipe relative to base size{" "}
                {d.base_size_ml ? `${d.base_size_ml} ml` : "—"}.
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleAddToCart}
                className="rounded-lg bg-[#D26E3D] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Add to Cart — ₱{(d.price_cents / 100).toFixed(2)}
              </button>
              <button
                onClick={onCustomize}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Customize
              </button>
              <button
                onClick={handleShareOrPrint}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                title="Share or print a nutrition label"
              >
                Share / Print Label
              </button>
            </div>

            <div className="mt-4 rounded-xl border bg-white p-3">
              <div className="mb-2 text-sm font-semibold">
                Estimated Nutrition ({sizeMl} ml)
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <Stat
                  label="Kcal"
                  value={
                    showUnknown
                      ? "—"
                      : Math.round(totals.energy_kcal).toString()
                  }
                />
                <Stat
                  label="Protein"
                  value={showUnknown ? "—" : `${totals.protein_g}g`}
                />
                <Stat
                  label="Carbs"
                  value={showUnknown ? "—" : `${totals.carbs_g}g`}
                />
                <Stat
                  label="Fat"
                  value={showUnknown ? "—" : `${totals.fat_g}g`}
                />
              </div>
              {showUnknown && (
                <div className="mt-2 text-[11px] text-amber-600">
                  Nutrition missing or ingredients lack conversion data. See
                  console for details.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-xl border p-3">
              <div className="mb-2 text-sm font-semibold">Ingredients</div>
              {scaledLines.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No recipe lines found.
                </div>
              ) : (
                <ul className="text-sm">
                  {scaledLines.map((l, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="truncate">
                        {ingDict[l.ingredient_id]?.name || "Ingredient"}
                      </span>
                      <span className="text-gray-600">
                        {l.amount.toFixed(
                          l.unit === "scoop" || l.unit === "piece" ? 2 : 1
                        )}{" "}
                        {l.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border p-3">
              <div className="mb-2 text-sm font-semibold">Explain my math</div>
              {breakdown.length === 0 ? (
                <div className="text-sm text-gray-500">Nothing to show.</div>
              ) : (
                <div className="space-y-2">
                  {breakdown.map((b) => (
                    <div
                      key={b.ingredient_id}
                      className="rounded-lg border p-2 text-xs"
                    >
                      <div className="mb-1 font-medium">{b.name}</div>
                      <div className="text-gray-600">
                        Input: {b.input.amount} {b.input.unit} → {b.grams_used}{" "}
                        g
                      </div>
                      <div className="mt-1 grid grid-cols-5 gap-2 text-center">
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
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white py-2">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border bg-white py-1">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
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
