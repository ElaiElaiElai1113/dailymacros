import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { logAudit } from "@/utils/audit";

type DrinkRow = {
  id: string;
  name: string;
  description?: string | null;
  base_size_ml?: number | null;
  price_php: number | null;
  is_active: boolean;
  image_url?: string | null;
};

type IngredientRow = {
  id: string;
  name: string;
  unit_default: "g" | "ml" | "scoop" | "piece";
  is_active: boolean;
};

type DrinkSizeRow = {
  id: string;
  drink_id: string;
  size_label: string | null;
  display_name: string | null;
  size_ml: number;
  is_active: boolean;
};

type DrinkLineRow = {
  drink_id: string;
  ingredient_id: string;
  amount: number;
  unit: string;
};

type RecipeLine = {
  ingredient_id: string;
  amount: number;
  unit: string;
};

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string | number | undefined | null;
  onChange: (v: string) => void;
  type?: "text" | "number";
  placeholder?: string;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <input
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export default function DrinksAdminPage() {
  const [rows, setRows] = useState<DrinkRow[]>([]);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [drinkSizes, setDrinkSizes] = useState<DrinkSizeRow[]>([]);
  const [recipeLines, setRecipeLines] = useState<
    Record<string, RecipeLine[]>
  >({});
  const [sizeRecipeLines, setSizeRecipeLines] = useState<
    Record<string, RecipeLine[]>
  >({});
  const [recipeSavingId, setRecipeSavingId] = useState<string | null>(null);
  const [sizeRecipeSavingKey, setSizeRecipeSavingKey] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [newDrink, setNewDrink] = useState<Partial<DrinkRow>>({
    name: "",
    description: "",
    base_size_ml: 350,
    price_php: 0,
    is_active: true,
  });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("drinks")
      .select("id,name,description,base_size_ml,price_php,is_active,image_url")
      .order("name", { ascending: true });
    setLoading(false);
    if (error) return alert(error.message);
    setRows((data || []) as DrinkRow[]);
  }

  async function loadIngredients() {
    const { data, error } = await supabase
      .from("ingredients")
      .select("id,name,unit_default,is_active")
      .eq("is_active", true)
      .order("name");
    if (error) return alert(error.message);
    setIngredients((data || []) as IngredientRow[]);
  }

  async function loadDrinkSizes() {
    const { data, error } = await supabase
      .from("drink_sizes")
      .select("id,drink_id,size_label,display_name,size_ml,is_active")
      .order("size_ml", { ascending: true });
    if (error) return alert(error.message);
    setDrinkSizes((data || []) as DrinkSizeRow[]);
  }

  async function loadLines(drinkIds: string[]) {
    if (drinkIds.length === 0) {
      setRecipeLines({});
      return;
    }
    const { data, error } = await supabase
      .from("drink_lines")
      .select("drink_id,ingredient_id,amount,unit")
      .in("drink_id", drinkIds);
    if (error) return alert(error.message);
    const map: Record<string, RecipeLine[]> = {};
    (data || []).forEach((row) => {
      const r = row as DrinkLineRow;
      (map[r.drink_id] ||= []).push({
        ingredient_id: r.ingredient_id,
        amount: r.amount,
        unit: r.unit,
      });
    });
    drinkIds.forEach((id) => {
      if (!map[id]) map[id] = [];
    });
    setRecipeLines(map);
  }

  useEffect(() => {
    load();
    loadIngredients();
    loadDrinkSizes();
  }, []);

  useEffect(() => {
    const ids = rows.map((r) => r.id);
    loadLines(ids);
  }, [rows]);

  useEffect(() => {
    const sizeIds = drinkSizes.map((s) => s.id);
    if (sizeIds.length === 0) {
      setSizeRecipeLines({});
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("drink_size_lines")
        .select("drink_size_id,ingredient_id,amount,unit")
        .in("drink_size_id", sizeIds);
      if (error) return alert(error.message);
      const map: Record<string, RecipeLine[]> = {};
      (data || []).forEach((row) => {
        const r = row as {
          drink_size_id: string;
          ingredient_id: string;
          amount: number;
          unit: string;
        };
        (map[r.drink_size_id] ||= []).push({
          ingredient_id: r.ingredient_id,
          amount: r.amount,
          unit: r.unit,
        });
      });
      setSizeRecipeLines(map);
    })();
  }, [drinkSizes]);

  async function createDrink() {
    if (!newDrink.name?.trim()) return alert("Name is required.");
    setCreating(true);
    const { error } = await supabase.from("drinks").insert({
      name: newDrink.name?.trim(),
      description: newDrink.description || null,
      base_size_ml: Number(newDrink.base_size_ml || 0) || null,
      price_php: Number(newDrink.price_php || 0),
      is_active: !!newDrink.is_active,
    });
    setCreating(false);
    if (error) return alert(error.message);
    await logAudit({
      action: "drink.created",
      entity_type: "drink",
      entity_id: null,
      metadata: {
        name: newDrink.name?.trim(),
        base_size_ml: Number(newDrink.base_size_ml || 0) || null,
        price_php: Number(newDrink.price_php || 0),
        is_active: !!newDrink.is_active,
      },
    });
    setNewDrink({
      name: "",
      description: "",
      base_size_ml: 350,
      price_php: 0,
      is_active: true,
    });
    load();
  }

  async function saveDrink(d: DrinkRow) {
    const { error } = await supabase
      .from("drinks")
      .update({
        name: d.name,
        description: d.description ?? null,
        base_size_ml: d.base_size_ml ?? null,
        price_php: d.price_php ?? 0,
        is_active: d.is_active,
        image_url: d.image_url ?? null,
      })
      .eq("id", d.id);
    if (error) alert(error.message);
    else {
      await logAudit({
        action: "drink.updated",
        entity_type: "drink",
        entity_id: d.id,
        metadata: {
          name: d.name,
          base_size_ml: d.base_size_ml ?? null,
          price_php: d.price_php ?? 0,
          is_active: d.is_active,
          image_url: d.image_url ?? null,
        },
      });
      load();
    }
  }

  async function saveRecipe(drinkId: string) {
    const lines = recipeLines[drinkId] || [];
    const cleaned = lines
      .map((l) => ({
        ingredient_id: l.ingredient_id,
        amount: Number(l.amount || 0),
        unit: l.unit || "g",
      }))
      .filter((l) => l.ingredient_id && l.amount > 0);
    setRecipeSavingId(drinkId);
    const { error: delErr } = await supabase
      .from("drink_lines")
      .delete()
      .eq("drink_id", drinkId);
    if (delErr) {
      setRecipeSavingId(null);
      return alert(delErr.message);
    }
    if (cleaned.length > 0) {
      const { error: insErr } = await supabase.from("drink_lines").insert(
        cleaned.map((l) => ({
          drink_id: drinkId,
          ingredient_id: l.ingredient_id,
          amount: l.amount,
          unit: l.unit,
        }))
      );
      if (insErr) {
        setRecipeSavingId(null);
        return alert(insErr.message);
      }
    }
    await logAudit({
      action: "drink.updated",
      entity_type: "drink",
      entity_id: drinkId,
      metadata: { recipe_updated: true, line_count: cleaned.length },
    });
    setRecipeSavingId(null);
    loadLines([drinkId]);
  }

  async function saveSizeRecipe(drinkSizeId: string) {
    const key = drinkSizeId;
    const lines = sizeRecipeLines[drinkSizeId] || [];
    const cleaned = lines
      .map((l) => ({
        ingredient_id: l.ingredient_id,
        amount: Number(l.amount || 0),
        unit: l.unit || "g",
      }))
      .filter((l) => l.ingredient_id && l.amount > 0);
    setSizeRecipeSavingKey(key);
    const { error: delErr } = await supabase
      .from("drink_size_lines")
      .delete()
      .eq("drink_size_id", drinkSizeId);
    if (delErr) {
      setSizeRecipeSavingKey(null);
      return alert(delErr.message);
    }
    if (cleaned.length > 0) {
      const { error: insErr } = await supabase.from("drink_size_lines").insert(
        cleaned.map((l) => ({
          drink_size_id: drinkSizeId,
          ingredient_id: l.ingredient_id,
          amount: l.amount,
          unit: l.unit,
        }))
      );
      if (insErr) {
        setSizeRecipeSavingKey(null);
        return alert(insErr.message);
      }
    }
    await logAudit({
      action: "drink.updated",
      entity_type: "drink",
      entity_id: drinkSizeId,
      metadata: {
        recipe_updated: true,
        drink_size_id: drinkSizeId,
        line_count: cleaned.length,
      },
    });
    setSizeRecipeSavingKey(null);
    const sizeIds = drinkSizes.map((s) => s.id);
    if (sizeIds.length === 0) return;
    const { data, error } = await supabase
      .from("drink_size_lines")
      .select("drink_size_id,ingredient_id,amount,unit")
      .in("drink_size_id", sizeIds);
    if (error) return alert(error.message);
    const map: Record<string, RecipeLine[]> = {};
    (data || []).forEach((row) => {
      const r = row as {
        drink_size_id: string;
        ingredient_id: string;
        amount: number;
        unit: string;
      };
      (map[r.drink_size_id] ||= []).push({
        ingredient_id: r.ingredient_id,
        amount: r.amount,
        unit: r.unit,
      });
    });
    setSizeRecipeLines(map);
  }

  function updateRecipeLine(
    drinkId: string,
    idx: number,
    patch: Partial<RecipeLine>
  ) {
    setRecipeLines((prev) => {
      const next = { ...prev };
      const lines = [...(next[drinkId] || [])];
      const current = lines[idx];
      if (!current) return prev;
      lines[idx] = { ...current, ...patch };
      next[drinkId] = lines;
      return next;
    });
  }

  function updateSizeRecipeLine(
    drinkSizeId: string,
    idx: number,
    patch: Partial<RecipeLine>
  ) {
    setSizeRecipeLines((prev) => {
      const next = { ...prev };
      const lines = [...(next[drinkSizeId] || [])];
      const current = lines[idx];
      if (!current) return prev;
      lines[idx] = { ...current, ...patch };
      next[drinkSizeId] = lines;
      return next;
    });
  }

  function addRecipeLine(drinkId: string) {
    const fallback = ingredients[0];
    if (!fallback) return;
    setRecipeLines((prev) => {
      const next = { ...prev };
      const lines = [...(next[drinkId] || [])];
      lines.push({
        ingredient_id: fallback.id,
        amount: 0,
        unit: fallback.unit_default || "g",
      });
      next[drinkId] = lines;
      return next;
    });
  }

  function addSizeRecipeLine(drinkSizeId: string) {
    const fallback = ingredients[0];
    if (!fallback) return;
    setSizeRecipeLines((prev) => {
      const next = { ...prev };
      const lines = [...(next[drinkSizeId] || [])];
      lines.push({
        ingredient_id: fallback.id,
        amount: 0,
        unit: fallback.unit_default || "g",
      });
      next[drinkSizeId] = lines;
      return next;
    });
  }

  function removeRecipeLine(drinkId: string, idx: number) {
    setRecipeLines((prev) => {
      const next = { ...prev };
      const lines = [...(next[drinkId] || [])];
      lines.splice(idx, 1);
      next[drinkId] = lines;
      return next;
    });
  }

  function removeSizeRecipeLine(drinkSizeId: string, idx: number) {
    setSizeRecipeLines((prev) => {
      const next = { ...prev };
      const lines = [...(next[drinkSizeId] || [])];
      lines.splice(idx, 1);
      next[drinkSizeId] = lines;
      return next;
    });
  }

  // upload handler (assuming you already added this to your version)
  async function handleUpload(drinkId: string, file: File) {
    const ext = file.name.split(".").pop() || "png";
    const path = `${drinkId}.${ext}`;

    const { error } = await supabase.storage.from("drinks").upload(path, file, {
      upsert: true,
      cacheControl: "3600",
    });

    if (error) {
      console.error("upload error", error);
      alert(error.message);
      return;
    }

    // build public URL
    const publicUrl = `${
      import.meta.env.VITE_SUPABASE_URL
    }/storage/v1/object/public/drinks/${path}`;

    const { error: updErr } = await supabase
      .from("drinks")
      .update({ image_url: publicUrl })
      .eq("id", drinkId);

    if (updErr) {
      console.error("db update error", updErr);
      alert(updErr.message);
    }
  }

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );

  const ingredientById = useMemo(() => {
    const map = new Map<string, IngredientRow>();
    ingredients.forEach((i) => map.set(i.id, i));
    return map;
  }, [ingredients]);

  const drinkSizesByDrink = useMemo(() => {
    const map: Record<string, DrinkSizeRow[]> = {};
    drinkSizes.forEach((s) => {
      (map[s.drink_id] ||= []).push(s);
    });
    return map;
  }, [drinkSizes]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-gray-800">Drinks Admin</h1>
        <input
          className="w-72 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
          placeholder="Search drinks…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Create new */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-gray-800">Add New Drink</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field
            label="Name"
            value={newDrink.name}
            onChange={(v) => setNewDrink((p) => ({ ...p, name: v }))}
          />
          <Field
            label="Price (₱)"
            type="number"
            value={newDrink.price_php}
            onChange={(v) =>
              setNewDrink((p) => ({ ...p, price_php: Number(v || 0) }))
            }
          />
          <Field
            label="Base Size (ml)"
            type="number"
            value={newDrink.base_size_ml}
            onChange={(v) =>
              setNewDrink((p) => ({ ...p, base_size_ml: Number(v || 0) }))
            }
          />
          <Field
            label="Description"
            value={newDrink.description}
            onChange={(v) => setNewDrink((p) => ({ ...p, description: v }))}
            placeholder="(optional)"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!newDrink.is_active}
              onChange={(e) =>
                setNewDrink((p) => ({ ...p, is_active: e.target.checked }))
              }
            />
            Active
          </label>
        </div>
        <div className="mt-3">
          <button
            onClick={createDrink}
            disabled={creating}
            className="rounded-lg bg-[#D26E3D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create Drink"}
          </button>
        </div>
      </section>

      {/* List + edit */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-gray-800 mb-3">
          All Drinks
        </div>
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-gray-500">No drinks found.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((d) => (
              <div
                key={d.id}
                className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white shadow-sm"
              >
                {/* image header */}
                <div className="h-48 w-full rounded-t-2xl bg-gray-50 flex items-center justify-center overflow-hidden">
                  {d.image_url ? (
                    <img
                      src={d.image_url}
                      alt={d.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-400">
                      No image
                    </div>
                  )}
                </div>

                <div className="px-4 pb-4 space-y-3">
                  {/* file input */}
                  <label className="text-xs text-gray-600">
                    Change image
                    <input
                      type="file"
                      accept="image/*"
                      className="mt-1 block text-sm"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(d.id, file);
                      }}
                    />
                  </label>

                  <Field
                    label="Name"
                    value={d.name}
                    onChange={(v) =>
                      setRows((prev) =>
                        prev.map((x) => (x.id === d.id ? { ...x, name: v } : x))
                      )
                    }
                  />
                  <Field
                    label="Description"
                    value={d.description || ""}
                    onChange={(v) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.id === d.id ? { ...x, description: v } : x
                        )
                      )
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Price (₱)"
                      type="number"
                      value={d.price_php ?? 0}
                      onChange={(v) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === d.id
                              ? { ...x, price_php: Number(v || 0) }
                              : x
                          )
                        )
                      }
                    />
                    <Field
                      label="Base Size (ml)"
                      type="number"
                      value={d.base_size_ml ?? 0}
                      onChange={(v) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === d.id
                              ? { ...x, base_size_ml: Number(v || 0) }
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
                          prev.map((x) =>
                            x.id === d.id
                              ? { ...x, is_active: e.target.checked }
                              : x
                          )
                        )
                      }
                    />
                    Active
                  </label>

                  <div className="pt-1">
                    <button
                      onClick={() => saveDrink(d)}
                      className="w-full rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
                    >
                      Save
                    </button>
                  </div>

                  <div className="rounded-xl border bg-gray-50/60 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs font-semibold text-gray-700">
                        Recipe (base)
                      </div>
                      <button
                        type="button"
                        onClick={() => addRecipeLine(d.id)}
                        className="text-xs font-semibold text-[#D26E3D]"
                      >
                        + Add ingredient
                      </button>
                    </div>

                    {(recipeLines[d.id] || []).length === 0 ? (
                      <div className="text-xs text-gray-500">
                        No recipe lines yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(recipeLines[d.id] || []).map((line, idx) => {
                          const ing = ingredientById.get(line.ingredient_id);
                          return (
                            <div
                              key={`${d.id}-line-${idx}`}
                              className="grid grid-cols-12 gap-2"
                            >
                              <select
                                className="col-span-6 rounded-lg border px-2 py-1 text-xs"
                                value={line.ingredient_id}
                                onChange={(e) => {
                                  const nextId = e.target.value;
                                  const nextIng = ingredientById.get(nextId);
                                  updateRecipeLine(d.id, idx, {
                                    ingredient_id: nextId,
                                    unit: nextIng?.unit_default || line.unit,
                                  });
                                }}
                              >
                                {ingredients.map((ingOpt) => (
                                  <option key={ingOpt.id} value={ingOpt.id}>
                                    {ingOpt.name}
                                  </option>
                                ))}
                              </select>
                              <input
                                className="col-span-3 rounded-lg border px-2 py-1 text-xs"
                                type="number"
                                value={line.amount}
                                onChange={(e) =>
                                  updateRecipeLine(d.id, idx, {
                                    amount: Number(e.target.value || 0),
                                  })
                                }
                              />
                              <select
                                className="col-span-2 rounded-lg border px-2 py-1 text-xs"
                                value={line.unit}
                                onChange={(e) =>
                                  updateRecipeLine(d.id, idx, {
                                    unit: e.target.value,
                                  })
                                }
                              >
                                <option value="g">g</option>
                                <option value="ml">ml</option>
                                <option value="scoop">scoop</option>
                                <option value="piece">piece</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => removeRecipeLine(d.id, idx)}
                                className="col-span-1 text-xs text-red-600"
                                title="Remove line"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-3">
                      <button
                        onClick={() => saveRecipe(d.id)}
                        disabled={recipeSavingId === d.id}
                        className="w-full rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 disabled:opacity-60"
                      >
                        {recipeSavingId === d.id
                          ? "Saving recipe…"
                          : "Save recipe"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-gray-50/60 p-3">
                    <div className="mb-2 text-xs font-semibold text-gray-700">
                      Size recipes
                    </div>
                    <div className="text-[11px] text-gray-500">
                      If a size recipe is empty, the app scales the base recipe.
                    </div>
                    <div className="mt-3 space-y-3">
                      {(drinkSizesByDrink[d.id] || []).length === 0 ? (
                        <div className="text-xs text-gray-500">
                          No sizes configured for this drink.
                        </div>
                      ) : (
                        (drinkSizesByDrink[d.id] || []).map((size) => {
                          const sizeLines = sizeRecipeLines[size.id] || [];
                          const label =
                            size.display_name ||
                            size.size_label ||
                            `${size.size_ml} ml`;
                          const savingKey = size.id;
                        return (
                          <div
                            key={`${d.id}-size-${size.id}`}
                            className="rounded-lg border bg-white p-2"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <div className="text-xs font-semibold text-gray-700">
                                {label}
                              </div>
                              <button
                                type="button"
                                onClick={() => addSizeRecipeLine(size.id)}
                                className="text-xs font-semibold text-[#D26E3D]"
                              >
                                + Add ingredient
                              </button>
                            </div>

                            {sizeLines.length === 0 ? (
                              <div className="text-xs text-gray-500">
                                No size-specific lines.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {sizeLines.map((line, idx) => {
                                  const ing = ingredientById.get(
                                    line.ingredient_id
                                  );
                                  return (
                                    <div
                                      key={`${d.id}-size-${size.id}-${idx}`}
                                      className="grid grid-cols-12 gap-2"
                                    >
                                      <select
                                        className="col-span-6 rounded-lg border px-2 py-1 text-xs"
                                        value={line.ingredient_id}
                                        onChange={(e) => {
                                          const nextId = e.target.value;
                                          const nextIng = ingredientById.get(
                                            nextId
                                          );
                                          updateSizeRecipeLine(size.id, idx, {
                                            ingredient_id: nextId,
                                            unit:
                                              nextIng?.unit_default || line.unit,
                                          });
                                        }}
                                      >
                                        {ingredients.map((ingOpt) => (
                                          <option key={ingOpt.id} value={ingOpt.id}>
                                            {ingOpt.name}
                                          </option>
                                        ))}
                                      </select>
                                      <input
                                        className="col-span-3 rounded-lg border px-2 py-1 text-xs"
                                        type="number"
                                        value={line.amount}
                                        onChange={(e) =>
                                          updateSizeRecipeLine(size.id, idx, {
                                            amount: Number(e.target.value || 0),
                                          })
                                        }
                                      />
                                      <select
                                        className="col-span-2 rounded-lg border px-2 py-1 text-xs"
                                        value={line.unit}
                                        onChange={(e) =>
                                          updateSizeRecipeLine(size.id, idx, {
                                            unit: e.target.value,
                                          })
                                        }
                                      >
                                        <option value="g">g</option>
                                        <option value="ml">ml</option>
                                        <option value="scoop">scoop</option>
                                        <option value="piece">piece</option>
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => removeSizeRecipeLine(size.id, idx)}
                                        className="col-span-1 text-xs text-red-600"
                                        title="Remove line"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="mt-2">
                              <button
                                onClick={() => saveSizeRecipe(size.id)}
                                disabled={sizeRecipeSavingKey === savingKey}
                                className="w-full rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 disabled:opacity-60"
                              >
                                {sizeRecipeSavingKey === savingKey
                                  ? "Saving size recipe…"
                                  : `Save ${label} recipe`}
                              </button>
                            </div>
                          </div>
                        );
                      }))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
