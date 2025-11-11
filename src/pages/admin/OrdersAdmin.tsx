// src/pages/OrdersAdminPage.tsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

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
  <span>₱{((cents || 0) / 100).toFixed(2)}</span>
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

const toast = (msg: string) => {
  const t = document.createElement("div");
  t.textContent = msg;
  t.className =
    "fixed bottom-4 right-4 z-50 rounded bg-black/80 px-3 py-1.5 text-xs text-white";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1400);
};

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
        .select("id,order_id,item_name,unit_price_cents,line_total_cents")
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

  const updateOrderStatus = useCallback(
    async (orderId: string, next: StatusValue) => {
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
        alert(error.message);
      } else {
        toast(`Order updated: ${STATUS_LABEL[next]}`);
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
      alert(error.message);
    } else {
      toast("Payment marked as paid");
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-gray-900">Orders</h1>
        <div className="flex items-center gap-2">
          <input
            className="w-64 rounded-lg border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="Search name / phone / ID…"
            onChange={(e) => debouncedSetSearch(e.target.value)}
          />
          <label className="ml-2 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button
            onClick={load}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
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

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-600">
            <tr>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Pickup</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Items</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Payment</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <RowSkeleton />
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-rose-700">
                  {error}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-10 text-center text-gray-500"
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

                return (
                  <tr
                    key={o.id}
                    className="border-t align-top hover:bg-gray-50/40"
                  >
                    <td className="px-3 py-3">
                      <div className="font-medium text-gray-900">
                        {new Date(o.created_at).toLocaleString([], {
                          hour12: true,
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {o.id.slice(0, 8)} • {timeAgo(o.created_at)}
                      </div>
                    </td>
                    <td className="px-3 py-3">
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
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium">
                        {o.guest_name || "Guest"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {o.guest_phone || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <ul className="space-y-2 max-w-[480px]">
                        {items.map((item) => {
                          const lines = linesMap[item.id] || [];
                          const base = lines.filter((l) => !l.is_extra);
                          const extras = lines.filter((l) => !!l.is_extra);
                          return (
                            <li
                              key={item.id}
                              className="rounded border p-2 bg-white"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium truncate">
                                  {item.item_name}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600">
                                    <Peso
                                      cents={
                                        item.line_total_cents ??
                                        item.unit_price_cents
                                      }
                                    />
                                  </span>
                                  <button
                                    className="rounded border px-2 py-0.5 text-[11px] hover:bg-gray-50"
                                    onClick={() => printLabel(item.id)}
                                  >
                                    Print label
                                  </button>
                                </div>
                              </div>
                              {lines.length > 0 ? (
                                <div className="mt-1 grid gap-1">
                                  {base.length > 0 && (
                                    <div className="text-[11px] text-gray-700">
                                      <span className="font-semibold">
                                        Base:
                                      </span>{" "}
                                      {base
                                        .map(
                                          (l) =>
                                            `${l.ingredient_name} — ${l.amount} ${l.unit}`
                                        )
                                        .join("; ")}
                                    </div>
                                  )}
                                  {extras.length > 0 && (
                                    <div className="text-[11px] text-emerald-700">
                                      <span className="font-semibold">
                                        Add-ons:
                                      </span>{" "}
                                      {extras
                                        .map(
                                          (l) =>
                                            `${l.ingredient_name} — ${l.amount} ${l.unit}`
                                        )
                                        .join("; ")}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="mt-1 text-[11px] text-gray-400">
                                  No ingredient lines.
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                    <td className="px-3 py-3 font-semibold">
                      <Peso cents={itemsTotal(o)} />
                    </td>

                    {/* STATUS COLUMN */}
                    <td className="px-3 py-3">
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
                              {STATUS_OPTIONS.map((s) => (
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
                    <td className="px-3 py-3">
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
                          {paySavingId === o.id ? "Saving…" : "Mark as Paid"}
                        </button>
                      </div>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-3 py-3 text-right space-x-2">
                      <button
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                        onClick={() => {
                          navigator.clipboard.writeText(o.id);
                          toast("Order ID copied");
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
                          ? `→ ${STATUS_LABEL[next]}`
                          : "—"}
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
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? "bg-indigo-600 text-white border-indigo-600"
          : "bg-white text-gray-700 hover:bg-gray-50"
      }`}
      title={label}
    >
      <span className="truncate max-w-[140px]">{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
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
