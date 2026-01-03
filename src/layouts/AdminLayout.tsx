import { NavLink, Outlet } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const navItems = [
  { to: "/ops", label: "Overview" },
  { to: "/ops/orders", label: "Orders" },
  { to: "/ops/drinks", label: "Drinks" },
  { to: "/ops/addons", label: "Add-ons" },
  { to: "/staff", label: "Staff" },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row">
        <aside className="md:w-64">
          <Card className="sticky top-24 space-y-4 p-4">
            <div className="space-y-2">
              <Badge variant="secondary">Operations</Badge>
              <h2 className="text-lg font-semibold">Admin Console</h2>
              <p className="text-xs text-muted-foreground">
                Manage drinks, add-ons, and daily orders.
              </p>
            </div>
            <nav className="flex flex-col gap-1 text-sm">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/ops"}
                  className={({ isActive }) =>
                    `rounded-xl px-3 py-2 transition ${
                      isActive
                        ? "bg-muted text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </Card>
        </aside>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
