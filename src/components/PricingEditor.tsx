import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Align with your DB types
export type IngredientPricing = {
  ingredient_id: string;
  pricing_mode: "flat" | "per_gram" | "per_ml" | "per_unit";
  price_cents: number | null; // total price for the add-on (₱ = cents/100)
  cents_per: number | null; // price per unit (per g, per ml, or per unit)
  unit_label: string | null; // e.g., "scoop" when pricing_mode = per_unit
  is_active: boolean;
};

const MODE_LABEL: Record<IngredientPricing["pricing_mode"], string> = {
  flat: "Flat add-on",
  per_gram: "Per gram (g)",
  per_ml: "Per ml (ml)",
  per_unit: "Per unit",
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number";
}) {
  return (
    <label className="space-y-1">
      <div className="text-xs text-gray-600">{label}</div>
      <input
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

export default function PricingEditor({
  ingredientId,
}: {
  ingredientId: string;
}) {
  const [rows, setRows] = useState<IngredientPricing[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<IngredientPricing["pricing_mode"]>("flat");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ingredient_pricing_effective")
      .select("*")
      .eq("ingredient_id", ingredientId);

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }
    setRows((data || []) as IngredientPricing[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [ingredientId]);

  const current = useMemo(
    () => rows.find((r) => r.pricing_mode === mode),
    [rows, mode]
  );

  const [priceCents, setPriceCents] = useState<string>("");
  const [centsPer, setCentsPer] = useState<string>("");
  const [unitLabel, setUnitLabel] = useState<string>("");

  useEffect(() => {
    setPriceCents(
      current?.price_cents != null ? String(current.price_cents) : ""
    );
    setCentsPer(current?.cents_per != null ? String(current.cents_per) : "");
    setUnitLabel(current?.unit_label ?? "");
  }, [current]);

  async function save() {
    const payload = {
      ingredient_id: ingredientId,
      pricing_mode: mode,
      price_cents: priceCents === "" ? null : Number(priceCents),
      cents_per: centsPer === "" ? null : Number(centsPer),
      unit_label: unitLabel || null,
      is_active: true,
    };

    const { error } = await supabase
      .from("ingredient_pricing")
      .upsert(payload, {
        // matches the unique index you created in SQL:
        onConflict: "ingredient_id,pricing_mode,unit_label_norm",
      });

    if (error) return alert(error.message);
    load();
  }

  // helper text: explain cents vs. PHP
  const exampleHelp = useMemo(() => {
    switch (mode) {
      case "flat":
        return "price_cents = total add-on price (e.g., ₱20 → 200).";
      case "per_gram":
        return "cents_per = price per 1 g (e.g., ₱0.50/g → 50). 20 g will cost 20 × 50 = 1000 cents (₱10).";
      case "per_ml":
        return "cents_per = price per 1 ml (e.g., ₱0.10/ml → 10). 50 ml will cost 50 × 10 = 500 cents (₱5).";
      case "per_unit":
        return "cents_per = price per 1 unit (e.g., per scoop). unit_label helps display (e.g., “scoop”).";
    }
  }, [mode]);

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Pricing
        </div>
        <div className="flex rounded-lg border bg-gray-50 p-0.5 text-xs">
          {(["flat", "per_gram", "per_ml", "per_unit"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md px-2 py-1 ${
                mode === m ? "bg-white shadow-sm" : "text-gray-600"
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-gray-500">Loading pricing…</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              label="price_cents (₱ × 100)"
              value={priceCents}
              onChange={setPriceCents}
              type="number"
            />
            <Field
              label="cents_per (per g/ml/unit)"
              value={centsPer}
              onChange={setCentsPer}
              type="number"
            />
            <Field
              label="unit_label (for per_unit)"
              value={unitLabel}
              onChange={setUnitLabel}
              placeholder="e.g., scoop"
            />
          </div>

          <div className="mt-2 text-[11px] text-gray-600">
            <b>How money values work:</b> You store prices as <i>cents</i>, not
            pesos, to avoid floating-point errors. Example: <code>₱38</code> ={" "}
            <code>3800</code> cents.
            {` `}For per-unit pricing, <code>cents_per</code> is the cost for 1
            unit.
            <br />
            <span className="text-gray-500">{exampleHelp}</span>
          </div>

          <div className="mt-3">
            <button
              onClick={save}
              className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Save Pricing
            </button>
          </div>
        </>
      )}
    </div>
  );
}
