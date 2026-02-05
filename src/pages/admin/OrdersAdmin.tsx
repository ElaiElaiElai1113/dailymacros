// src/pages/OrdersAdminPage.tsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/utils/audit";
import { Search } from "lucide-react";

const STATUS_OPTIONS = [
  "pending",
  "in_progress",
  "ready",
  "picked_up",
  "cancelled",
] as const;
type StatusValue = (typeof STATUS_OPTIONS)[number];

type OrderRow = {
  id: string;
  created_at: string;
  pickup_time: string | null;
  status: StatusValue;
  guest_name: string | null;
  guest_phone: string | null;
  customer_id: string | null;
  total_cents?: number | null;
  subtotal_cents?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  payment_reference?: string | null;
  payment_proof_url?: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  item_name: string;
  unit_price_cents: number;
  line_total_cents?: number | null;
  size_ml?: number | null;
};

type OrderItemIngredientRow = {
  id: string;
  order_item_id: string;
  ingredient_id: string;
  amount: number;
  unit: string;
  is_extra: boolean | null;
  ingredient_name?: string;
};

const STATUS_LABEL: Record<StatusValue, string> = {
  pending: "Pending",
  in_progress: "In progress",
  ready: "Ready",
  picked_up: "Picked up",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<StatusValue, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  ready: "bg-emerald-100 text-emerald-800 border-emerald-200",
  picked_up: "bg-gray-100 text-gray-800 border-gray-200",
  cancelled: "bg-rose-100 text-rose-800 border-rose-200",
};

const PAYMENT_TONE: Record<string, string> = {
  paid: "bg-green-100 text-green-800 border-green-200",
  unpaid: "bg-gray-100 text-gray-700 border-gray-200",
  pending_verification: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const Peso = ({ cents }: { cents?: number | null }) => (
  <span>?{((cents || 0) / 100).toFixed(2)}</span>
);

const Badge = ({ status }: { status: StatusValue }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_TONE[status]}`}
  >
    {STATUS_LABEL[status]}
  </span>
);

const timeAgo = (iso: string) => {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
};

const sizeLabel = (sizeMl?: number | null) => {
  if (!sizeMl) return null;
  const oz = Math.round((sizeMl / 29.5735) * 10) / 10;
  return `${oz} oz`;
};

// Order item card component with collapsible details
function OrderItemCard({
  item,
  lines,
  defaultExpanded = false,
  onPrintLabel,
}: {
  item: OrderItemRow;
  lines: OrderItemIngredientRow[];
  defaultExpanded?: boolean;
  onPrintLabel: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const base = lines.filter((l) => !l.is_extra);
  const extras = lines.filter((l) => !!l.is_extra);

  return (
    <li className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-2 p-2">
        <span className="font-medium text-sm truncate flex-1">
          {item.item_name}
          {sizeLabel(item.size_ml) ? (
            <span className="ml-2 text-[11px] text-gray-500">
              {sizeLabel(item.size_ml)}
            </span>
          ) : null}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-600 font-medium">
            <Peso cents={item.line_total_cents ?? item.unit_price_cents} />
          </span>
          <button
            className="rounded border border-gray-200 px-2 py-0.5 text-[11px] hover:bg-gray-50 transition-colors"
            onClick={() => onPrintLabel(item.id)}
          >
            Print
          </button>
        </div>
      </div>
      {lines.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-[11px] text-gray-500 hover:text-gray-700 py-1.5 px-2 border-t border-gray-100 text-left flex items-center gap-1 hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium">
            {base.length > 0 ? `${base.length} base` : ""}
            {extras.length > 0 ? ` + ${extras.length} add-on${extras.length > 1 ? "s" : ""}` : ""}
          </span>
          <span className="ml-auto">
            {expanded ? "▼" : "▶"}
          </span>
        </button>
      )}
      {expanded && lines.length > 0 && (
        <div className="p-2 pt-0 space-y-1 bg-gray-50/50">
          {base.length > 0 && (
            <div className="text-[11px] text-gray-700">
              <span className="font-semibold text-gray-800">Base:</span>{" "}
              <span className="opacity-80">
                {base.map((l) => l.ingredient_name).join(", ")}
              </span>
            </div>
          )}
          {extras.length > 0 && (
            <div className="text-[11px] text-emerald-700">
              <span className="font-semibold text-emerald-800">Add-ons:</span>{" "}
              <span className="opacity-80">
                {extras.map((l) => `${l.ingredient_name} (${l.amount}${l.unit})`).join(", ")}
              </span>
            </div>
          )}
        </div>
      )}
      {lines.length === 0 && (
        <div className="text-[11px] text-gray-400 py-1 px-2">
          No ingredients
        </div>
      )}
    </li>
  );
}

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, OrderItemRow[]>>({});
  const [linesMap, setLinesMap] = useState<
    Record<string, OrderItemIngredientRow[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"" | StatusValue>("pending");
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [paySavingId, setPaySavingId] = useState<string | null>(null);
  const [paidMethod, setPaidMethod] = useState<Record<string, string>>({});
  const [paidRef, setPaidRef] = useState<Record<string, string>>({});
  const searchTimer = useRef<number | null>(null);

  const debouncedSetSearch = useCallback((v: string) => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => setSearch(v), 200);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: oo, error: eo } = await supabase
        .from("orders")
        .select(
          "id,created_at,pickup_time,status,guest_name,guest_phone,customer_id,subtotal_cents,payment_method,payment_status,payment_reference,payment_proof_url"
        )
        .order("created_at", { ascending: false })
        .limit(250);
      if (eo) throw eo;

      const list = (oo || []) as OrderRow[];
      setOrders(list);

      const orderIds = list.map((o) => o.id);
      if (!orderIds.length) {
        setItemsMap({});
        setLinesMap({});
        return;
      }

      const { data: ii, error: ei } = await supabase
        .from("order_items")
        .select("id,order_id,item_name,unit_price_cents,line_total_cents,size_ml")
        .in("order_id", orderIds);
      if (ei) throw ei;

      const itemRows = (ii || []) as OrderItemRow[];
      const map: Record<string, OrderItemRow[]> = {};
      itemRows.forEach((r) => {
        (map[r.order_id] ||= []).push(r);
      });
      setItemsMap(map);

      const itemIds = itemRows.map((r) => r.id);
      if (!itemIds.length) {
        setLinesMap({});
        return;
      }

      const { data: ll, error: el } = await supabase
        .from("order_item_ingredients")
        .select(
          "id,order_item_id,ingredient_id,amount,unit,is_extra,ingredients(name)"
        )
        .in("order_item_id", itemIds);
      if (el) throw el;

      const byItem: Record<string, OrderItemIngredientRow[]> = {};
      (ll || []).forEach((r: any) => {
        const row: OrderItemIngredientRow = {
          id: r.id,
          order_item_id: r.order_item_id,
          ingredient_id: r.ingredient_id,
          amount: r.amount,
          unit: r.unit,
          is_extra: r.is_extra,
          ingredient_name: r.ingredients?.name ?? r.ingredient_id,
        };
        (byItem[row.order_item_id] ||= []).push(row);
      });
      Object.values(byItem).forEach((arr) =>
        arr.sort((a, b) => Number(!!a.is_extra) - Number(!!b.is_extra))
      );
      setLinesMap(byItem);
    } catch (e: any) {
      setError(e.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  const counts = useMemo(() => {
    const init: Record<StatusValue, number> = {
      pending: 0,
      in_progress: 0,
      ready: 0,
      picked_up: 0,
      cancelled: 0,
    };
    for (const o of orders) init[o.status] += 1;
    return init;
  }, [orders]);

  const filtered = useMemo(() => {
    let list = orders;
    if (activeTab) list = list.filter((o) => o.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.guest_name || "").toLowerCase().includes(q) ||
          (o.guest_phone || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, activeTab, search]);

  const itemsTotal = useCallback(
    (o: OrderRow) => {
      if (typeof o.subtotal_cents === "number") return o.subtotal_cents;
      if (typeof o.total_cents === "number") return o.total_cents;
      const items = itemsMap[o.id] || [];
      return items.reduce(
        (s, it) => s + (it.line_total_cents ?? it.unit_price_cents ?? 0),
        0
      );
    },
    [itemsMap]
  );

  const advanceStatus = (cur: StatusValue): StatusValue => {
    const flow: StatusValue[] = [
      "pending",
      "in_progress",
      "ready",
      "picked_up",
    ];
    const i = flow.indexOf(cur);
    if (i === -1 || i === flow.length - 1) return cur;
    return flow[i + 1];
  };

  const canTransition = (from: StatusValue, to: StatusValue) => {
    if (from === to) return true;
    if (from === "cancelled") return false;
    if (to === "cancelled") return from !== "picked_up";
    const flow: StatusValue[] = ["pending", "in_progress", "ready", "picked_up"];
    const fromIndex = flow.indexOf(from);
    const toIndex = flow.indexOf(to);
    if (fromIndex === -1 || toIndex === -1) return false;
    return toIndex === fromIndex + 1;
  };

  const allowedStatusOptions = (status: StatusValue) => {
    const next = advanceStatus(status);
    const options: StatusValue[] = [status];
    if (next !== status) options.push(next);
    if (canTransition(status, "cancelled")) options.push("cancelled");
    return options;
  };

  const updateOrderStatus = useCallback(
    async (orderId: string, next: StatusValue) => {
      const current = orders.find((o) => o.id === orderId);
      if (!current) return;

      if (!canTransition(current.status, next)) {
        toast({
          variant: "destructive",
          title: "Invalid status change",
          description: `Cannot move from ${STATUS_LABEL[current.status]} to ${STATUS_LABEL[next]}.`,
        });
        return;
      }

      if (current.payment_status !== "paid" && next !== "cancelled") {
        toast({
          variant: "destructive",
          title: "Payment not verified",
          description: "Verify payment before advancing the order.",
        });
        return;
      }

      const prev = orders;
      setOrders((os) =>
        os.map((o) => (o.id === orderId ? { ...o, status: next } : o))
      );
      const { error } = await supabase
        .from("orders")
        .update({ status: next })
        .eq("id", orderId);
      if (error) {
        setOrders(prev);
        toast({
          variant: "destructive",
          title: "Failed to update order status",
          description: error.message,
        });
      } else {
        await logAudit({
          action: "order.status_updated",
          entity_type: "order",
          entity_id: orderId,
          metadata: { status: next },
        });
        toast({
          title: "Order updated",
          description: STATUS_LABEL[next],
        });
      }
    },
    [orders]
  );

  const printLabel = (orderItemId: string) => {
    window.open(
      `/print-label/${orderItemId}`,
      "_blank",
      "width=480,height=720"
    );
  };

  const printAllLabels = (orderId: string) => {
    (itemsMap[orderId] || []).forEach((row) => printLabel(row.id));
  };

  const markPaid = async (orderId: string) => {
    const method = paidMethod[orderId] || "cash";
    const reference =
      method === "cash" ? null : paidRef[orderId]?.trim() || null;
    if (method !== "cash" && !reference) {
      toast({
        variant: "destructive",
        title: "Reference required",
        description: "Enter a transaction/reference number for non-cash payments.",
      });
      return;
    }
    setPaySavingId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        payment_method: method,
        payment_reference: reference,
        paid_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    setPaySavingId(null);
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to mark as paid",
        description: error.message,
      });
    } else {
      await logAudit({
        action: "order.payment_marked_paid",
        entity_type: "order",
        entity_id: orderId,
        metadata: { method, reference },
      });
      toast({
        title: "Payment marked as paid",
        description: "Order is now verified.",
      });
      load();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Manage and track customer orders
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/ops/audit"
            className="text-xs font-semibold text-[#D26E3D] border border-[#D26E3D]/30 rounded-lg px-3 py-2 hover:bg-[#D26E3D]/10 transition-colors"
          >
            View audit log
          </Link>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="w-64 rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30 focus:border-[#D26E3D]"
              placeholder="Search name / phone / ID"
              onChange={(e) => debouncedSetSearch(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm rounded-lg border border-gray-200 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-[#D26E3D] focus:ring-[#D26E3D]"
            />
            <span className="text-gray-700">Auto-refresh</span>
          </label>
          <button
            onClick={load}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Tab
          active={activeTab === ""}
          onClick={() => setActiveTab("")}
          label="All"
          count={orders.length}
        />
        {STATUS_OPTIONS.map((s) => (
          <Tab
            key={s}
            active={activeTab === s}
            onClick={() => setActiveTab(s)}
            label={STATUS_LABEL[s]}
            count={counts[s]}
            tone={STATUS_TONE[s]}
          />
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-5 py-4 text-left min-w-[140px]">Order</th>
                <th className="px-5 py-4 text-left min-w-[130px]">Pickup</th>
                <th className="px-5 py-4 text-left min-w-[140px]">Customer</th>
                <th className="px-5 py-4 text-left min-w-[280px]">Items</th>
                <th className="px-5 py-4 text-left min-w-[80px]">Total</th>
                <th className="px-5 py-4 text-left min-w-[140px]">Status</th>
                <th className="px-5 py-4 text-left min-w-[160px]">Payment</th>
                <th className="px-5 py-4 text-right min-w-[200px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
            {loading ? (
              <RowSkeleton />
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-5 py-6 text-rose-700">
                  {error}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-12 text-center text-gray-500"
                >
                  No orders found.
                </td>
              </tr>
            ) : (
              filtered.map((o) => {
                const items = itemsMap[o.id] || [];
                const next = advanceStatus(o.status);
                const canAdvance =
                  next !== o.status && o.status !== "cancelled";
                const paymentBadgeTone =
                  o.payment_status && PAYMENT_TONE[o.payment_status]
                    ? PAYMENT_TONE[o.payment_status]
                    : PAYMENT_TONE["unpaid"];
                const selectedMethod =
                  paidMethod[o.id] || o.payment_method || "cash";
                const paymentIsVerified = o.payment_status === "paid";
                const allowedStatuses = allowedStatusOptions(o.status);
                const canCancel = canTransition(o.status, "cancelled");

                return (
                  <tr
                    key={o.id}
                    className="border-t align-top hover:bg-gray-50/40"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">
                        {new Date(o.created_at).toLocaleString([], {
                          hour12: true,
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {o.id.slice(0, 8)} � {timeAgo(o.created_at)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {o.pickup_time ? (
                        <>
                          <div className="font-medium">
                            {new Date(o.pickup_time).toLocaleString([], {
                              hour12: true,
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {timeAgo(o.pickup_time)}
                          </div>
                        </>
                      ) : (
                        "�"
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium">
                        {o.guest_name || "Guest"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {o.guest_phone || "�"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <ul className="space-y-1.5 max-w-[380px]">
                        {items.map((item, idx) => (
                          <OrderItemCard
                            key={item.id}
                            item={item}
                            lines={linesMap[item.id] || []}
                            defaultExpanded={idx === 0}
                            onPrintLabel={printLabel}
                          />
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      <Peso cents={itemsTotal(o)} />
                    </td>

                    {/* STATUS COLUMN */}
                    <td className="px-5 py-4">
                      {paymentIsVerified ? (
                        <>
                          <Badge status={o.status} />
                          <div className="mt-2">
                            <select
                              className="w-full rounded-lg border px-2 py-1 text-sm"
                              value={o.status}
                              onChange={(e) =>
                                updateOrderStatus(
                                  o.id,
                                  e.target.value as StatusValue
                                )
                              }
                            >
                              {allowedStatuses.map((s) => (
                                <option key={s} value={s}>
                                  {STATUS_LABEL[s]}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-amber-600">
                          Payment not verified
                        </div>
                      )}
                    </td>

                    {/* PAYMENT COLUMN */}
                    <td className="px-5 py-4">
                      <div
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${paymentBadgeTone}`}
                      >
                        {o.payment_status || "unpaid"}
                      </div>
                      <div className="mt-2 flex flex-col gap-2">
                        <select
                          value={selectedMethod}
                          onChange={(e) =>
                            setPaidMethod((prev) => ({
                              ...prev,
                              [o.id]: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border px-2 py-1 text-sm"
                        >
                          <option value="cash">Cash</option>
                          <option value="gcash">GCash</option>
                          <option value="bank">Bank</option>
                        </select>

                        {/* only show ref input for non-cash */}
                        {selectedMethod !== "cash" && (
                          <input
                            value={paidRef[o.id] ?? o.payment_reference ?? ""}
                            onChange={(e) =>
                              setPaidRef((prev) => ({
                                ...prev,
                                [o.id]: e.target.value,
                              }))
                            }
                            placeholder="Transaction/ref no."
                            className="w-full rounded-lg border px-2 py-1 text-sm"
                          />
                        )}

                        {o.payment_proof_url ? (
                          <a
                            href={o.payment_proof_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-[#D26E3D] underline"
                          >
                            View proof
                          </a>
                        ) : null}
                        <button
                          onClick={() => markPaid(o.id)}
                          disabled={paySavingId === o.id}
                          className="rounded-lg bg-[#D26E3D] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {paySavingId === o.id ? "Saving�" : "Mark as Paid"}
                        </button>
                      </div>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                        onClick={() => {
                          navigator.clipboard.writeText(o.id);
                          toast({
                            title: "Order ID copied",
                            description: o.id.slice(0, 8),
                          });
                        }}
                      >
                        Copy ID
                      </button>
                      <button
                        disabled={!canAdvance || !paymentIsVerified}
                        className={`rounded-lg px-2 py-1 text-xs ${
                          canAdvance && paymentIsVerified
                            ? "border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                            : "border text-gray-400 cursor-not-allowed"
                        }`}
                        onClick={() =>
                          canAdvance &&
                          paymentIsVerified &&
                          updateOrderStatus(o.id, next)
                        }
                        title={
                          paymentIsVerified
                            ? canAdvance
                              ? `Mark as ${STATUS_LABEL[next]}`
                              : "No next step"
                            : "Payment not verified"
                        }
                      >
                        {canAdvance && paymentIsVerified
                          ? `Advance to ${STATUS_LABEL[next]}`
                          : "Advance"}
                      </button>
                      <button
                        disabled={!canCancel}
                        className={`rounded-lg px-2 py-1 text-xs ${
                          canCancel
                            ? "border border-rose-200 text-rose-700 hover:bg-rose-50"
                            : "border text-gray-400 cursor-not-allowed"
                        }`}
                        onClick={() => canCancel && updateOrderStatus(o.id, "cancelled")}
                        title={canCancel ? "Cancel order" : "Cannot cancel"}
                      >
                        Cancel
                      </button>
                      <button
                        className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                        onClick={() => printAllLabels(o.id)}
                        title="Open print labels for all items"
                      >
                        Print all labels
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function Tab({
  active,
  label,
  count,
  onClick,
  tone,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  tone?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
        active
          ? "bg-[#D26E3D] text-white border-[#D26E3D] shadow-sm"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
      }`}
      title={label}
    >
      <span className="truncate max-w-[140px]">{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          active
            ? "bg-white/20 text-white"
            : tone || "bg-gray-100 text-gray-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function RowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="px-3 py-4" colSpan={8}>
        <div className="h-4 w-full rounded bg-gray-100" />
      </td>
    </tr>
  );
}
