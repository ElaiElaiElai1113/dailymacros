import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
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
  tracking_code: string;
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
  ingredient_name?: string; // joined from ingredients
};

/* ---- UI helpers ---- */
const STATUS_LABEL: Record<StatusValue, string> = {
  pending: "Pending",
  in_progress: "In progress",
  ready: "Ready for pickup",
  picked_up: "Picked up",
  cancelled: "Cancelled",
};

function Peso({ cents }: { cents?: number | null }) {
  return <span>₱{((cents || 0) / 100).toFixed(2)}</span>;
}

function timeShort(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { hour12: true });
}

function Badge({ status }: { status: StatusValue }) {
  const tone: Record<StatusValue, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    in_progress: "bg-blue-100 text-blue-800 border-blue-200",
    ready: "bg-emerald-100 text-emerald-800 border-emerald-200",
    picked_up: "bg-gray-100 text-gray-800 border-gray-200",
    cancelled: "bg-rose-100 text-rose-800 border-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tone[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/* ---- Page ---- */
export default function TrackOrderPage() {
  const { code = "" } = useParams();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [linesMap, setLinesMap] = useState<
    Record<string, OrderItemIngredientRow[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);

      // 1) Find order by tracking_code
      const { data: oo, error: eo } = await supabase
        .from("orders")
        .select(
          "id,created_at,pickup_time,status,guest_name,guest_phone,tracking_code"
        )
        .eq("tracking_code", code)
        .limit(1);

      if (eo) throw eo;
      const o = (oo?.[0] as OrderRow) || null;
      if (!o) {
        throw new Error("Order not found. Please check your link.");
      }
      setOrder(o);

      // 2) Items
      const { data: ii, error: ei } = await supabase
        .from("order_items")
        .select("id,order_id,item_name,unit_price_cents,line_total_cents")
        .eq("order_id", o.id)
        .order("position", { ascending: true });

      if (ei) throw ei;
      const itemsRows = (ii || []) as OrderItemRow[];
      setItems(itemsRows);

      // 3) Ingredient lines (with ingredient name)
      if (itemsRows.length) {
        const itemIds = itemsRows.map((r) => r.id);
        const { data: ll, error: el } = await supabase
          .from("order_item_ingredients")
          .select(
            "id,order_item_id,ingredient_id,amount,unit,is_extra,ingredients(name)"
          )
          .in("order_item_id", itemIds);

        if (el) throw el;
        const map: Record<string, OrderItemIngredientRow[]> = {};
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
          (map[row.order_item_id] ||= []).push(row);
        });

        // base first, then extras
        Object.values(map).forEach((arr) =>
          arr.sort((a, b) => Number(!!a.is_extra) - Number(!!b.is_extra))
        );
        setLinesMap(map);
      } else {
        setLinesMap({});
      }
    } catch (e: any) {
      setErr(e.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  // Supabase realtime: listen to order status changes
  useEffect(() => {
    if (!order?.id) return;
    const channel = supabase
      .channel(`order_${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          const next = payload.new as OrderRow;
          setOrder((cur) => (cur ? { ...cur, status: next.status } : cur));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id]);

  useEffect(() => {
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const subtotal = useMemo(() => {
    return items.reduce(
      (s, it) => s + (it.line_total_cents ?? it.unit_price_cents ?? 0),
      0
    );
  }, [items]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600">
          Loading order…
        </div>
      </div>
    );
  }
  if (err || !order) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="rounded-2xl border bg-white p-6 text-sm text-rose-700">
          {err || "Order not found"}
        </div>
        <div className="mt-3">
          <Link to="/" className="text-sm underline">
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Track your order</h1>
          <div className="mt-1 text-sm text-gray-600">
            Tracking code:{" "}
            <span className="font-mono">{order.tracking_code}</span>
          </div>
          <div className="mt-1 text-sm text-gray-600">
            Pickup time: <b>{timeShort(order.pickup_time)}</b>
          </div>
        </div>
        <Badge status={order.status} />
      </header>

      {/* Progress steps */}
      <div className="rounded-2xl border bg-white p-4">
        <Steps current={order.status} />
      </div>

      {/* Items */}
      <section className="rounded-2xl border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-semibold">Your items</div>
          <div className="rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
            {items.length} item{items.length > 1 ? "s" : ""}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-gray-500">No items.</div>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => {
              const lines = linesMap[it.id] || [];
              const base = lines.filter((l) => !l.is_extra);
              const extras = lines.filter((l) => !!l.is_extra);
              return (
                <li key={it.id} className="rounded border p-3 bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate">{it.item_name}</div>
                    <div className="text-gray-700">
                      <Peso
                        cents={it.line_total_cents ?? it.unit_price_cents}
                      />
                    </div>
                  </div>

                  {/* Ingredient breakdown */}
                  {lines.length > 0 && (
                    <div className="mt-2 space-y-1 text-[12px]">
                      {base.length > 0 && (
                        <div className="text-gray-700">
                          <span className="font-semibold">Base:</span>{" "}
                          {base
                            .map(
                              (l) =>
                                `${l.ingredient_name} — ${l.amount} ${l.unit}`
                            )
                            .join("; ")}
                        </div>
                      )}
                      {extras.length > 0 && (
                        <div className="text-emerald-700">
                          <span className="font-semibold">Add-ons:</span>{" "}
                          {extras
                            .map(
                              (l) =>
                                `${l.ingredient_name} — ${l.amount} ${l.unit}`
                            )
                            .join("; ")}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-3 flex items-center justify-between text-base">
          <div className="font-medium">Subtotal</div>
          <div className="font-semibold">
            <Peso cents={subtotal} />
          </div>
        </div>
      </section>

      {/* Help / footer */}
      <footer className="rounded-2xl border bg-white p-4 text-sm text-gray-600">
        Show this page to staff when picking up your order. If you lose this
        link, ask staff to look up your order by name and pickup time.
      </footer>
    </div>
  );
}

/* ---- Steps component ---- */
function Steps({ current }: { current: StatusValue }) {
  const steps: { key: StatusValue; label: string }[] = [
    { key: "pending", label: "Received" },
    { key: "in_progress", label: "Being prepared" },
    { key: "ready", label: "Ready for pickup" },
    { key: "picked_up", label: "Completed" },
  ];

  if (current === "cancelled") {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-rose-700">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          <span className="font-medium">Order cancelled</span>
        </div>
      </div>
    );
  }

  const idx = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-3">
      {steps.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s.key} className="flex items-center gap-3">
            <div
              className={`grid place-items-center h-7 w-7 rounded-full text-[11px] font-semibold border 
              ${
                done
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : active
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : "bg-gray-50 text-gray-500 border-gray-200"
              }`}
              title={s.label}
            >
              {i + 1}
            </div>
            <div
              className={`text-xs ${
                active ? "text-gray-900 font-medium" : "text-gray-500"
              }`}
            >
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-px w-10 md:w-16 ${
                  done ? "bg-emerald-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
