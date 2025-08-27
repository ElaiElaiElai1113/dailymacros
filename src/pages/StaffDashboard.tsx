import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function StaffDashboard() {
  const [orders, setOrders] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase
      .from("orders")
      .select("id,pickup_time,status,order_items(id,item_name,nutrition)")
      .order("pickup_time");
    setOrders(data || []);
  }
  useEffect(() => {
    load();
    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        load
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function setStatus(id: string, status: string) {
    await supabase.from("orders").update({ status }).eq("id", id);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Staff Dashboard</h1>
      <div className="grid gap-3">
        {orders.map((o) => (
          <div key={o.id} className="bg-white border rounded p-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Order #{o.id.slice(0, 8)}</div>
              <div className="text-sm">
                Pickup: {new Date(o.pickup_time).toLocaleString()}
              </div>
            </div>
            <div className="mt-2 space-y-2">
              {o.order_items?.map((it: any) => (
                <div key={it.id} className="border rounded p-2">
                  <div className="font-medium">{it.item_name}</div>
                  {it.nutrition && (
                    <div className="text-xs text-gray-600">
                      kcal {Math.round(it.nutrition.totals.energy_kcal)} • P{" "}
                      {it.nutrition.totals.protein_g}g • F{" "}
                      {it.nutrition.totals.fat_g}g • C{" "}
                      {it.nutrition.totals.carbs_g}g
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              {["pending", "in_progress", "ready", "picked_up"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(o.id, s)}
                  className={`px-2 py-1 rounded border ${
                    o.status === s ? "bg-black text-white" : ""
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
