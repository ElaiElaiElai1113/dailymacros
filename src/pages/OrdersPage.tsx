import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import type { Order } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Package, Clock } from "lucide-react";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "glow"; icon: React.ReactNode }> = {
  pending: { label: "Pending", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  confirmed: { label: "Confirmed", variant: "default", icon: <Package className="h-3 w-3" /> },
  preparing: { label: "Preparing", variant: "glow", icon: <Package className="h-3 w-3" /> },
  ready: { label: "Ready for Pickup", variant: "glow", icon: <Package className="h-3 w-3" /> },
  completed: { label: "Completed", variant: "secondary", icon: <Package className="h-3 w-3" /> },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("orders")
        .select("id,pickup_time,status")
        .order("created_at", { ascending: false });
      setOrders((data || []) as any);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">My Orders</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">My Orders</h1>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#FFE7C5] to-[#D7EFEA] mb-4">
              <ShoppingBag className="h-10 w-10 text-[#D26E3D]" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No orders yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              You haven't placed any orders yet. Start exploring our menu and order your first healthy shake!
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild>
                <Link to="/menu">Browse Menu</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/order">Build Your Own</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My Orders</h1>
        <Badge variant="secondary">{orders.length} {orders.length === 1 ? 'order' : 'orders'}</Badge>
      </div>

      <div className="space-y-3">
        {orders.map((o) => {
          const config = statusConfig[o.status] || statusConfig.pending;
          return (
            <Card key={o.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">#{o.id.slice(0, 8)}</span>
                      <Badge variant={config.variant} className="gap-1">
                        {config.icon}
                        {config.label}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Pickup: {new Date(o.pickup_time).toLocaleString()}
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/track/${o.id}`}>Track</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
