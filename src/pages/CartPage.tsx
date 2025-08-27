import { useCart } from "@/context/CartContext";
import { Link } from "react-router-dom";

export default function CartPage() {
  const { items, removeItem, clear } = useCart();
  const total = items.reduce((s, i) => s + i.unit_price_cents, 0);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Cart</h1>
      {items.length === 0 ? (
        <div>No items yet</div>
      ) : (
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="bg-white border rounded p-3 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{it.item_name}</div>
                <div className="text-xs text-gray-500">
                  {it.lines.length} ingredients
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div>₱{(it.unit_price_cents / 100).toFixed(2)}</div>
                <button
                  onClick={() => removeItem(idx)}
                  className="text-rose-600 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between font-semibold">
            <div>Total</div>
            <div>₱{(total / 100).toFixed(2)}</div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/checkout"
              className="px-3 py-2 bg-black text-white rounded"
            >
              Checkout
            </Link>
            <button onClick={clear} className="px-3 py-2 border rounded">
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
