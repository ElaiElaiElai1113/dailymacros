// src/App.tsx
import { Route, Routes, NavLink } from "react-router-dom";
import MenuPage from "./pages/MenuPage";
import BuildYourOwnPage from "./pages/BuildYourOwnPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import StaffDashboard from "./pages/StaffDashboard";
import AdminPage from "./pages/AdminPage";
import LandingPage from "./pages/LandingPage";
import logoUrl from "@/assets/dailymacroslogo.png";

export default function App() {
  return (
    <div className="min-h-screen min-w-0 flex flex-col bg-[#FFFDF8]">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:py-4">
          {/* Brand */}
          <NavLink
            to="/"
            end
            aria-label="Go to home"
            className="relative flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D26E3D]/60"
          >
            <span
              aria-hidden="true"
              className="absolute -inset-3 -z-10 rounded-3xl blur-2xl opacity-70"
              style={{
                background:
                  "linear-gradient(135deg, rgba(236,186,79,0.4), rgba(89,145,144,0.3))",
              }}
            />
            <img
              src={logoUrl}
              alt="DailyMacros logo"
              className="h-12 w-auto object-contain"
              style={{ width: "120px" }} // or use Tailwind: className="h-12 w-[120px]"
            />
          </NavLink>

          {/* Links */}
          <div className="flex items-center gap-4 text-sm font-medium">
            <NavItem to="/" label="Home" end />
            <NavItem to="/menu" label="Menu" />
            <NavItem to="/build" label="Build" />
            <NavItem to="/cart" label="Cart" />
            <NavItem to="/orders" label="My Orders" />
            <NavItem to="/staff" label="Staff" accent="text-rose-600" />
            <NavItem to="/admin" label="Admin" accent="text-amber-600" />
            <NavLink
              to="/menu"
              className="ml-3 rounded-lg bg-[#D26E3D] px-4 py-2 text-sm text-white font-semibold shadow hover:opacity-90 transition"
            >
              Order Now
            </NavLink>
          </div>
        </div>
      </nav>

      {/* CONTENT: make this the scrollable region */}
      <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto p-4 overflow-y-auto overflow-x-hidden">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/build" element={<BuildYourOwnPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/staff" element={<StaffDashboard />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}

function NavItem({
  to,
  label,
  accent,
  end,
}: {
  to: string;
  label: string;
  accent?: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `transition-colors hover:text-[#D26E3D] ${accent ?? "text-gray-700"} ${
          isActive ? "font-semibold text-[#D26E3D]" : ""
        }`
      }
    >
      {label}
    </NavLink>
  );
}
