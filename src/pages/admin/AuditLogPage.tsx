import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { Search } from "lucide-react";

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
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to load audit log",
        description: error.message,
      });
      return;
    }
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Track admin changes across ingredients, drinks, and orders
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          Refresh
        </button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            className="w-80 rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30 focus:border-[#D26E3D]"
            placeholder="Search by actor, action, or entity…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
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

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">Loading audit log…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600">No audit entries found</p>
            <p className="text-xs text-gray-500 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left min-w-[130px]">Time</th>
                  <th className="px-4 py-3 text-left min-w-[160px]">Actor</th>
                  <th className="px-4 py-3 text-left min-w-[180px]">Action</th>
                  <th className="px-4 py-3 text-left min-w-[120px]">Entity</th>
                  <th className="px-4 py-3 text-left min-w-[300px]">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-4 py-3 text-gray-600 align-top">
                      <div className="font-medium text-gray-900 text-xs">
                        {formatTime(r.created_at).date}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {formatTime(r.created_at).time}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-900 text-xs">
                        {r.actor_name || "Unknown"}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {r.actor_role || "role?"}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                        {labelForAction(r.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 align-top">
                      <div className="font-medium text-gray-900 text-xs">
                        {labelForEntity(r.entity_type)}
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono">
                        {r.entity_id ? r.entity_id.slice(0, 8) : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 align-top">
                      {formatDetails(r.metadata).length === 0 ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {formatDetails(r.metadata).map((item) => (
                            <span
                              key={`${r.id}-${item.label}`}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5"
                              title={`${item.label}: ${item.value}`}
                            >
                              <span className="text-gray-500 font-medium">
                                {item.label}:
                              </span>{" "}
                              <span className="font-semibold text-gray-800 truncate max-w-[100px]">
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
