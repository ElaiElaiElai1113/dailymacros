// src/components/PricingEditor.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { IngredientPricing } from "@/types";

type Mode = IngredientPricing["pricing_mode"];
const TABS: Mode[] = ["flat", "per_gram", "per_ml", "per_unit"];
const MODE_LABEL: Record<Mode, string> = {
  flat: "Flat add-on",
  per_gram: "Per gram",
  per_ml: "Per ml",
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
  value: string | number;
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

/** Quick Converter — supports per_gram, per_ml, and per_unit */
function QuickConverter({
  mode,
  onApplyPerPhp,
  unitLabel,
  setUnitLabel,
}: {
  mode: Mode;
  onApplyPerPhp: (perPhp: number) => void;
  unitLabel: string;
  setUnitLabel: (v: string) => void;
}) {
  const [totalPrice, setTotalPrice] = useState<string>("");
  const [qty, setQty] = useState<string>("");

  const unitHint = useMemo(() => {
    if (mode === "per_gram") return "grams";
    if (mode === "per_ml") return "ml";
    return unitLabel ? unitLabel : "unit(s)";
  }, [mode, unitLabel]);

  const canApply =
    totalPrice.trim() !== "" &&
    qty.trim() !== "" &&
    !isNaN(Number(totalPrice)) &&
    !isNaN(Number(qty)) &&
    Number(qty) > 0;

  const computed = canApply ? Number(totalPrice) / Number(qty) : null;

  return (
    <div className="rounded-xl border bg-gray-50 p-3">
      <div className="mb-2 text-xs font-semibold text-gray-700">
        Quick convert → set {mode === "flat" ? "Flat" : "Per"}{" "}
        {mode === "per_gram"
          ? "gram"
          : mode === "per_ml"
          ? "ml"
          : mode === "per_unit"
          ? "unit"
          : ""}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Field
          label="Total price (₱)"
          value={totalPrice}
          onChange={setTotalPrice}
          placeholder="e.g. 10"
          type="number"
        />
        <Field
          label={`Total quantity (${unitHint})`}
          value={qty}
          onChange={setQty}
          placeholder={`e.g. ${mode === "per_unit" ? "5.22" : "100"}`}
          type="number"
        />

        {mode === "per_unit" && (
          <Field
            label="Unit label"
            value={unitLabel}
            onChange={setUnitLabel}
            placeholder="tablespoon, scoop, stick…"
          />
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-sm">
        <div className="text-gray-600">
          {computed !== null ? (
            <>
              That’s{" "}
              <span className="font-semibold">₱{computed.toFixed(4)}</span> per{" "}
              {mode === "per_gram"
                ? "gram"
                : mode === "per_ml"
                ? "ml"
                : unitHint}
              .
            </>
          ) : (
            <span className="text-gray-500">
              Enter total price and quantity
            </span>
          )}
        </div>
        <button
          disabled={!canApply || (mode === "per_unit" && !unitLabel.trim())}
          onClick={() => {
            if (computed !== null) onApplyPerPhp(Number(computed));
          }}
          className="rounded-lg border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
        >
          {mode === "per_unit" ? "Set per unit" : "Set per value"}
        </button>
      </div>
    </div>
  );
}

export default function PricingEditor({
  ingredientId,
}: {
  ingredientId: string;
}) {
  const [mode, setMode] = useState<Mode>("flat");
  const [rows, setRows] = useState<IngredientPricing[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ingredient_pricing_effective")
      .select("*")
      .eq("ingredient_id", ingredientId);

    if (!error) setRows((data || []) as IngredientPricing[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [ingredientId]);

  const current = rows.find((r) => r.pricing_mode === mode);

  // Local editable fields (peso world, not cents)
  const [pricePhp, setPricePhp] = useState<string>(
    current?.price_php?.toString() ?? ""
  );
  const [perPhp, setPerPhp] = useState<string>(
    current?.per_php?.toString() ?? ""
  );
  const [unitLabel, setUnitLabel] = useState<string>(current?.unit_label ?? "");

  // Keep inputs in sync when switching tabs / loading
  useEffect(() => {
    setPricePhp(current?.price_php?.toString() ?? "");
    setPerPhp(current?.per_php?.toString() ?? "");
    setUnitLabel(current?.unit_label ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, current?.price_php, current?.per_php, current?.unit_label]);

  async function save() {
    const payload = {
      ingredient_id: ingredientId,
      pricing_mode: mode,
      price_php: Number(pricePhp || 0),
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
    load();
  }

  return (
    <div className="rounded-xl border bg-white p-3">
      {/* Header + tabs */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Pricing
        </div>
        <div className="flex rounded-lg border bg-gray-50 p-0.5 text-xs">
          {TABS.map((m) => (
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
          {/* Inputs */}
          <div className="grid gap-3 sm:grid-cols-3">
            {mode === "flat" ? (
              <>
                <Field
                  label="price_php (flat add-on)"
                  value={pricePhp}
                  onChange={setPricePhp}
                  type="number"
                />
                <div className="sm:col-span-2 text-xs text-gray-500 self-center">
                  Flat price added when ingredient is used (no quantity math).
                </div>
              </>
            ) : (
              <>
                <Field
                  label={
                    mode === "per_unit"
                      ? "per_php (₱ / unit_label)"
                      : mode === "per_gram"
                      ? "per_php (₱ / g)"
                      : "per_php (₱ / ml)"
                  }
                  value={perPhp}
                  onChange={setPerPhp}
                  type="number"
                />
                {/* unit label only shows for per_unit */}
                <Field
                  label="unit_label (for per_unit)"
                  value={unitLabel}
                  onChange={setUnitLabel}
                  placeholder="tablespoon, scoop, stick…"
                />
                <div className="text-xs text-gray-500 self-center">
                  For per_unit, the price applies per <b>unit_label</b>.
                </div>
              </>
            )}
          </div>

          {/* Quick Converter */}
          {mode !== "flat" && (
            <div className="mt-3">
              <QuickConverter
                mode={mode}
                unitLabel={unitLabel}
                setUnitLabel={setUnitLabel}
                onApplyPerPhp={(p) => setPerPhp(p.toString())}
              />
            </div>
          )}

          {/* Save */}
          <div className="mt-3">
            <button
              onClick={save}
              className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Save Pricing
            </button>
          </div>

          {/* Current effective rows (debug/clarity) */}
          {rows.length > 0 && (
            <div className="mt-3 rounded-lg bg-gray-50 p-2 text-xs text-gray-700">
              <div className="mb-1 font-semibold">Current (effective):</div>
              <ul className="space-y-1">
                {rows.map((r) => (
                  <li key={`${r.pricing_mode}-${r.unit_label || ""}`}>
                    <span className="font-medium">
                      {MODE_LABEL[r.pricing_mode]}:
                    </span>{" "}
                    {r.pricing_mode === "flat" ? (
                      <>₱{(r.price_php ?? 0).toFixed(2)} flat</>
                    ) : r.pricing_mode === "per_unit" ? (
                      <>
                        ₱{(r.per_php ?? 0).toFixed(4)} per{" "}
                        <b>{r.unit_label || "(unit)"}</b>
                      </>
                    ) : r.pricing_mode === "per_gram" ? (
                      <>₱{(r.per_php ?? 0).toFixed(4)} / g</>
                    ) : (
                      <>₱{(r.per_php ?? 0).toFixed(4)} / ml</>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

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
