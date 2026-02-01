import { NavLink, Outlet } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Coffee,
  PlusCircle,
  FileText,
  Users,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { to: "/ops", label: "Overview", icon: LayoutDashboard },
  { to: "/ops/orders", label: "Orders", icon: ShoppingCart },
  { to: "/ops/ingredients", label: "Ingredients", icon: Package },
  { to: "/ops/drinks", label: "Drinks", icon: Coffee },
  { to: "/ops/addons", label: "Add-ons", icon: PlusCircle },
  { to: "/ops/audit", label: "Audit Log", icon: FileText },
  { to: "/staff", label: "Staff", icon: Users },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto flex max-w-[1920px] flex-col gap-8 px-6 py-8 md:flex-row">
        {/* Sidebar */}
        <aside className="md:w-80 flex-shrink-0">
          <Card className="sticky top-8 overflow-hidden border-gray-200 shadow-sm">
            {/* Header */}
            <div className="bg-gradient-to-br from-[#D26E3D] to-[#B85C2E] p-5 text-white">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                  <LayoutDashboard className="h-4 w-4" />
                </div>
                <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/20">
                  Operations
                </Badge>
              </div>
              <h2 className="text-lg font-bold">Admin Console</h2>
              <p className="text-xs text-white/80 mt-1">
                Manage drinks, ingredients, add-ons, and orders
              </p>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 p-4 text-sm">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/ops"}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                        isActive
                          ? "bg-[#D26E3D]/10 text-[#D26E3D] font-semibold shadow-sm"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`h-4 w-4 flex-shrink-0 transition-colors ${
                          isActive ? "text-[#D26E3D]" : "text-gray-400 group-hover:text-gray-600"
                        }`} />
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="border-t border-gray-100 p-5">
              <div className="rounded-lg bg-gray-50 p-4 text-xs text-gray-500">
                <p className="font-medium text-gray-700 mb-2">Quick Tips</p>
                <ul className="space-y-2">
                  <li>• Use search to filter items quickly</li>
                  <li>• Check audit log for recent changes</li>
                </ul>
              </div>
            </div>
          </Card>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
