import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PricingMode = "flat_addon" | "per_gram" | "per_ml" | "per_unit";

type PricingRow = {
  id: string;
  ingredient_id: string;
  pricing_mode: PricingMode;
  price_cents?: number | null; // used for flat_addon
  cents_per?: number | null; // used for per_* modes
  unit_label?: string | null; // e.g., "g", "ml", "tbsp"
};

export default function PricingEditor({
  ingredientId,
  onSaved,
}: {
  ingredientId: string;
  onSaved?: () => void;
}) {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("ingredient_pricing")
        .select("*")
        .eq("ingredient_id", ingredientId)
        .order("pricing_mode, unit_label", { ascending: true });
      if (!error) setRows((data ?? []) as PricingRow[]);
    })();
  }, [ingredientId]);

  const byMode = useMemo(() => {
    const g = new Map<PricingMode, PricingRow[]>();
    for (const r of rows) {
      const list = g.get(r.pricing_mode) ?? [];
      list.push(r);
      g.set(r.pricing_mode, list);
    }
    return g;
  }, [rows]);

  async function saveRow(partial: Omit<PricingRow, "id"> & { id?: string }) {
    setSaving(partial.pricing_mode);
    try {
      if (partial.id) {
        const { error } = await supabase
          .from("ingredient_pricing")
          .update(partial)
          .eq("id", partial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ingredient_pricing").insert({
          ...partial,
          ingredient_id: ingredientId,
        });
        if (error) throw error;
      }
      // reload
      const { data } = await supabase
        .from("ingredient_pricing")
        .select("*")
        .eq("ingredient_id", ingredientId)
        .order("pricing_mode, unit_label", { ascending: true });
      setRows((data ?? []) as PricingRow[]);
      onSaved?.();
    } finally {
      setSaving(null);
    }
  }

  /* ---------- UI helpers ---------- */
  function RowHint({ mode, example }: { mode: PricingMode; example: string }) {
    const map: Record<PricingMode, string> = {
      flat_addon:
        "Charge a single price regardless of amount. Example: add protein scoop = ₱38.",
      per_gram:
        "Charge based on weight. Example: 0.50 cents_per (per g) means 20 g → ₱10.00.",
      per_ml:
        "Charge based on volume. Example: 0.40 cents_per (per ml) means 25 ml → ₱10.00.",
      per_unit:
        "Charge per piece/scoop/etc. Example: 500 cents_per (per scoop) → ₱5.00.",
    };
    return (
      <div className="mt-1 text-[11px] text-gray-500">
        {map[mode]} <span className="italic text-gray-600">{example}</span>
      </div>
    );
  }

  function ModeBlock({
    title,
    mode,
    placeholderUnit,
  }: {
    title: string;
    mode: PricingMode;
    placeholderUnit: string;
  }) {
    const items = byMode.get(mode) ?? [];

    // “New” row inputs
    const [priceCents, setPriceCents] = useState<string>("");
    const [centsPer, setCentsPer] = useState<string>("");
    const [unitLabel, setUnitLabel] = useState<string>(placeholderUnit);

    const isFlat = mode === "flat_addon";

    return (
      <div className="rounded-lg border p-3">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        <RowHint
          mode={mode}
          example={
            mode === "flat_addon"
              ? "Ex: price_cents=380 → ₱3.80"
              : mode === "per_gram"
              ? "Ex: cents_per=0.5, unit_label='g' → 20 g costs ₱10.00"
              : mode === "per_ml"
              ? "Ex: cents_per=0.4, unit_label='ml' → 25 ml costs ₱10.00"
              : "Ex: cents_per=500, unit_label='scoop' → ₱5.00 per scoop"
          }
        />

        {/* existing entries */}
        {items.length > 0 && (
          <div className="mt-3 grid gap-2">
            {items.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-2 rounded-md border bg-white px-2 py-2"
              >
                {isFlat ? (
                  <>
                    <Field
                      label="price_cents"
                      value={String(r.price_cents ?? "")}
                      onChange={(_) => {}}
                      readOnly
                    />
                    <span className="text-sm text-gray-500">
                      (₱{((r.price_cents ?? 0) / 100).toFixed(2)})
                    </span>
                  </>
                ) : (
                  <>
                    <Field
                      label="cents_per"
                      value={String(r.cents_per ?? "")}
                      onChange={(_) => {}}
                      readOnly
                    />
                    <Field
                      label="unit_label"
                      value={r.unit_label ?? ""}
                      onChange={(_) => {}}
                      readOnly
                    />
                    <span className="text-sm text-gray-500">
                      (₱{((r.cents_per ?? 0) / 100).toFixed(4)} per{" "}
                      {r.unit_label || "unit"})
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* add new */}
        <div className="mt-3 flex flex-wrap items-end gap-2">
          {isFlat ? (
            <>
              <Field
                label="price_cents"
                value={priceCents}
                onChange={setPriceCents}
                placeholder="e.g., 380"
              />
              <div className="text-xs text-gray-500">
                → ₱{(Number(priceCents || 0) / 100).toFixed(2)}
              </div>
            </>
          ) : (
            <>
              <Field
                label="cents_per"
                value={centsPer}
                onChange={setCentsPer}
                placeholder="e.g., 0.5"
              />
              <Field
                label="unit_label"
                value={unitLabel}
                onChange={setUnitLabel}
                placeholder={placeholderUnit}
              />
              <div className="text-xs text-gray-500">
                → ₱{(Number(centsPer || 0) / 100).toFixed(4)} per {unitLabel}
              </div>
            </>
          )}

          <button
            disabled={saving === mode}
            onClick={() =>
              saveRow(
                isFlat
                  ? {
                      ingredient_id: ingredientId,
                      pricing_mode: "flat_addon",
                      price_cents: Number(priceCents || 0),
                    }
                  : {
                      ingredient_id: ingredientId,
                      pricing_mode: mode,
                      cents_per: Number(centsPer || 0),
                      unit_label: unitLabel || placeholderUnit,
                    }
              )
            }
            className="ml-auto rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            {saving === mode ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      <div className="mb-2 text-sm font-semibold text-gray-900">Pricing</div>

      <div className="grid gap-3">
        <ModeBlock title="Flat add-on" mode="flat_addon" placeholderUnit="—" />
        <ModeBlock title="Per gram (g)" mode="per_gram" placeholderUnit="g" />
        <ModeBlock title="Per ml (ml)" mode="per_ml" placeholderUnit="ml" />
        <ModeBlock
          title="Per unit (piece/scoop)"
          mode="per_unit"
          placeholderUnit="scoop"
        />
      </div>

      <div className="mt-3 rounded-md bg-amber-50 p-2 text-[11px] text-amber-800">
        <strong>
          What’s the difference between price_cents and cents_per?
        </strong>
        <ul className="ml-4 list-disc space-y-0.5">
          <li>
            <b>price_cents</b> — a single fixed cost (e.g., one scoop add-on =
            380 → ₱3.80).
          </li>
          <li>
            <b>cents_per</b> — a rate you multiply by the amount. Example:
            <code>cents_per = 0.50</code> per g → 20 g costs
            <code> 0.5 × 20 = 10</code> cents → ₱0.10.
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ---------- small shared field ---------- */
function Field({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="flex min-w-[140px] flex-col gap-1">
      <span className="text-[11px] text-gray-600">{label}</span>
      <input
        className={`h-9 rounded-md border px-2 text-sm ${
          readOnly ? "bg-gray-50" : "bg-white"
        }`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </label>
  );
}
