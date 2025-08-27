import type { Drink } from "@/types";
export default function PresetCard({
  drink,
  onSelect,
}: {
  drink: Drink;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="border rounded p-3 bg-white hover:shadow text-left"
    >
      <div className="font-semibold">{drink.name}</div>
      {drink.description && (
        <div className="text-sm text-gray-600">{drink.description}</div>
      )}
      <div className="mt-2 text-sm">
        ₱{(drink.price_cents / 100).toFixed(2)}
      </div>
    </button>
  );
}
