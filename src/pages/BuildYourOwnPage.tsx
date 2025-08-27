// src/pages/BuildYourOwnPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Ingredient, IngredientNutrition, LineIngredient } from "@/types";
import IngredientSelector from "@/components/IngredientSelector";
import NutritionBar from "@/components/NutritionBar";
import ExplainMath from "@/components/ExplainMath";
import { totalsFor } from "@/utils/nutrition";
import { useCart } from "@/context/CartContext";

export default function BuildYourOwnPage() {
  const [ingDict, setIngDict] = useState<Record<string, Ingredient>>({});
  const [nutrDict, setNutrDict] = useState<Record<string, IngredientNutrition>>(
    {}
  );
  const [lines, setLines] = useState<LineIngredient[]>([]);
  const { addItem } = useCart();

  // Load ingredients + nutrition once
  useEffect(() => {
    (async () => {
      const [{ data: ii = [] }, { data: nn = [] }] = await Promise.all([
        supabase.from("ingredients").select("*").eq("is_active", true),
        supabase.from("ingredient_nutrition").select("*"),
      ]);
      setIngDict(
        Object.fromEntries((ii as Ingredient[]).map((x) => [x.id, x]))
      );
      setNutrDict(
        Object.fromEntries(
          (nn as IngredientNutrition[]).map((x) => [x.ingredient_id, x])
        )
      );
    })();
  }, []);

  // Live totals for the NutritionBar
  const { totals, allergens } = useMemo(
    () => totalsFor(lines, ingDict, nutrDict),
    [lines, ingDict, nutrDict]
  );

  // Add an ingredient line from the selector
  function handleAdd(ingredient: Ingredient, amount: number, unit: string) {
    setLines((prev) => [
      ...prev,
      { ingredient_id: ingredient.id, amount, unit },
    ]);
  }

  // Remove a selected line
  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  // Clear all lines
  function clearLines() {
    setLines([]);
  }

  // Add current custom drink to cart
  function addToCart() {
    // TODO: replace with your real pricing logic
    const price_cents = 20000;

    addItem({
      item_name: "Custom Shake",
      unit_price_cents: price_cents,
      lines,
    });

    setLines([]);
    alert("Added to cart");
  }

  return (
    <div className="space-y-4 pb-16 md:pb-0">
      <h1 className="text-xl font-bold">Build Your Own</h1>

      {/* Ingredient picker */}
      <div className="bg-white border rounded p-3">
        <div className="mb-2 font-medium">Add ingredients</div>
        <IngredientSelector onAdd={handleAdd} />
      </div>

      {/* Selected lines */}
      <div className="bg-white border rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Selected Ingredients</div>
          {lines.length > 0 && (
            <button
              onClick={clearLines}
              className="text-sm text-rose-600 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {lines.length === 0 ? (
          <div className="text-sm text-gray-500">
            No ingredients yet — pick some above.
          </div>
        ) : (
          <ul className="text-sm divide-y">
            {lines.map((l, i) => (
              <li
                key={`${l.ingredient_id}-${i}`}
                className="py-2 flex items-center justify-between"
              >
                <div>
                  <span className="font-medium">
                    {ingDict[l.ingredient_id]?.name ?? "Ingredient"}
                  </span>{" "}
                  — {l.amount} {l.unit}
                </div>
                <button
                  onClick={() => removeLine(i)}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={addToCart}
            disabled={lines.length === 0}
            className="px-3 py-2 bg-black text-white rounded disabled:opacity-60"
          >
            Add to cart
          </button>

          {/* Explain my math — uses the same dictionaries for instant open */}
          <ExplainMath
            lines={lines}
            ingDict={ingDict}
            nutrDict={nutrDict}
            buttonClassName="px-3 py-2 border rounded"
          />
        </div>
      </div>

      {/* Live totals bar */}
      <NutritionBar totals={totals} allergens={allergens} />
    </div>
  );
}
