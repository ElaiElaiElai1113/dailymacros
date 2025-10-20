import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/** ---- Types (keep minimal & local) ---- */
type DrinkRow = {
  id: string;
  name: string;
  description?: string | null;
  base_size_ml?: number | null;
  price_php: number | null;
  is_active: boolean;
};

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
    <label className="space-y-1">
      <div className="text-xs text-gray-600">{label}</div>
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
      .select("id,name,description,base_size_ml,price_php,is_active")
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
      })
      .eq("id", d.id);
    if (error) alert(error.message);
    else load();
  }

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        <SectionTitle>Add New Drink</SectionTitle>
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
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create Drink"}
          </button>
        </div>
      </section>

      {/* List + edit */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <SectionTitle>All Drinks</SectionTitle>
        {loading ? (
          <div className="mt-3 text-sm text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="mt-3 text-sm text-gray-500">No drinks found.</div>
        ) : (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {filtered.map((d, idx) => (
              <div
                key={d.id}
                className="grid grid-cols-6 items-start gap-2 rounded-xl border bg-gray-50 p-3"
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
                <input
                  className="col-span-3 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
                  value={d.description || ""}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((x, i) =>
                        i === idx ? { ...x, description: e.target.value } : x
                      )
                    )
                  }
                  placeholder="Description"
                />
                <div className="col-span-2 flex items-center gap-1">
                  <span className="text-xs text-gray-500">₱</span>
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
                    type="number"
                    value={d.price_php ?? 0}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x, i) =>
                          i === idx
                            ? { ...x, price_php: Number(e.target.value || 0) }
                            : x
                        )
                      )
                    }
                  />
                </div>
                <div className="col-span-2 flex items-center gap-1">
                  <span className="text-xs text-gray-500">ml</span>
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
                    type="number"
                    value={d.base_size_ml ?? 0}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x, i) =>
                          i === idx
                            ? {
                                ...x,
                                base_size_ml: Number(e.target.value || 0),
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
    </div>
  );
}
