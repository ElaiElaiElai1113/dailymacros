import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type {
  Drink,
  DrinkIngredient,
  Ingredient,
  IngredientNutrition,
} from "@/types";
import PresetCard from "@/components/PresetCard";
import { useCart } from "@/context/CartContext";

export default function MenuPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [dict, setDict] = useState<Record<string, Ingredient>>({});
  const [nutr, setNutr] = useState<Record<string, IngredientNutrition>>({});
  const { addItem } = useCart();

  useEffect(() => {
    (async () => {
      const [{ data: dr = [] }, { data: ing = [] }, { data: n = [] }] =
        await Promise.all([
          supabase
            .from("drinks")
            .select("*")
            .eq("is_active", true)
            .order("name"),
          supabase.from("ingredients").select("*").eq("is_active", true),
          supabase.from("ingredient_nutrition").select("*"),
        ]);
      setDrinks(dr as any);
      setDict(Object.fromEntries((ing as Ingredient[]).map((x) => [x.id, x])));
      setNutr(
        Object.fromEntries(
          (n as IngredientNutrition[]).map((x) => [x.ingredient_id, x])
        )
      );
    })();
  }, []);

  async function addPreset(drink: Drink) {
    const { data: recipe } = await supabase
      .from("drink_ingredients")
      .select("*")
      .eq("drink_id", drink.id);
    const lines = (recipe || []).map((r) => ({
      ingredient_id: r.ingredient_id,
      amount: r.amount,
      unit: r.unit,
      is_extra: !r.is_required,
    }));
    addItem({
      item_name: drink.name,
      drink_id: drink.id,
      size_ml: drink.base_size_ml || null,
      unit_price_cents: drink.price_cents,
      lines,
    });
    alert(`${drink.name} added to cart`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Menu</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {drinks.map((d) => (
          <PresetCard key={d.id} drink={d} onSelect={() => addPreset(d)} />
        ))}
      </div>
    </div>
  );
}
