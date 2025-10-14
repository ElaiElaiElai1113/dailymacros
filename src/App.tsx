import { Route, Routes, NavLink } from "react-router-dom";
import MenuPage from "./pages/MenuPage";
import BuildYourOwnPage from "./pages/BuildYourOwnPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import StaffDashboard from "./pages/StaffDashboard";
import AdminPage from "./pages/AdminPage";
import LandingPage from "./pages/LandingPage";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <span className="font-bold">ProteinShake</span>
          <div className="flex gap-3 text-sm">
            <NavLink
              to="/"
              className={({ isActive }) => (isActive ? "font-semibold" : "")}
            >
              Menu
            </NavLink>
            <NavLink
              to="/build"
              className={({ isActive }) => (isActive ? "font-semibold" : "")}
            >
              Build
            </NavLink>
            <NavLink
              to="/cart"
              className={({ isActive }) => (isActive ? "font-semibold" : "")}
            >
              Cart
            </NavLink>
            <NavLink
              to="/orders"
              className={({ isActive }) => (isActive ? "font-semibold" : "")}
            >
              My Orders
            </NavLink>
            <NavLink
              to="/staff"
              className={({ isActive }) =>
                isActive ? "font-semibold text-rose-600" : "text-rose-600"
              }
            >
              Staff
            </NavLink>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                isActive ? "font-semibold text-amber-600" : "text-amber-600"
              }
            >
              Admin
            </NavLink>
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-6xl mx-auto w-full p-4">
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
