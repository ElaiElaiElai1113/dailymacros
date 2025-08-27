import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Order } from "@/types";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,pickup_time,status")
        .order("created_at", { ascending: false });
      setOrders((data || []) as any);
    })();
  }, []);
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">My Orders</h1>
      {orders.map((o) => (
        <div
          key={o.id}
          className="bg-white border rounded p-3 flex items-center justify-between"
        >
          <div>
            <div className="font-medium">#{o.id.slice(0, 8)}</div>
            <div className="text-xs text-gray-500">
              Pickup: {new Date(o.pickup_time).toLocaleString()}
            </div>
          </div>
          <div className="text-sm">{o.status}</div>
        </div>
      ))}
    </div>
  );
}
