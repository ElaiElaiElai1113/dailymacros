// src/pages/CheckoutPage.tsx
import { useCart } from "@/context/CartContext";
import PickupTimePicker from "@/components/PickupTimePicker";
import { supabase } from "@/lib/supabaseClient";
import { useMemo, useState } from "react";

type CartLine = {
  ingredient_id: string;
  amount: number;
  unit: string;
  is_extra?: boolean;
  role?: "base" | "extra";
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
};

function Price({ cents }: { cents: number }) {
  return <span>₱{(Number(cents || 0) / 100).toFixed(2)}</span>;
}

export default function CheckoutPage() {
  const { items, clear } = useCart();
  const [pickup, setPickup] = useState(() =>
    new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const cartEmpty = items.length === 0;

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.unit_price_cents || 0), 0),
    [items]
  );

  function validatePickup(ts: string) {
    const dt = new Date(ts);
    return dt.getTime() > Date.now() + 5 * 60 * 1000; // at least 5 minutes from now
  }

  function phoneLooksOk(v: string) {
    if (!v) return true; // optional for signed-in users
    const digits = v.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 13;
  }

  async function placeOrder() {
    if (cartEmpty) {
      alert("Your cart is empty.");
      return;
    }
    if (!validatePickup(pickup)) {
      alert("Please choose a pickup time at least ~5 minutes in the future.");
      return;
    }

    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const authedUserId = auth.user?.id ?? null;

      // If guest (no authed user), require at least a name or phone
      if (!authedUserId && !(name.trim() || phone.trim())) {
        setLoading(false);
        alert("Please add your name or phone so we can reach you.");
        return;
      }
      if (!phoneLooksOk(phone)) {
        setLoading(false);
        alert("Please enter a valid phone number (10–13 digits).");
        return;
      }

      // Create order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id: authedUserId,
          pickup_time: new Date(pickup).toISOString(),
          guest_name: name.trim() || null,
          guest_phone: phone.trim() || null,
          status: "pending",
        })
        .select("*")
        .single();

      if (orderErr || !order)
        throw orderErr || new Error("Failed creating order.");

      // Insert items one by one (capture IDs)
      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx];

        const { data: oi, error: oiErr } = await supabase
          .from("order_items")
          .insert({
            order_id: order.id,
            drink_id: it.drink_id ?? null,
            item_name: it.item_name,
            size_ml: it.size_ml ?? null,
            unit_price_cents: it.unit_price_cents,
            line_total_cents: it.unit_price_cents,
            position: idx,
          })
          .select("*")
          .single();

        if (oiErr || !oi)
          throw oiErr || new Error("Failed creating order item.");

        // Insert line ingredients
        const lineRows =
          (it.lines || []).map((l) => ({
            order_item_id: oi.id,
            ingredient_id: l.ingredient_id,
            amount: Number(l.amount),
            unit: l.unit,
            is_extra: !!(l as any).is_extra,
          })) || [];

        if (lineRows.length > 0) {
          const { error: liErr } = await supabase
            .from("order_item_ingredients")
            .insert(lineRows);

          if (liErr) throw liErr;
        }
      }

      clear();
      alert("✅ Order placed! You can track it in My Orders.");
    } catch (err: any) {
      const pickupISO = new Date(pickup).toISOString();
      const { data: recent, error: findErr } = await supabase
        .from("orders")
        .select("id, pickup_time")
        .eq("pickup_time", pickupISO)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!findErr && recent && recent[0]) {
        await supabase.from("orders").delete().eq("id", recent[0].id);
      }

      alert(err?.message || "Something went wrong placing your order.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold tracking-tight">Checkout</h1>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Left column: customer + time */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="font-semibold">Pickup Time</div>
            <div className="mt-2">
              <PickupTimePicker value={pickup} onChange={setPickup} />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Choose a time at least a few minutes from now.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="font-semibold">Contact</div>
            <p className="mt-1 text-xs text-gray-500">
              Optional if you’re signed in. For guests, please add at least one.
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <input
                className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
                placeholder="Name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30"
                placeholder="Phone (optional for signed in)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Right column: order summary */}
        <aside className="md:col-span-1">
          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-semibold">Order Summary</div>
              <div className="rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                {items.length} item{items.length > 1 ? "s" : ""}
              </div>
            </div>

            <ul className="divide-y divide-gray-100 text-sm">
              {items.map((it, i) => (
                <li key={i} className="py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {it.base_drink_name
                          ? `Custom — ${it.base_drink_name}`
                          : it.item_name}
                      </div>
                      {typeof it.base_price_cents === "number" &&
                        typeof it.addons_price_cents === "number" && (
                          <div className="mt-0.5 text-[11px] text-gray-500">
                            Base <Price cents={it.base_price_cents} /> · Add-ons{" "}
                            <Price cents={it.addons_price_cents} />
                          </div>
                        )}
                    </div>
                    <div className="shrink-0">
                      <Price cents={it.unit_price_cents} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-center justify-between text-base">
              <div className="font-medium">Subtotal</div>
              <div className="font-semibold">
                <Price cents={subtotal} />
              </div>
            </div>

            <button
              disabled={loading || cartEmpty}
              onClick={placeOrder}
              className="mt-4 w-full rounded-lg bg-[#D26E3D] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Placing…" : "Place Order"}
            </button>
            <p className="mt-2 text-[11px] text-gray-500">
              You’ll receive a confirmation on the next screen. We’ll start
              preparing near your pickup time.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
