// src/pages/admin/DrinksAdminPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type DrinkRow = {
  id: string;
  name: string;
  description?: string | null;
  base_size_ml?: number | null;
  price_php: number | null;
  is_active: boolean;
  image_url?: string | null;
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

  useEffect(() => {
    load();
  }, []);

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
    else load();
  }

  // upload handler (assuming you already added this to your version)
  async function handleUpload(drinkId: string, file: File) {
    const ext = file.name.split(".").pop() || "png";
    const path = `${drinkId}.${ext}`;

    const { data, error } = await supabase.storage
      .from("drinks")
      .upload(path, file, {
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
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
