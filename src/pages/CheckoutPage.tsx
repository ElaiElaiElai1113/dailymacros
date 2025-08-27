import { useCart } from "@/context/CartContext";
import PickupTimePicker from "@/components/PickupTimePicker";
import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";

export default function CheckoutPage() {
  const { items, clear } = useCart();
  const [pickup, setPickup] = useState(() =>
    new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function placeOrder() {
    setLoading(true);
    // Require auth in production; for demo we allow guest and set customer_id via session if logged in
    const { data: user } = await supabase.auth.getUser();
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_id: user.user?.id ?? null,
        pickup_time: new Date(pickup).toISOString(),
        guest_name: name || null,
        guest_phone: phone || null,
      })
      .select("*")
      .single();
    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      const { data: oi, error: e1 } = await supabase
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
      if (e1) {
        alert(e1.message);
        setLoading(false);
        return;
      }
      const rows = it.lines.map((l) => ({
        order_item_id: oi!.id,
        ingredient_id: l.ingredient_id,
        amount: l.amount,
        unit: l.unit,
        is_extra: !!l.is_extra,
      }));
      const { error: e2 } = await supabase
        .from("order_item_ingredients")
        .insert(rows);
      if (e2) {
        alert(e2.message);
        setLoading(false);
        return;
      }
      // trigger will snapshot nutrition
    }
    clear();
    setLoading(false);
    alert("Order placed! See My Orders for status.");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Checkout</h1>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white border rounded p-3 space-y-2">
          <div className="font-medium">Pickup Time</div>
          <PickupTimePicker value={pickup} onChange={setPickup} />
        </div>
        <div className="bg-white border rounded p-3 space-y-2">
          <div className="font-medium">Contact (optional for guest)</div>
          <input
            className="border px-2 py-1 rounded w-full"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="border px-2 py-1 rounded w-full"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>
      <button
        disabled={loading}
        onClick={placeOrder}
        className="px-3 py-2 bg-black text-white rounded disabled:opacity-60"
      >
        {loading ? "Placing…" : "Place Order"}
      </button>
    </div>
  );
}
