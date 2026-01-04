import { lazy, Suspense, useMemo, useState } from "react";
import {
  Route,
  Routes,
  NavLink,
  useLocation,
  Link,
  Outlet,
  Navigate,
} from "react-router-dom";
import logoUrl from "@/assets/dailymacroslogo.png";
import RoleGate from "@/lib/auth/RoleGate";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import LandingPage from "./pages/LandingPage";
import MenuPage from "./pages/MenuPage";
import BuildYourOwnPage from "./pages/BuildYourOwnPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import StaffDashboard from "./pages/StaffDashboard";
import AdminPage from "./pages/admin/AdminPage";
import AdminLayout from "./layouts/AdminLayout";
import LoginPage from "./pages/LoginPage";
import PrintLabelPage from "./pages/PrintLabelPage";
import TrackOrderPage from "./pages/TrackOrderPage";

const DrinksAdminPage = lazy(() => import("@/pages/admin/DrinksAdmin"));
const AddonsAdminPage = lazy(() => import("@/pages/admin/AddonsAdmin"));
const OrdersAdminPage = lazy(() => import("@/pages/admin/OrdersAdmin"));

function Loading() {
  return (
    <div className="flex h-[40vh] items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-transparent" />
    </div>
  );
}

function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={`flex-1 min-h-0 w-full max-w-7xl mx-auto p-4 overflow-y-auto ${className ?? ""}`}
    >
      {children}
    </main>
  );
}

/* ------------------------------ Layouts ------------------------------- */
function SiteLayout() {
  const location = useLocation();

  const isPrint = useMemo(
    () => location.pathname.startsWith("/print-label"),
    [location.pathname]
  );
  const isOps = useMemo(
    () => location.pathname.startsWith("/ops"),
    [location.pathname]
  );

  return (
    <div className="min-h-screen min-w-0 flex flex-col bg-[#FFFDF8] print:bg-white">
      {!isPrint && <Navbar />}
      {isPrint ? (
        <Outlet />
      ) : (
        <Container className={isOps ? "overflow-x-auto" : "overflow-x-hidden"}>
          <Outlet />
        </Container>
      )}
    </div>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const { items } = useCart();
  const cartCount = items.length;
  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-white/80 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:py-4">
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

        <div className="hidden md:flex items-center gap-4 text-sm font-medium">
          <NavItem to="/" label="Home" end />
          <NavItem to="/menu" label="Menu" />
          <NavItem to="/build" label="Build" />
          <NavItem
            to="/cart"
            label="Cart"
            badge={cartCount > 0 ? cartCount : undefined}
          />
          <Button asChild className="ml-2">
            <Link to="/menu">Order Now</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Button asChild variant="outline" size="sm" className="relative">
            <Link to="/cart" aria-label="View cart">
              Cart
              {cartCount > 0 && (
                <Badge className="ml-2 px-2 py-0 text-[10px]">+{cartCount}</Badge>
              )}
            </Link>
          </Button>
          <button
            className="rounded-lg border px-3 py-1.5 text-sm"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div id="mobile-menu" className="md:hidden border-t bg-white/90">
          <div className="mx-auto max-w-7xl px-4 py-3 grid gap-2 text-sm">
            <NavItem to="/" label="Home" end onClick={() => setOpen(false)} />
            <NavItem to="/menu" label="Menu" onClick={() => setOpen(false)} />
            <NavItem to="/build" label="Build" onClick={() => setOpen(false)} />
            <NavItem
              to="/cart"
              label="Cart"
              badge={cartCount > 0 ? cartCount : undefined}
              onClick={() => setOpen(false)}
            />

            <Button asChild className="mt-1">
              <Link to="/menu" onClick={() => setOpen(false)}>
                Order Now
              </Link>
            </Button>
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
  badge,
}: {
  to: string;
  label: string;
  accent?: string;
  end?: boolean;
  onClick?: () => void;
  badge?: number;
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
      <span className="inline-flex items-center gap-2">
        {label}
        {typeof badge === "number" && badge > 0 && (
          <Badge className="px-2 py-0 text-[10px]">+{badge}</Badge>
        )}
      </span>
    </NavLink>
  );
}

/* ------------------------------- App ------------------------------- */
export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route
          element={
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          }
        >
          <Route path="/" element={<LandingPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/build" element={<BuildYourOwnPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/track/:code" element={<TrackOrderPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/staff"
            element={
              <RoleGate allow={["staff", "admin"]}>
                <StaffDashboard />
              </RoleGate>
            }
          />

          <Route
            path="/ops"
            element={
              <RoleGate allow={["admin", "staff"]}>
                <AdminLayout />
              </RoleGate>
            }
          >
            <Route
              index
              element={
                <RoleGate allow={["admin"]}>
                  <AdminPage />
                </RoleGate>
              }
            />
            <Route
              path="drinks"
              element={
                <RoleGate allow={["admin"]}>
                  <DrinksAdminPage />
                </RoleGate>
              }
            />
            <Route
              path="addons"
              element={
                <RoleGate allow={["admin"]}>
                  <AddonsAdminPage />
                </RoleGate>
              }
            />
            <Route
              path="orders"
              element={
                <OrdersAdminPage />
              }
            />
          </Route>
          <Route path="/admin/*" element={<Navigate to="/ops" replace />} />

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

        <Route path="/print-label/:orderItemId" element={<PrintLabelPage />} />
      </Route>
    </Routes>
  );
}
