// src/pages/AdminPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { IngredientPricing } from "@/types";

/* ----------------- helpers ----------------- */
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

type DrinkRow = {
  id: string;
  name: string;
  price_cents: number;
  is_active: boolean;
};

/* ----------------- tiny UI bits ----------------- */
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm font-semibold tracking-tight text-gray-800">
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  setValue,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string | number;
  setValue: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number";
}) {
  return (
    <label className="space-y-1">
      <div className="text-xs text-gray-600">{label}</div>
      <input
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

/* ----------------- Create Ingredient ----------------- */
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
    if (!name.trim()) return alert("Name is required");
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
      return alert(e1.message);
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
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <SectionTitle>New Ingredient</SectionTitle>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Name" value={name} setValue={setName} />
        <label className="space-y-1">
          <div className="text-xs text-gray-600">Category</div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
          >
            <option>base</option>
            <option>protein</option>
            <option>fruit</option>
            <option>sweetener</option>
            <option>addin</option>
            <option>topping</option>
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-xs text-gray-600">Default Unit</div>
          <select
            value={unitDefault}
            onChange={(e) =>
              setUnitDefault(e.target.value as "g" | "ml" | "scoop" | "piece")
            }
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
          >
            <option value="g">g</option>
            <option value="ml">ml</option>
            <option value="scoop">scoop</option>
            <option value="piece">piece</option>
          </select>
          <p className="text-[11px] text-gray-500">
            If unit is <b>ml</b>, set density (g/ml). If <b>scoop/piece</b>, set
            grams per unit.
          </p>
        </label>

        {unitNeedsGrams && (
          <Field
            label="Grams per Unit"
            value={gramsPerUnit}
            setValue={setGramsPerUnit}
            placeholder="e.g. 30"
            type="number"
          />
        )}
        {unitNeedsDensity && (
          <Field
            label="Density g/ml"
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

      <div className="mt-4">
        <SectionTitle>Per 100g (from dietician)</SectionTitle>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
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
      </div>

      <div className="mt-4">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Ingredient"}
        </button>
      </div>
    </div>
  );
}

/* ----------------- Add nutrition quick widget ----------------- */
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
    <div className="mt-3 rounded-xl border bg-gray-50 p-3">
      <div className="mb-2 text-xs font-semibold text-gray-700">
        Add nutrition (per 100g)
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
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
        className="mt-2 rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

/* ----------------- Pricing Editor (tabbed) ----------------- */
type Mode = IngredientPricing["pricing_mode"];
const MODE_LABEL: Record<Mode, string> = {
  flat: "Flat add-on",
  per_gram: "Per gram (g)",
  per_ml: "Per ml (ml)",
  per_unit: "Per unit",
};

function PricingEditor({ ingredientId }: { ingredientId: string }) {
  const [rows, setRows] = useState<IngredientPricing[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("flat");

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

  const current = rows.find((r) => r.pricing_mode === mode);

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
  }, [current?.price_cents, current?.cents_per, current?.unit_label, mode]);

  async function save() {
    const payload = {
      ingredient_id: ingredientId,
      pricing_mode: mode,
      price_cents: Number(priceCents || 0),
      cents_per: centsPer === "" ? null : Number(centsPer),
      unit_label: unitLabel || null,
      is_active: true,
    };
    const { error } = await supabase
      .from("ingredient_pricing")
      .upsert(payload, {
        onConflict: "ingredient_id,pricing_mode,unit_label_norm",
      });
    if (error) return alert(error.message);
    load();
  }

  return (
    <div className="mt-3 rounded-xl border bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Pricing
        </div>
        {/* tabs */}
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
          <Field
            label="price_cents"
            value={priceCents}
            setValue={setPriceCents}
            type="number"
          />
          <Field
            label="cents_per"
            value={centsPer}
            setValue={setCentsPer}
            type="number"
          />
          <Field
            label="unit_label"
            value={unitLabel}
            setValue={setUnitLabel}
            placeholder="for per_unit e.g. scoop"
          />
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

/* ----------------- Drinks Admin (compact) ----------------- */
function DrinksAdmin() {
  const [rows, setRows] = useState<DrinkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

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

  const filtered = rows.filter((r) =>
    r.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle>Drinks (base)</SectionTitle>
        <input
          className="w-56 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
          placeholder="Search drinks…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-500">No drinks found.</div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {filtered.map((d, idx) => (
            <div
              key={d.id}
              className="grid grid-cols-6 items-center gap-2 rounded-xl border p-3"
            >
              <input
                className="col-span-3 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
                value={d.name}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((x, i) =>
                      i === idx ? { ...x, name: e.target.value } : x
                    )
                  )
                }
              />
              <div className="col-span-2 flex items-center gap-1">
                <span className="text-xs text-gray-500">₱</span>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
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
              </div>
              <label className="flex items-center gap-2 text-xs">
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
                />
                Active
              </label>
              <div className="col-span-6 flex justify-end">
                <button
                  onClick={() => saveDrink(d)}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
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

function IngredientCard({
  ing,
  onDeactivate,
  reload,
}: {
  ing: IngredientRow;
  onDeactivate: (id: string, next: boolean) => void;
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const nut = ing.ingredient_nutrition;
  const round = (n: number | null | undefined) =>
    n ? Number(n.toFixed(2)) : 0;

  return (
    <div className="rounded-2xl border bg-white shadow-sm transition hover:shadow-md">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <div className="font-semibold text-gray-800">{ing.name}</div>
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            <Chip tone="cyan">{ing.category}</Chip>
            <Chip>{ing.unit_default}</Chip>
            {ing.grams_per_unit && <Chip>{ing.grams_per_unit} g/unit</Chip>}
          </div>
        </div>
        <div className="text-sm text-gray-500 flex items-center gap-1">
          <span>{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Summary nutrition */}
      {nut && (
        <div className="px-4 pb-3 text-xs text-gray-600 grid grid-cols-4 sm:grid-cols-7 gap-1">
          <div>Kcal: {round(nut.per_100g_energy_kcal)}</div>
          <div>P: {round(nut.per_100g_protein_g)} g</div>
          <div>F: {round(nut.per_100g_fat_g)} g</div>
          <div>C: {round(nut.per_100g_carbs_g)} g</div>
          <div>Sug: {round(nut.per_100g_sugars_g)} g</div>
          <div>Fib: {round(nut.per_100g_fiber_g)} g</div>
          <div>Na: {round(nut.per_100g_sodium_mg)} mg</div>
        </div>
      )}

      {/* Collapsible body */}
      {open && (
        <div className="border-t px-4 py-3 space-y-3 bg-gray-50/50">
          {nut ? (
            <div className="text-xs text-gray-500">
              Nutrition per 100 g shown above. Rounded for clarity.
            </div>
          ) : (
            <AddNutritionInline ingredientId={ing.id} onSaved={reload} />
          )}

          <PricingEditor ingredientId={ing.id} />

          <div className="flex justify-end">
            <button
              onClick={() => onDeactivate(ing.id, false)}
              className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50"
            >
              Deactivate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------- Main Admin Page ----------------- */
export default function AdminPage() {
  const [ings, setIngs] = useState<IngredientRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);

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

  const list = (showInactive ? inactive : active).filter((i) =>
    i.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Sticky tools */}
      <div className="sticky top-0 z-10 -mx-4 border-b bg-white/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <h1 className="text-lg font-bold">Admin</h1>
          <div className="flex items-center gap-2">
            <input
              className="w-56 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
              placeholder="Search ingredients…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Show inactive
            </label>
          </div>
        </div>
      </div>

      {/* Create new ingredient */}
      <NewIngredientForm onSaved={load} />

      {/* Ingredient grid */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <SectionTitle>
            {showInactive ? "Inactive Ingredients" : "Active Ingredients"}
          </SectionTitle>
          {loading && <span className="text-xs text-gray-500">Loading…</span>}
          <Chip tone="gray">{list.length}</Chip>
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600">
            {showInactive
              ? "No inactive ingredients."
              : "No active ingredients."}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((i) => (
              <IngredientCard
                key={i.id}
                ing={i}
                onDeactivate={toggleActive}
                reload={load}
              />
            ))}
          </div>
        )}
      </section>

      {/* Drinks admin */}
      <DrinksAdmin />
    </div>
  );
}
