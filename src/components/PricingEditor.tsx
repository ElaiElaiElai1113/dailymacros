import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Mode = "flat" | "per_gram" | "per_ml" | "per_unit";

const MODE_LABEL: Record<Mode, string> = {
  flat: "Flat add-on",
  per_gram: "Per gram (g)",
  per_ml: "Per ml (ml)",
  per_unit: "Per unit",
};

export default function PricingEditor({
  ingredientId,
}: {
  ingredientId: string;
}) {
  const [mode, setMode] = useState<Mode>("flat");
  const [loading, setLoading] = useState(false);

  // form in PESOS (₱)
  const [pricePhp, setPricePhp] = useState<string>(""); // total add-on price
  const [perPhp, setPerPhp] = useState<string>(""); // price per g/ml/unit
  const [unitLabel, setUnitLabel] = useState<string>("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ingredient_pricing_effective")
      .select("*")
      .eq("ingredient_id", ingredientId)
      .eq("pricing_mode", mode)
      .maybeSingle();

    if (!error && data) {
      setPricePhp(data.price_php != null ? String(Number(data.price_php)) : "");
      setPerPhp(data.per_php != null ? String(Number(data.per_php)) : "");
      setUnitLabel(data.unit_label ?? "");
    } else {
      // no row yet for this mode
      setPricePhp("");
      setPerPhp("");
      setUnitLabel("");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredientId, mode]);

  async function save() {
    const payload = {
      ingredient_id: ingredientId,
      pricing_mode: mode,
      price_php: pricePhp === "" ? null : Number(pricePhp),
      per_php: perPhp === "" ? null : Number(perPhp),
      unit_label: unitLabel || null,
      is_active: true,
    };

    const { error } = await supabase
      .from("ingredient_pricing")
      .upsert(payload, {
        onConflict: "ingredient_id,pricing_mode,unit_label_norm",
      });

    if (error) {
      alert(error.message);
      return;
    }
    await load();
  }

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          PRICING
        </div>
        <div className="flex rounded-lg border bg-gray-50 p-0.5 text-xs">
          {(["flat", "per_gram", "per_ml", "per_unit"] as Mode[]).map((m) => (
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
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1">
            <div className="text-xs text-gray-600">price (₱)</div>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 20"
              value={pricePhp}
              onChange={(e) => setPricePhp(e.target.value)}
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs text-gray-600">per (₱ / g • ml • unit)</div>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
              type="number"
              step="0.0001"
              min="0"
              placeholder={mode === "per_unit" ? "e.g. 10" : "e.g. 0.50"}
              value={perPhp}
              onChange={(e) => setPerPhp(e.target.value)}
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs text-gray-600">
              unit_label (for per_unit)
            </div>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
              placeholder="e.g., scoop"
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
            />
          </label>

          <div className="sm:col-span-3 text-[11px] leading-snug text-gray-600">
            <div className="mb-1 font-medium">How prices work</div>
            <ul className="list-disc pl-5">
              <li>
                <b>Flat</b> — total add-on price. Example: ₱20 means the add-on
                costs ₱20 regardless of amount.
              </li>
              <li>
                <b>Per gram/ml</b> — multiply by the grams/ml used. Example: per
                = ₱0.50 and 30 g → ₱15.00.
              </li>
              <li>
                <b>Per unit</b> — price for 1 unit (set <i>unit_label</i>, e.g.,
                “scoop”). Example: ₱10 per scoop × 2 scoops → ₱20.
              </li>
            </ul>
          </div>

          <div className="sm:col-span-3">
            <button
              onClick={save}
              className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Save Pricing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
