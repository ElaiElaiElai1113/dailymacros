// src/App.tsx
import { lazy, Suspense, useMemo, useState } from "react";
import {
  Route,
  Routes,
  NavLink,
  useLocation,
  Link,
  Outlet,
} from "react-router-dom";
import logoUrl from "@/assets/dailymacroslogo.png";
import RoleGate from "@/lib/auth/RoleGate";

/** Eager pages */
import LandingPage from "./pages/LandingPage";
import MenuPage from "./pages/MenuPage";
import BuildYourOwnPage from "./pages/BuildYourOwnPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import StaffDashboard from "./pages/StaffDashboard";
import AdminPage from "./pages/admin/AdminPage";
import LoginPage from "./pages/LoginPage";
import PrintLabelPage from "./pages/PrintLabelPage";
import TrackOrderPage from "./pages/TrackOrderPage";

/** Lazy admin pages */
const DrinksAdminPage = lazy(() => import("@/pages/admin/DrinksAdmin"));
const AddonsAdminPage = lazy(() => import("@/pages/admin/AddonsAdmin"));
const OrdersAdminPage = lazy(() => import("@/pages/admin/OrdersAdmin"));

/* ----------------------------- Small bits ----------------------------- */
function Loading() {
  return (
    <div className="flex h-[40vh] items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-transparent" />
    </div>
  );
}

function Container({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 min-h-0 w-full max-w-7xl mx-auto p-4 overflow-y-auto overflow-x-hidden">
      {children}
    </main>
  );
}

/* ------------------------------ Layouts ------------------------------- */
function SiteLayout() {
  const location = useLocation();

  // Hide navbar/container on print pages
  const isPrint = useMemo(
    () => location.pathname.startsWith("/print-label"),
    [location.pathname]
  );

  return (
    <div className="min-h-screen min-w-0 flex flex-col bg-[#FFFDF8] print:bg-white">
      {!isPrint && <Navbar />}
      {isPrint ? (
        <Outlet />
      ) : (
        <Container>
          <Outlet />
        </Container>
      )}
    </div>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100 shadow-sm print:hidden">
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
            className="absolute -inset-3 -z-10 hidden md:block rounded-3xl blur-2xl opacity-70"
            style={{
              background:
                "linear-gradient(135deg, rgba(236,186,79,0.4), rgba(89,145,144,0.3))",
            }}
          />
          <img
            src={logoUrl}
            alt="DailyMacros logo"
            className="h-10 w-auto object-contain md:h-12"
            style={{ width: "120px" }}
          />
        </NavLink>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-4 text-sm font-medium">
          <NavItem to="/" label="Home" end />
          <NavItem to="/menu" label="Menu" />
          <NavItem to="/build" label="Build" />
          <NavItem to="/cart" label="Cart" />
          <Link
            to="/menu"
            className="ml-2 rounded-lg bg-[#D26E3D] px-4 py-2 text-sm text-white font-semibold shadow hover:opacity-90 transition"
          >
            Order Now
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden rounded-lg border px-3 py-1.5 text-sm"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div id="mobile-menu" className="md:hidden border-t bg-white/90">
          <div className="mx-auto max-w-7xl px-4 py-3 grid gap-2 text-sm">
            <NavItem to="/" label="Home" end onClick={() => setOpen(false)} />
            <NavItem to="/menu" label="Menu" onClick={() => setOpen(false)} />
            <NavItem to="/build" label="Build" onClick={() => setOpen(false)} />
            <NavItem to="/cart" label="Cart" onClick={() => setOpen(false)} />
            <NavItem
              to="/orders"
              label="My Orders"
              onClick={() => setOpen(false)}
            />
            <Link
              to="/menu"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-lg bg-[#D26E3D] px-4 py-2 text-white font-semibold text-center"
            >
              Order Now
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function NavItem({
  to,
  label,
  accent,
  end,
  onClick,
}: {
  to: string;
  label: string;
  accent?: string;
  end?: boolean;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `transition-colors rounded px-1.5 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D26E3D]/40 ${
          accent ?? "text-gray-700"
        } ${isActive ? "font-semibold text-[#D26E3D]" : "hover:text-[#D26E3D]"}`
      }
    >
      {label}
    </NavLink>
  );
}

/* ------------------------------- App ------------------------------- */
export default function App() {
  return (
    <Routes>
      {/* All normal pages under SiteLayout */}
      <Route element={<SiteLayout />}>
        <Route
          element={
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          }
        >
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/build" element={<BuildYourOwnPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/track/:code" element={<TrackOrderPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Staff area */}
          <Route
            path="/staff"
            element={
              <RoleGate allow={["staff", "admin"]}>
                <StaffDashboard />
              </RoleGate>
            }
          />

          {/* Admin hub (kept) */}
          <Route
            path="/admin"
            element={
              <RoleGate allow={["admin"]}>
                <AdminPage />
              </RoleGate>
            }
          />

          {/* Admin sections (lazy) */}
          <Route
            path="/admin/drinks"
            element={
              <RoleGate allow={["admin"]}>
                <DrinksAdminPage />
              </RoleGate>
            }
          />
          <Route
            path="/admin/addons"
            element={
              <RoleGate allow={["admin"]}>
                <AddonsAdminPage />
              </RoleGate>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <RoleGate allow={["admin", "staff"]}>
                <OrdersAdminPage />
              </RoleGate>
            }
          />

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="mx-auto max-w-3xl py-16 text-center">
                <h1 className="text-2xl font-bold mb-2">Page not found</h1>
                <p className="text-gray-600">
                  The page you’re looking for doesn’t exist.
                </p>
                <div className="mt-4">
                  <Link to="/" className="text-[#D26E3D] underline">
                    Go home
                  </Link>
                </div>
              </div>
            }
          />
        </Route>

        {/* PRINT LABEL — bare route (no navbar/chrome) */}
        <Route path="/print-label/:orderItemId" element={<PrintLabelPage />} />
      </Route>
    </Routes>
  );
}
