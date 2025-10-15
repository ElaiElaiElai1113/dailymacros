import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/context/CartContext";
import type { CartItem } from "@/types";

type NameDict = Record<string, string>;

function Price({ cents = 0 }: { cents?: number }) {
  return <span>₱{(cents / 100).toFixed(2)}</span>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </div>
  );
}

export default function CartPage() {
  const { items, removeItem, clear } = useCart();

  // ingredient name fallback (in case lines didn’t carry `name`)
  const [nameDict, setNameDict] = useState<NameDict>({});
  useEffect(() => {
    const needs = items.some((it) => (it.lines || []).some((l) => !l.name));
    if (!needs) return;
    (async () => {
      const { data, error } = await supabase
        .from("ingredients")
        .select("id,name")
        .eq("is_active", true);
      if (!error && data) {
        setNameDict(
          Object.fromEntries((data as any[]).map((x) => [x.id, x.name]))
        );
      }
    })();
  }, [items]);

  const total = useMemo(
    () => items.reduce((acc, it) => acc + (it.unit_price_cents || 0), 0),
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
            <ItemCard
              key={idx}
              item={it}
              onRemove={() => removeItem(idx)}
              nameDict={nameDict}
            />
          ))}

          <div className="mt-4 rounded-2xl border bg-white p-4">
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

function displayTitle(it: CartItem) {
  return it.base_drink_name ? `Custom — ${it.base_drink_name}` : it.item_name;
}

function ItemCard({
  item,
  onRemove,
  nameDict,
}: {
  item: CartItem;
  onRemove: () => void;
  nameDict: NameDict;
}) {
  const [open, setOpen] = useState(true);

  const baseLines = useMemo(
    () => (item.lines || []).filter((l) => l.role === "base"),
    [item.lines]
  );
  const extras = useMemo(
    () => (item.lines || []).filter((l) => l.role !== "base"),
    [item.lines]
  );

  const showBreakdown =
    typeof item.base_price_cents === "number" ||
    typeof item.addons_price_cents === "number";

  const labelFor = (id?: string, name?: string) =>
    name || (id ? nameDict[id] : "") || "Ingredient";

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold">{displayTitle(item)}</div>
          <div className="text-xs text-gray-500">
            {(item.lines || []).length} ingredient
            {(item.lines || []).length === 1 ? "" : "s"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-base font-semibold">
            <Price cents={item.unit_price_cents} />
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
          {(item.base_drink_name || baseLines.length > 0) && (
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
                        {labelFor(l.ingredient_id, l.name)}
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

          {extras.length > 0 && (
            <div className="rounded-lg border p-3">
              <SectionTitle>Add-ons</SectionTitle>
              <ul className="mt-1 space-y-1 text-sm">
                {extras.map((l, i) => (
                  <li
                    key={`e-${i}`}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate">
                      {labelFor(l.ingredient_id, l.name)}
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

          {showBreakdown && (
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
