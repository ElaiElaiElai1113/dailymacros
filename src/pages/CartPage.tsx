import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CartLine = {
  ingredient_id: string;
  amount: number;
  unit: string;
  role?: "base" | "extra";
  name?: string;
  is_extra?: boolean;
};

type CartItem = {
  item_name: string;
  unit_price_cents: number;
  lines: CartLine[];
  drink_id?: string | null;
  size_ml?: number | null;
  base_drink_name?: string;
  base_price_cents?: number;
  addons_price_cents?: number;
  image_url?: string | null;
};

function Price({ cents, bold }: { cents: number; bold?: boolean }) {
  return (
    <span className={bold ? "font-semibold" : ""}>
      PHP {(Number(cents || 0) / 100).toFixed(2)}
    </span>
  );
}

const getLineLabel = (l: CartLine, dict: Record<string, string>) =>
  l.name || dict[l.ingredient_id] || l.ingredient_id;

const titleFor = (it: CartItem) =>
  it.base_drink_name ? `Custom - ${it.base_drink_name}` : it.item_name;

export default function CartPage() {
  const { items, removeItem, clear } = useCart() as {
    items: CartItem[];
    removeItem: (idx: number) => void;
    clear: () => void;
  };

  const [nameDict, setNameDict] = useState<Record<string, string>>({});
  const [loadingNames, setLoadingNames] = useState(false);

  useEffect(() => {
    const needsLookup = items.some((it) =>
      (it.lines || []).some((l) => !l.name)
    );
    if (!needsLookup) return;

    (async () => {
      setLoadingNames(true);
      const { data, error } = await supabase
        .from("ingredients")
        .select("id,name")
        .eq("is_active", true);
      if (!error && data) {
        setNameDict(Object.fromEntries(data.map((x: any) => [x.id, x.name])));
      }
      setLoadingNames(false);
    })();
  }, [items]);

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + Number(i.unit_price_cents || 0), 0),
    [items]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Badge variant="secondary">Cart</Badge>
          <h1 className="mt-2 text-2xl font-semibold">Review your order</h1>
        </div>
        {items.length > 0 && (
          <Button variant="outline" onClick={clear}>
            Clear All
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 py-8 text-center">
            <div className="text-sm text-muted-foreground">
              Your cart is empty. Start with the menu or build your own shake.
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/menu">Browse Menu</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/build">Build Your Own</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
            <div className="space-y-4">
              {items.map((it, idx) => (
                <CartItemCard
                  key={`${it.item_name}-${idx}`}
                  item={it}
                  onRemove={() => removeItem(idx)}
                  nameDict={nameDict}
                  loadingNames={loadingNames}
                />
              ))}
            </div>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>Items</span>
                  <span>{items.length}</span>
                </div>
                <div className="flex items-center justify-between text-base">
                  <span className="font-medium">Subtotal</span>
                  <Price cents={subtotal} bold />
                </div>
                <Button asChild className="w-full">
                  <Link to="/checkout">Proceed to Checkout</Link>
                </Button>
                <Button asChild variant="secondary" className="w-full">
                  <Link to="/menu">Continue Shopping</Link>
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Pickup time and payment details are confirmed at checkout.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function CartItemCard({
  item,
  onRemove,
  nameDict,
  loadingNames,
}: {
  item: CartItem;
  onRemove: () => void;
  nameDict: Record<string, string>;
  loadingNames: boolean;
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
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border bg-white">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.base_drink_name ?? item.item_name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[#FFE7C5] via-white to-[#D7EFEA]" />
              )}
            </div>
            <div className="space-y-1">
              <div className="text-base font-semibold">{titleFor(item)}</div>
              <div className="text-xs text-muted-foreground">
                {(item.lines || []).length} ingredients
                {loadingNames && <span className="ml-2">Loading names...</span>}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-base font-semibold">
              <Price cents={item.unit_price_cents || 0} />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
              {item.drink_id && (
                <Button asChild variant="outline" size="sm">
                  <Link to={`/build?base=${item.drink_id}`}>Edit</Link>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen((v) => !v)}
              >
                {open ? "Hide details" : "Show details"}
              </Button>
              <Button variant="destructive" size="sm" onClick={onRemove}>
                Remove
              </Button>
            </div>
          </div>
        </div>

        {open && (
          <div className="grid gap-3">
            {(baseLines.length > 0 || item.base_drink_name) && (
              <Card className="border-dashed">
                <CardContent className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Base drink
                  </div>
                  <div className="text-sm font-medium">
                    {item.base_drink_name ?? item.item_name}
                  </div>
                  {baseLines.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {baseLines.map((l, i) => (
                        <li
                          key={`b-${i}`}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="truncate">
                            {getLineLabel(l, nameDict)}
                          </span>
                          <span className="text-muted-foreground">
                            {l.amount} {l.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {typeof item.base_price_cents === "number" && (
                    <div className="text-right text-sm text-muted-foreground">
                      Base: <Price cents={item.base_price_cents} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {extraLines.length > 0 && (
              <Card className="border-dashed">
                <CardContent className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Add-ons
                  </div>
                  <ul className="space-y-1 text-sm">
                    {extraLines.map((l, i) => (
                      <li
                        key={`e-${i}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate">
                          {getLineLabel(l, nameDict)}
                        </span>
                        <span className="text-muted-foreground">
                          {l.amount} {l.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {typeof item.addons_price_cents === "number" && (
                    <div className="text-right text-sm text-muted-foreground">
                      Add-ons: <Price cents={item.addons_price_cents} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {hasBreakdown && (
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Item subtotal</span>
                <Price
                  cents={
                    (item.base_price_cents || 0) +
                    (item.addons_price_cents || 0)
                  }
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
