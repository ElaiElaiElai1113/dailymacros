import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

/* ----------------------------- Types ----------------------------- */
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

type ItemMacroRow = {
  order_item_id: string;
  order_id?: string;
  item_name?: string;
  total_kcal: number | null;
  total_protein_g: number | null;
  total_fat_g: number | null;
  total_carbs_g: number | null;
  total_sugars_g: number | null;
  total_fiber_g: number | null;
  total_sodium_mg: number | null;
};

/* ----------------------------- UI helpers ----------------------------- */
const BRAND = "#D26E3D";

const STATUS_LABEL: Record<StatusValue, string> = {
  pending: "Pending",
  in_progress: "In progress",
  ready: "Ready for pickup",
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

const Peso = ({ cents }: { cents?: number | null }) => (
  <span>₱{((cents || 0) / 100).toFixed(2)}</span>
);

function Badge({ status }: { status: StatusValue }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_TONE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const timeShort = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString([], { hour12: true }) : "—";

/* ----------------------------- Page ----------------------------- */
export default function TrackOrderPage() {
  const { code = "" } = useParams();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [linesMap, setLinesMap] = useState<
    Record<string, OrderItemIngredientRow[]>
  >({});
  const [macrosMap, setMacrosMap] = useState<Record<string, ItemMacroRow>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  /* --------------- Load order + items + ingredients + macros --------------- */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);

      // 1) Order (via tracking_code)
      const { data: oo, error: eo } = await supabase
        .from("orders")
        .select(
          "id,created_at,pickup_time,status,guest_name,guest_phone,tracking_code"
        )
        .eq("tracking_code", code)
        .limit(1);

      if (eo) throw eo;
      const o = (oo?.[0] as OrderRow) || null;
      if (!o) throw new Error("Order not found. Please check your link.");
      setOrder(o);

      // 2) Items
      const { data: ii, error: ei } = await supabase
        .from("order_items")
        .select("id,order_id,item_name,unit_price_cents,line_total_cents")
        .eq("order_id", o.id)
        .order("position", { ascending: true });
      if (ei) throw ei;
      const itemRows = (ii || []) as OrderItemRow[];
      setItems(itemRows);

      // 3) Ingredient lines (joined to ingredient name)
      if (itemRows.length) {
        const itemIds = itemRows.map((r) => r.id);
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
        // base first, then extras
        Object.values(byItem).forEach((arr) =>
          arr.sort((a, b) => Number(!!a.is_extra) - Number(!!b.is_extra))
        );
        setLinesMap(byItem);
      } else {
        setLinesMap({});
      }

      // 4) Per-item macros (via view), map by order_item_id
      if (itemRows.length) {
        const itemIds = itemRows.map((r) => r.id);
        const { data: mm, error: em } = await supabase
          .from("order_item_macros_v")
          .select(
            "order_item_id,total_kcal,total_protein_g,total_fat_g,total_carbs_g,total_sugars_g,total_fiber_g,total_sodium_mg"
          )
          .in("order_item_id", itemIds);
        if (em) {
          // If the view isn't ready, just skip macros
          setMacrosMap({});
        } else {
          const dict: Record<string, ItemMacroRow> = {};
          (mm || []).forEach((m: any) => {
            dict[m.order_item_id] = {
              order_item_id: m.order_item_id,
              total_kcal: m.total_kcal,
              total_protein_g: m.total_protein_g,
              total_fat_g: m.total_fat_g,
              total_carbs_g: m.total_carbs_g,
              total_sugars_g: m.total_sugars_g,
              total_fiber_g: m.total_fiber_g,
              total_sodium_mg: m.total_sodium_mg,
            };
          });
          setMacrosMap(dict);
        }
      } else {
        setMacrosMap({});
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

  // Realtime: status updates
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
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [order?.id]);

  // Light polling as backup
  useEffect(() => {
    pollRef.current = window.setInterval(load, 20000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [load]);

  /* ----------------------------- Derived ----------------------------- */
  const subtotal = useMemo(
    () =>
      items.reduce(
        (s, it) => s + (it.line_total_cents ?? it.unit_price_cents ?? 0),
        0
      ),
    [items]
  );

  const totals = useMemo(() => {
    const acc = {
      kcal: 0,
      p: 0,
      c: 0,
      f: 0,
      sug: 0,
      fib: 0,
      na: 0,
    };
    items.forEach((it) => {
      const m = macrosMap[it.id];
      if (!m) return;
      acc.kcal += Number(m.total_kcal || 0);
      acc.p += Number(m.total_protein_g || 0);
      acc.c += Number(m.total_carbs_g || 0);
      acc.f += Number(m.total_fat_g || 0);
      acc.sug += Number(m.total_sugars_g || 0);
      acc.fib += Number(m.total_fiber_g || 0);
      acc.na += Number(m.total_sodium_mg || 0);
    });
    return acc;
  }, [items, macrosMap]);

  /* ------------------------------ Render ------------------------------ */
  if (loading) {
    return (
      <PageShell>
        <Card>Loading order…</Card>
      </PageShell>
    );
  }
  if (err || !order) {
    return (
      <PageShell>
        <Card className="text-rose-700">{err || "Order not found"}</Card>
        <div className="mt-3">
          <Link to="/" className="text-sm underline">
            Go back home
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm relative">
        <BrandGlow />
        <div className="flex items-start justify-between gap-4 relative">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Track your order
            </h1>
            <div className="mt-1 text-sm text-gray-600">
              Tracking code:{" "}
              <span className="font-mono">{order.tracking_code}</span>
            </div>
            <div className="mt-1 text-sm text-gray-600">
              Pickup time: <b>{timeShort(order.pickup_time)}</b>
            </div>
          </div>
          <Badge status={order.status} />
        </div>
      </div>

      {/* Stepper */}
      <Card>
        <Steps current={order.status} />
      </Card>

      {/* Items + per-item macros */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <div className="font-semibold">Your items</div>
          <div className="rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
            {items.length} item{items.length > 1 ? "s" : ""}
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-gray-500">No items.</div>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => {
              const lines = linesMap[it.id] || [];
              const base = lines.filter((l) => !l.is_extra);
              const extras = lines.filter((l) => !!l.is_extra);
              const m = macrosMap[it.id];

              return (
                <li key={it.id} className="rounded-xl border p-3 bg-white">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {it.item_name}
                      </div>
                      <div className="mt-1 grid gap-1 text-[12px]">
                        {base.length > 0 && (
                          <div className="text-gray-700">
                            <span className="font-medium">Base:</span>{" "}
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
                            <span className="font-medium">Add-ons:</span>{" "}
                            {extras
                              .map(
                                (l) =>
                                  `${l.ingredient_name} — ${l.amount} ${l.unit}`
                              )
                              .join("; ")}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold">
                        <Peso
                          cents={it.line_total_cents ?? it.unit_price_cents}
                        />
                      </div>
                      {/* Per-item macros */}
                      {m ? (
                        <div className="mt-2 inline-flex rounded-lg border px-2 py-1 text-[11px] bg-[rgba(210,110,61,0.05)] border-[rgba(210,110,61,0.25)]">
                          <div className="flex items-center gap-2">
                            <b className="text-[13px]" style={{ color: BRAND }}>
                              {Math.round(m.total_kcal || 0)} kcal
                            </b>
                            <span className="text-gray-600">P</span>
                            <b className="text-gray-800">
                              {(m.total_protein_g || 0).toFixed(1)}g
                            </b>
                            <span className="text-gray-600">C</span>
                            <b className="text-gray-800">
                              {(m.total_carbs_g || 0).toFixed(1)}g
                            </b>
                            <span className="text-gray-600">F</span>
                            <b className="text-gray-800">
                              {(m.total_fat_g || 0).toFixed(1)}g
                            </b>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-gray-400">
                          Macros unavailable
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-between text-base">
          <div className="font-medium">Subtotal</div>
          <div className="font-semibold">
            <Peso cents={subtotal} />
          </div>
        </div>
      </Card>

      {/* Totals strip */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-2 font-semibold">Total Nutrition</div>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <Chip>
            <strong style={{ color: BRAND }}>{Math.round(totals.kcal)}</strong>{" "}
            kcal
          </Chip>
          <Chip>
            P <strong>{totals.p.toFixed(1)}g</strong>
          </Chip>
          <Chip>
            C <strong>{totals.c.toFixed(1)}g</strong>
          </Chip>
          <Chip>
            F <strong>{totals.f.toFixed(1)}g</strong>
          </Chip>
          <Chip muted>
            Sug <strong>{totals.sug.toFixed(1)}g</strong>
          </Chip>
          <Chip muted>
            Fib <strong>{totals.fib.toFixed(1)}g</strong>
          </Chip>
          <Chip muted>
            Na <strong>{Math.round(totals.na)}mg</strong>
          </Chip>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Values are estimates based on your selections.
        </p>
      </div>

      {/* Footer */}
      <Card className="text-sm text-gray-600">
        Show this page to staff when picking up your order. If you lose this
        link, ask staff to look up your order by name and pickup time.
      </Card>
    </PageShell>
  );
}

/* ----------------------------- UI bits ----------------------------- */
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
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
      {steps.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s.key} className="flex items-center gap-3">
            <div
              className={`grid place-items-center h-7 w-7 rounded-full text-[11px] font-semibold border transition
              ${
                done
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : active
                  ? "bg-[rgba(210,110,61,0.12)] text-[color:var(--brand)] border-[rgba(210,110,61,0.35)]"
                  : "bg-gray-50 text-gray-500 border-gray-200"
              }`}
              style={
                active
                  ? ({ ["--brand" as any]: BRAND } as React.CSSProperties)
                  : undefined
              }
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

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl p-4 space-y-6">{children}</div>;
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Chip({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
        muted
          ? "bg-gray-50 border-gray-200 text-gray-700"
          : "bg-white border-[rgba(210,110,61,0.25)]"
      }`}
      style={!muted ? { background: "rgba(210,110,61,0.05)" } : undefined}
    >
      {children}
    </span>
  );
}

function BrandGlow() {
  return (
    <span
      aria-hidden="true"
      className="absolute -inset-3 -z-10 rounded-3xl blur-2xl opacity-70"
      style={{
        background:
          "linear-gradient(135deg, rgba(236,186,79,0.25), rgba(89,145,144,0.2))",
      }}
    />
  );
}
