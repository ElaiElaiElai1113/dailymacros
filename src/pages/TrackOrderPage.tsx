import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { formatCents } from "@/utils/format";
import { formatGroupedIngredientLines, groupIngredientLines } from "@/utils/addons";
import { withRetry } from "@/utils/retry";

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

const STATUS_ICONS: Record<StatusValue, React.ReactNode> = {
  pending: "P",
  in_progress: "IP",
  ready: "R",
  picked_up: "Done",
  cancelled: "X",
};

const Peso = ({ cents }: { cents?: number | null }) => (
  <span>{formatCents(cents || 0)}</span>
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
  iso ? new Date(iso).toLocaleString([], { hour12: true }) : "--";

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
      const { data, error } = (await withRetry(async () =>
        supabase.rpc("get_order_tracking", { p_tracking_code: code })
      )) as { data: any; error: any };
      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || "Order not found. Please check your link.");
      }

      const o = data.order as OrderRow;
      const itemRows = (data.items || []) as OrderItemRow[];
      const lineRows = (data.lines || []) as OrderItemIngredientRow[];
      const macroRows = (data.macros || []) as ItemMacroRow[];

      setOrder(o);
      setItems(itemRows);

      const byItem: Record<string, OrderItemIngredientRow[]> = {};
      lineRows.forEach((row) => {
        (byItem[row.order_item_id] ||= []).push(row);
      });
      Object.values(byItem).forEach((arr) =>
        arr.sort((a, b) => Number(!!a.is_extra) - Number(!!b.is_extra))
      );
      setLinesMap(byItem);

      const macrosByItem: Record<string, ItemMacroRow> = {};
      macroRows.forEach((m) => {
        macrosByItem[m.order_item_id] = m;
      });
      setMacrosMap(macrosByItem);
    } catch (e: any) {
      setErr(e.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

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
        <Card>Loading order...</Card>
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
              const baseGrouped = groupIngredientLines(base);
              const extrasGrouped = groupIngredientLines(extras);
              const m = macrosMap[it.id];

              return (
                <li key={it.id} className="rounded-xl border p-3 bg-white">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {it.item_name}
                      </div>
                      <div className="mt-1 grid gap-1 text-[12px]">
                        {baseGrouped.length > 0 && (
                          <div className="text-gray-700">
                            <span className="font-medium">Base:</span>{" "}
                            {formatGroupedIngredientLines(baseGrouped, { maxChars: 90 })}
                          </div>
                        )}
                        {extrasGrouped.length > 0 && (
                          <div className="text-emerald-700">
                            <span className="font-medium">Add-ons:</span>{" "}
                            {formatGroupedIngredientLines(extrasGrouped, { maxChars: 90 })}
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
  const steps: { key: StatusValue; label: string; icon: string }[] = [
    { key: "pending", label: "Received", icon: "1" },
    { key: "in_progress", label: "Being prepared", icon: "2" },
    { key: "ready", label: "Ready for pickup", icon: "3" },
    { key: "picked_up", label: "Completed", icon: "4" },
  ];

  if (current === "cancelled") {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-rose-700">
          <span className="text-2xl">X</span>
          <span className="font-medium text-lg">Order cancelled</span>
        </div>
      </div>
    );
  }

  const idx = steps.findIndex((s) => s.key === current);
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-2">
      {steps.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s.key} className="flex flex-1 items-center gap-3">
            <div className="relative flex items-center gap-4 flex-1">
              {/* Circle with icon */}
              <div
                className={`relative grid h-10 w-10 place-items-center rounded-full text-lg font-semibold border-2 transition-all duration-300 ${
                  done
                    ? "bg-emerald-600 text-white border-emerald-600 scale-110"
                    : active
                    ? "bg-[#D26E3D] text-white border-[#D26E3D] scale-110 shadow-lg shadow-[#D26E3D]/30"
                    : "bg-gray-50 text-gray-400 border-gray-300"
                }`}
                title={s.label}
              >
                {done ? "OK" : active ? STATUS_ICONS[s.key] : i + 1}
              </div>

              {/* Label */}
              <div
                className={`flex flex-col transition-all duration-300 ${
                  active ? "scale-105" : ""
                }`}
              >
                <div
                  className={`text-sm font-medium ${
                    active
                      ? "text-[#D26E3D]"
                      : done
                      ? "text-emerald-600"
                      : "text-gray-500"
                  }`}
                >
                  {s.label}
                </div>
              </div>

              {/* Connecting line */}
              {i < steps.length - 1 && (
                <div className="flex-1 h-1 mt-5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      done ? "bg-emerald-600" : "bg-gray-200"
                    }`}
                    style={{ width: done ? "100%" : active ? "50%" : "0%" }}
                  />
                </div>
              )}
            </div>
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
