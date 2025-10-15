import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabaseClient";

type CartLine = {
  ingredient_id: string;
  amount: number;
  unit: string;
  role?: "base" | "extra";
  name?: string;
};
type CartItem = {
  item_name: string;
  unit_price_cents: number;
  lines: CartLine[];
  base_drink_name?: string;
  base_price_cents?: number;
  addons_price_cents?: number;
};

function Price({ cents }: { cents: number }) {
  return <span>₱{(cents / 100).toFixed(2)}</span>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </div>
  );
}
const getLineLabel = (l: CartLine, dict: Record<string, string>) =>
  l.name || dict[l.ingredient_id] || l.ingredient_id;

const titleFor = (it: CartItem) =>
  it.base_drink_name ? `Custom — ${it.base_drink_name}` : it.item_name;

export default function CartPage() {
  const { items, removeItem, clear } = useCart() as {
    items: CartItem[];
    removeItem: (idx: number) => void;
    clear: () => void;
  };

  // Fallback ingredient names
  const [nameDict, setNameDict] = useState<Record<string, string>>({});
  useEffect(() => {
    const needsLookup = items.some((it) =>
      (it.lines || []).some((l) => !l.name)
    );
    if (!needsLookup) return;
    (async () => {
      const { data } = await supabase
        .from("ingredients")
        .select("id,name")
        .eq("is_active", true);
      setNameDict(
        Object.fromEntries((data ?? []).map((x: any) => [x.id, x.name]))
      );
    })();
  }, [items]);

  const total = useMemo(
    () => items.reduce((s, i) => s + (i.unit_price_cents || 0), 0),
    [items]
  );

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Cart</h1>
        {items.length > 0 && (
          <button
            onClick={clear}
            className="text-sm rounded-lg border px-3 py-1.5 hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-gray-600">
          Your cart is empty.{" "}
          <Link to="/menu" className="underline">
            Browse the menu
          </Link>{" "}
          or{" "}
          <Link to="/build" className="underline">
            build your own
          </Link>
          .
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it, idx) => (
            <CartItemCard
              key={idx}
              item={it}
              onRemove={() => removeItem(idx)}
              nameDict={nameDict}
            />
          ))}

          <div className="mt-4 rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between text-lg font-semibold">
              <div>Total</div>
              <div>
                <Price cents={total} />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                to="/checkout"
                className="rounded-lg bg-[#D26E3D] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Checkout
              </Link>
              <Link
                to="/menu"
                className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CartItemCard({
  item,
  onRemove,
  nameDict,
}: {
  item: CartItem;
  onRemove: () => void;
  nameDict: Record<string, string>;
}) {
  const [open, setOpen] = useState(true);
  const baseLines = useMemo(
    () => (item.lines || []).filter((l) => l.role === "base"),
    [item.lines]
  );
  const extraLines = useMemo(
    () => (item.lines || []).filter((l) => l.role !== "base"),
    [item.lines]
  );
  const hasBreakdown =
    typeof item.base_price_cents === "number" &&
    typeof item.addons_price_cents === "number";

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold">{titleFor(item)}</div>
          <div className="text-xs text-gray-500">
            {(item.lines || []).length} ingredients
          </div>
        </div>
        <div className="text-right">
          <div className="text-base font-semibold">
            <Price cents={item.unit_price_cents || 0} />
          </div>
          <div className="mt-1 flex items-center gap-2 justify-end">
            <button
              onClick={() => setOpen((v) => !v)}
              className="text-xs rounded border px-2 py-1 hover:bg-gray-50"
            >
              {open ? "Hide details" : "Show details"}
            </button>
            <button
              onClick={onRemove}
              className="text-xs rounded border px-2 py-1 text-rose-600 hover:bg-rose-50 border-rose-200"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="mt-3 grid gap-3">
          {(baseLines.length > 0 || item.base_drink_name) && (
            <div className="rounded-lg border p-3">
              <SectionTitle>Base Drink</SectionTitle>
              <div className="mt-1 text-sm font-medium">
                {item.base_drink_name ?? item.item_name}
              </div>
              {baseLines.length > 0 && (
                <ul className="mt-1 space-y-1 text-sm">
                  {baseLines.map((l, i) => (
                    <li
                      key={`b-${i}`}
                      className="flex items-center justify-between"
                    >
                      <span className="truncate">
                        {getLineLabel(l, nameDict)}
                      </span>
                      <span className="text-gray-600">
                        {l.amount} {l.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {typeof item.base_price_cents === "number" && (
                <div className="mt-2 text-right text-sm text-gray-700">
                  Base: <Price cents={item.base_price_cents} />
                </div>
              )}
            </div>
          )}

          {extraLines.length > 0 && (
            <div className="rounded-lg border p-3">
              <SectionTitle>Add-ons</SectionTitle>
              <ul className="mt-1 space-y-1 text-sm">
                {extraLines.map((l, i) => (
                  <li
                    key={`e-${i}`}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate">
                      {getLineLabel(l, nameDict)}
                    </span>
                    <span className="text-gray-600">
                      {l.amount} {l.unit}
                    </span>
                  </li>
                ))}
              </ul>
              {typeof item.addons_price_cents === "number" && (
                <div className="mt-2 text-right text-sm text-gray-700">
                  Add-ons: <Price cents={item.addons_price_cents} />
                </div>
              )}
            </div>
          )}

          {hasBreakdown && (
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Subtotal</span>
              <span>
                <Price
                  cents={
                    (item.base_price_cents || 0) +
                    (item.addons_price_cents || 0)
                  }
                />
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
