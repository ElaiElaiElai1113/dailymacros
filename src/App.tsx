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
    <div className="min-h-screen flex flex-col bg-[#FFFDF8]">
      {/* 🌟 GLOBAL NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:py-4">
          {/* LOGO */}
          <NavLink
            to="/"
            aria-label="Go to home"
            className="relative flex items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D26E3D]/60"
          >
            {/* Soft halo glow */}
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
              className="h-12 w-100 object-contain"
            />
          </NavLink>

          {/* NAV LINKS */}
          <div className="flex items-center gap-4 text-sm font-medium">
            <NavItem to="/" label="Home" />
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

      {/* MAIN ROUTES */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4">
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

/* ----------------------------------------- */
/* NavItem Component                         */
/* ----------------------------------------- */

function NavItem({
  to,
  label,
  accent,
}: {
  to: string;
  label: string;
  accent?: string;
}) {
  return (
    <NavLink
      to={to}
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
