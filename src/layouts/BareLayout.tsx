// src/layouts/BareLayout.tsx
import { Outlet } from "react-router-dom";

export default function BareLayout() {
  return (
    <div className="bg-white">
      <Outlet />
    </div>
  );
}
