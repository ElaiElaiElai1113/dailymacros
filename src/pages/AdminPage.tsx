import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { IngredientPricing } from "@/types";

/* ---------- helpers ---------- */
function numberOrNull(v: string) {
  const x = v.trim();
  if (!x) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

type IngredientRow = {
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

/* ---------- UI tiny components ---------- */
function Field({
  label,
  value,
  setValue,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number";
}) {
  return (
    <div>
      <div className="text-sm">{label}</div>
      <input
        className="border px-2 py-1 rounded w-full"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        type={type}
      />
    </div>
  );
}

/* ---------- New Ingredient + Nutrition ---------- */
function NewIngredientForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("protein");
  const [unitDefault, setUnitDefault] = useState<
    "g" | "ml" | "scoop" | "piece"
  >("g");
  const [gramsPerUnit, setGramsPerUnit] = useState("");
  const [density, setDensity] = useState("");
  const [allergens, setAllergens] = useState("");

  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [f, setF] = useState("");
  const [c, setC] = useState("");
  const [sug, setSug] = useState("");
  const [fib, setFib] = useState("");
  const [na, setNa] = useState("");

  const [saving, setSaving] = useState(false);

  const unitNeedsGrams = unitDefault === "scoop" || unitDefault === "piece";
  const unitNeedsDensity = unitDefault === "ml";

  async function save() {
    if (!name.trim()) {
      alert("Name is required");
      return;
    }
    setSaving(true);

    const { data: ing, error: e1 } = await supabase
      .from("ingredients")
      .insert({
        name: name.trim(),
        category,
        unit_default: unitDefault,
        grams_per_unit: unitNeedsGrams ? numberOrNull(gramsPerUnit) : null,
        density_g_per_ml: unitNeedsDensity ? numberOrNull(density) : null,
        allergen_tags: allergens
          ? allergens
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        is_active: true,
      })
      .select("*")
      .single();

    if (e1) {
      setSaving(false);
      alert(e1.message);
      return;
    }

    const { error: e2 } = await supabase.from("ingredient_nutrition").insert({
      ingredient_id: ing.id,
      per_100g_energy_kcal: Number(kcal || 0),
      per_100g_protein_g: Number(p || 0),
      per_100g_fat_g: Number(f || 0),
      per_100g_carbs_g: Number(c || 0),
      per_100g_sugars_g: Number(sug || 0),
      per_100g_fiber_g: Number(fib || 0),
      per_100g_sodium_mg: Number(na || 0),
    });

    setSaving(false);
    if (e2) return alert(e2.message);

    // reset
    setName("");
    setCategory("protein");
    setUnitDefault("g");
    setGramsPerUnit("");
    setDensity("");
    setAllergens("");
    setKcal("");
    setP("");
    setF("");
    setC("");
    setSug("");
    setFib("");
    setNa("");

    onSaved();
  }

  return (
    <div className="bg-white border rounded p-3 space-y-3">
      <div className="font-semibold">New Ingredient</div>

      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Name" value={name} setValue={setName} />
        <div>
          <div className="text-sm">Category</div>
          <select
            className="border px-2 py-1 rounded w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>base</option>
            <option>protein</option>
            <option>fruit</option>
            <option>sweetener</option>
            <option>addin</option>
            <option>topping</option>
          </select>
        </div>

        <div>
          <div className="text-sm">Default Unit</div>
          <select
            className="border px-2 py-1 rounded w-full"
            value={unitDefault}
            onChange={(e) =>
              setUnitDefault(e.target.value as "g" | "ml" | "scoop" | "piece")
            }
          >
            <option value="g">g</option>
            <option value="ml">ml</option>
            <option value="scoop">scoop</option>
            <option value="piece">piece</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            If unit is <b>ml</b>, set density (g/ml). If <b>scoop/piece</b>, set
            grams per unit.
          </p>
        </div>

        {unitNeedsGrams && (
          <Field
            label="Grams per Unit (for scoop/piece)"
            value={gramsPerUnit}
            setValue={setGramsPerUnit}
            placeholder="e.g. 30"
            type="number"
          />
        )}

        {unitNeedsDensity && (
          <Field
            label="Density g/ml (for ml)"
            value={density}
            setValue={setDensity}
            placeholder="e.g. 1.02"
            type="number"
          />
        )}

        <Field
          label="Allergens (comma-separated)"
          value={allergens}
          setValue={setAllergens}
          placeholder="milk,nuts,soy"
        />
      </div>

      <div className="font-medium mt-2">Per 100g (from dietician)</div>
      <div className="grid md:grid-cols-4 gap-3">
        <Field
          label="Energy kcal"
          value={kcal}
          setValue={setKcal}
          type="number"
        />
        <Field label="Protein g" value={p} setValue={setP} type="number" />
        <Field label="Fat g" value={f} setValue={setF} type="number" />
        <Field label="Carbs g" value={c} setValue={setC} type="number" />
        <Field label="Sugars g" value={sug} setValue={setSug} type="number" />
        <Field label="Fiber g" value={fib} setValue={setFib} type="number" />
        <Field label="Sodium mg" value={na} setValue={setNa} type="number" />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="px-3 py-2 bg-black text-white rounded disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Ingredient"}
      </button>
    </div>
  );
}

/* ---------- Add nutrition (inline) ---------- */
function AddNutritionInline({
  ingredientId,
  onSaved,
}: {
  ingredientId: string;
  onSaved: () => void;
}) {
  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [f, setF] = useState("");
  const [c, setC] = useState("");
  const [sug, setSug] = useState("");
  const [fib, setFib] = useState("");
  const [na, setNa] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("ingredient_nutrition").insert({
      ingredient_id: ingredientId,
      per_100g_energy_kcal: Number(kcal || 0),
      per_100g_protein_g: Number(p || 0),
      per_100g_fat_g: Number(f || 0),
      per_100g_carbs_g: Number(c || 0),
      per_100g_sugars_g: Number(sug || 0),
      per_100g_fiber_g: Number(fib || 0),
      per_100g_sodium_mg: Number(na || 0),
    });
    setSaving(false);
    if (error) return alert(error.message);
    onSaved();
  }

  return (
    <div className="mt-2 p-2 border rounded bg-gray-50">
      <div className="text-xs font-semibold mb-1">Add nutrition (per 100g)</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Field label="kcal" value={kcal} setValue={setKcal} type="number" />
        <Field label="P g" value={p} setValue={setP} type="number" />
        <Field label="F g" value={f} setValue={setF} type="number" />
        <Field label="C g" value={c} setValue={setC} type="number" />
        <Field label="Sug g" value={sug} setValue={setSug} type="number" />
        <Field label="Fib g" value={fib} setValue={setFib} type="number" />
        <Field label="Na mg" value={na} setValue={setNa} type="number" />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="mt-2 px-2 py-1 text-xs bg-black text-white rounded disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

/* ---------- Pricing editor ---------- */
function PriceRow({
  label,
  mode,
  current,
  onSave,
}: {
  label: string;
  mode: IngredientPricing["pricing_mode"];
  current: IngredientPricing | undefined;
  onSave: (payload: Partial<IngredientPricing>) => Promise<void>;
}) {
  const [priceCents, setPriceCents] = useState(
    current?.price_cents?.toString() || ""
  );
  const [centsPer, setCentsPer] = useState(
    current?.cents_per?.toString() || ""
  );
  const [unitLabel, setUnitLabel] = useState(current?.unit_label || "");

  useEffect(() => {
    setPriceCents(current?.price_cents?.toString() || "");
    setCentsPer(current?.cents_per?.toString() || "");
    setUnitLabel(current?.unit_label || "");
  }, [current]);

  async function save() {
    await onSave({
      pricing_mode: mode,
      price_cents: Number(priceCents || 0),
      cents_per: centsPer === "" ? null : Number(centsPer),
      unit_label: unitLabel || null,
    });
  }

  return (
    <div className="grid grid-cols-5 items-end gap-2 text-sm">
      <div className="col-span-1 font-medium">{label}</div>
      <div>
        <div className="text-[11px] text-gray-500">price_cents</div>
        <input
          className="border rounded px-2 py-1 w-full"
          value={priceCents}
          onChange={(e) => setPriceCents(e.target.value)}
        />
      </div>
      <div>
        <div className="text-[11px] text-gray-500">cents_per</div>
        <input
          className="border rounded px-2 py-1 w-full"
          value={centsPer}
          onChange={(e) => setCentsPer(e.target.value)}
        />
      </div>
      <div>
        <div className="text-[11px] text-gray-500">unit_label</div>
        <input
          className="border rounded px-2 py-1 w-full"
          value={unitLabel}
          onChange={(e) => setUnitLabel(e.target.value)}
          placeholder="(for per_unit e.g. scoop)"
        />
      </div>
      <div>
        <button
          onClick={save}
          className="rounded border px-3 py-1 hover:bg-gray-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function PricingEditor({ ingredientId }: { ingredientId: string }) {
  const [rows, setRows] = useState<IngredientPricing[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("ingredient_pricing_effective")
      .select("*")
      .eq("ingredient_id", ingredientId);
    setRows((data || []) as IngredientPricing[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [ingredientId]);

  async function upsert(payload: Partial<IngredientPricing>) {
    const { error } = await supabase.from("ingredient_pricing").upsert(
      {
        ingredient_id: ingredientId,
        pricing_mode: payload.pricing_mode!,
        price_cents: payload.price_cents ?? 0,
        cents_per: payload.cents_per ?? null,
        unit_label: payload.unit_label ?? null,
        is_active: true,
      },
      { onConflict: "ingredient_id,pricing_mode,unit_label_norm" }
    );
    if (error) return alert(error.message);
    load();
  }

  const byMode = (m: IngredientPricing["pricing_mode"]) =>
    rows.find((r) => r.pricing_mode === m);

  return (
    <div className="mt-3 space-y-2 rounded border p-2 bg-gray-50">
      <div className="text-xs font-semibold text-gray-700 mb-1">Pricing</div>
      {loading ? (
        <div className="text-xs text-gray-500">Loading pricing…</div>
      ) : (
        <div className="space-y-2">
          <PriceRow
            label="Flat add-on"
            mode="flat"
            current={byMode("flat")}
            onSave={upsert}
          />
          <PriceRow
            label="Per gram (g)"
            mode="per_gram"
            current={byMode("per_gram")}
            onSave={upsert}
          />
          <PriceRow
            label="Per ml (ml)"
            mode="per_ml"
            current={byMode("per_ml")}
            onSave={upsert}
          />
          <PriceRow
            label="Per unit"
            mode="per_unit"
            current={byMode("per_unit")}
            onSave={upsert}
          />
        </div>
      )}
    </div>
  );
}

/* ---------- Drinks editor ---------- */
type DrinkRow = {
  id: string;
  name: string;
  price_cents: number;
  is_active: boolean;
};

function DrinksAdmin() {
  const [rows, setRows] = useState<DrinkRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("drinks")
      .select("id,name,price_cents,is_active")
      .order("name");
    setRows((data || []) as DrinkRow[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function saveDrink(d: DrinkRow) {
    const { error } = await supabase
      .from("drinks")
      .update({
        name: d.name,
        price_cents: d.price_cents,
        is_active: d.is_active,
      })
      .eq("id", d.id);
    if (error) alert(error.message);
    else load();
  }

  return (
    <section className="space-y-2 mt-8">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">Drinks (base)</h2>
        {loading && <span className="text-xs text-gray-500">Loading…</span>}
      </div>
      {rows.length === 0 ? (
        <div className="text-sm text-gray-500">No drinks yet.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-2">
          {rows.map((d, idx) => (
            <div
              key={d.id}
              className="rounded border p-2 bg-white grid grid-cols-6 gap-2 items-center"
            >
              <input
                className="border rounded px-2 py-1 col-span-3"
                value={d.name}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((x, i) =>
                      i === idx ? { ...x, name: e.target.value } : x
                    )
                  )
                }
              />
              <input
                className="border rounded px-2 py-1 col-span-2"
                value={(d.price_cents / 100).toFixed(2)}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((x, i) =>
                      i === idx
                        ? {
                            ...x,
                            price_cents: Math.round(
                              Number(e.target.value || 0) * 100
                            ),
                          }
                        : x
                    )
                  )
                }
              />
              <label className="text-xs flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={d.is_active}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((x, i) =>
                        i === idx ? { ...x, is_active: e.target.checked } : x
                      )
                    )
                  }
                />{" "}
                active
              </label>
              <div className="col-span-6 flex justify-end">
                <button
                  onClick={() => saveDrink(d)}
                  className="rounded border px-3 py-1 hover:bg-gray-50"
                >
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- Main Admin page ---------- */
export default function AdminPage() {
  const [ings, setIngs] = useState<IngredientRow[]>([]);
  const [loading, setLoading] = useState(false);

  const active = useMemo(() => ings.filter((i) => i.is_active), [ings]);
  const inactive = useMemo(() => ings.filter((i) => !i.is_active), [ings]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ingredients")
      .select("*, ingredient_nutrition(*)")
      .order("name");
    setLoading(false);
    if (error) return alert(error.message);
    setIngs((data || []) as any);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(id: string, next: boolean) {
    const { error } = await supabase
      .from("ingredients")
      .update({ is_active: next })
      .eq("id", id);
    if (error) return alert(error.message);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Admin</h1>

      {/* Create new ingredient */}
      <NewIngredientForm onSaved={load} />

      {/* Active list */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Active Ingredients</h2>
          {loading && <span className="text-xs text-gray-500">Loading…</span>}
        </div>
        {active.length === 0 ? (
          <div className="text-sm text-gray-500">No active ingredients.</div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            {active.map((i) => (
              <div key={i.id} className="border rounded p-2 bg-white">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{i.name}</div>
                  <button
                    onClick={() => toggleActive(i.id, false)}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Deactivate
                  </button>
                </div>
                <div className="text-xs text-gray-600">
                  {i.category} • unit {i.unit_default}
                </div>

                {i.grams_per_unit && (
                  <div className="text-[11px] text-gray-500">
                    {i.grams_per_unit} g / {i.unit_default}
                  </div>
                )}
                {i.density_g_per_ml && (
                  <div className="text-[11px] text-gray-500">
                    density {i.density_g_per_ml} g/ml
                  </div>
                )}
                {i.allergen_tags && i.allergen_tags.length > 0 && (
                  <div className="text-[11px] text-rose-600">
                    allergens: {i.allergen_tags.join(", ")}
                  </div>
                )}

                {i.ingredient_nutrition ? (
                  <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 text-[11px] text-gray-700">
                    <div>
                      kcal {i.ingredient_nutrition.per_100g_energy_kcal}
                    </div>
                    <div>P {i.ingredient_nutrition.per_100g_protein_g} g</div>
                    <div>F {i.ingredient_nutrition.per_100g_fat_g} g</div>
                    <div>C {i.ingredient_nutrition.per_100g_carbs_g} g</div>
                    <div>Sug {i.ingredient_nutrition.per_100g_sugars_g} g</div>
                    <div>Fib {i.ingredient_nutrition.per_100g_fiber_g} g</div>
                    <div>Na {i.ingredient_nutrition.per_100g_sodium_mg} mg</div>
                  </div>
                ) : (
                  <AddNutritionInline ingredientId={i.id} onSaved={load} />
                )}

                {/* Pricing editor */}
                <PricingEditor ingredientId={i.id} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Drinks admin */}
      <DrinksAdmin />

      {/* Inactive list */}
      <section className="space-y-2">
        <h2 className="font-semibold">Inactive Ingredients</h2>
        {inactive.length === 0 ? (
          <div className="text-sm text-gray-500">No inactive ingredients.</div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            {inactive.map((i) => (
              <div
                key={i.id}
                className="border rounded p-2 bg-white opacity-70"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{i.name}</div>
                  <button
                    onClick={() => toggleActive(i.id, true)}
                    className="text-xs text-emerald-700 hover:underline"
                  >
                    Activate
                  </button>
                </div>
                <div className="text-xs text-gray-600">
                  {i.category} • unit {i.unit_default}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
