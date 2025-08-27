import React, { createContext, useContext, useMemo, useState } from "react";
import type { CartItem, Ingredient, IngredientNutrition } from "@/types";
import { totalsFor } from "@/utils/nutrition";

interface CartCtx {
  items: CartItem[];
  addItem: (ci: CartItem) => void;
  removeItem: (idx: number) => void;
  clear: () => void;
  computeTotals: (
    idx: number,
    ingDict: Record<string, Ingredient>,
    nutr: Record<string, IngredientNutrition>
  ) => ReturnType<typeof totalsFor>;
}
const Ctx = createContext<CartCtx | null>(null);
export const useCart = () => useContext(Ctx)!;

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const addItem = (ci: CartItem) => setItems((p) => [...p, ci]);
  const removeItem = (idx: number) =>
    setItems((p) => p.filter((_, i) => i !== idx));
  const clear = () => setItems([]);
  const computeTotals: CartCtx["computeTotals"] = (idx, ing, nutr) =>
    totalsFor(items[idx].lines, ing, nutr);
  const value = useMemo(
    () => ({ items, addItem, removeItem, clear, computeTotals }),
    [items]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
