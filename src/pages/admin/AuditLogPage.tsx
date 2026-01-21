import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AuditRow = {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, any> | null;
};

const ACTION_LABELS: Record<string, string> = {
  "ingredient.updated": "Ingredient updated",
  "ingredient.created": "Ingredient created",
  "ingredient.activated": "Ingredient activated",
  "ingredient.deactivated": "Ingredient deactivated",
  "ingredient_nutrition.upserted": "Nutrition updated",
  "ingredient_pricing.upserted": "Pricing updated",
  "drink.created": "Drink created",
  "drink.updated": "Drink updated",
  "order.status_updated": "Order status updated",
  "order.payment_marked_paid": "Order marked as paid",
};

const ENTITY_LABELS: Record<string, string> = {
  ingredient: "Ingredient",
  drink: "Drink",
  order: "Order",
};

function labelForAction(action: string) {
  return ACTION_LABELS[action] ?? action.replaceAll(".", " ");
}

function labelForEntity(entity: string) {
  return ENTITY_LABELS[entity] ?? entity;
}

function formatDetails(meta: Record<string, any> | null) {
  if (!meta) return [];
  const entries = Object.entries(meta).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );
  const labelMap: Record<string, string> = {
    name: "Name",
    category: "Category",
    unit_default: "Default unit",
    grams_per_unit: "Grams per unit",
    density_g_per_ml: "Density (g/ml)",
    allergen_tags: "Allergens",
    is_addon: "Add-on",
    pricing_mode: "Pricing mode",
    price_php: "Price (₱)",
    per_php: "Per (₱)",
    unit_label: "Unit label",
    status: "Status",
    method: "Payment method",
    reference: "Payment reference",
    base_size_ml: "Base size (ml)",
    image_url: "Image URL",
    is_active: "Active",
  };
  return entries.slice(0, 8).map(([k, v]) => {
    const label = labelMap[k] ?? k.replaceAll("_", " ");
    if (Array.isArray(v)) return { label, value: v.join(", ") || "—" };
    if (typeof v === "boolean") return { label, value: v ? "Yes" : "No" };
    return { label, value: String(v) };
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("audit_log")
      .select(
        "id,created_at,actor_id,actor_name,actor_role,action,entity_type,entity_id,metadata"
      )
      .order("created_at", { ascending: false })
      .limit(200);
    setLoading(false);
    if (error) return alert(error.message);
    setRows((data || []) as AuditRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  const entityOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.entity_type));
    return Array.from(set).sort();
  }, [rows]);

  const actionOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.action));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    return rows.filter((r) => {
      if (entityFilter !== "all" && r.entity_type !== entityFilter) return false;
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (!term) return true;
      return (
        r.action.toLowerCase().includes(term) ||
        r.entity_type.toLowerCase().includes(term) ||
        (r.entity_id || "").toLowerCase().includes(term) ||
        (r.actor_name || "").toLowerCase().includes(term) ||
        (r.actor_role || "").toLowerCase().includes(term)
      );
    });
  }, [rows, q, entityFilter, actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Audit log</h1>
          <p className="text-sm text-gray-600">
            Track admin changes across ingredients, pricing, nutrition, drinks,
            and orders.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="w-72 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
          placeholder="Search by actor, action, or entity…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
        >
          <option value="all">All entities</option>
          {entityOptions.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="all">All actions</option>
          {actionOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm">
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No audit entries.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Actor</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Entity</th>
                  <th className="px-4 py-3 text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3 text-gray-600">
                      <div className="font-medium text-gray-800">
                        {formatTime(r.created_at).date}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTime(r.created_at).time}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {r.actor_name || "Unknown"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {r.actor_role || "role?"}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {labelForAction(r.action)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="font-medium text-gray-800">
                        {labelForEntity(r.entity_type)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {r.entity_id ? `${r.entity_id.slice(0, 8)}…` : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {formatDetails(r.metadata).length === 0 ? (
                        "—"
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {formatDetails(r.metadata).map((item) => (
                            <span
                              key={`${r.id}-${item.label}`}
                              className="rounded-full border bg-white px-2 py-1"
                            >
                              <span className="text-gray-500">
                                {item.label}:
                              </span>{" "}
                              <span className="font-medium text-gray-800">
                                {item.value}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
