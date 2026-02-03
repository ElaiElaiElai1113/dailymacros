import React, { createContext, useContext, useMemo, useState } from "react";
import type { CartItem, Ingredient, IngredientNutrition, Promo, PromoApplicationResult } from "@/types";
import { totalsFor } from "@/utils/nutrition";
import { validatePromoCode, applyPromo } from "@/utils/promos";

interface CartCtx {
  items: CartItem[];
  appliedPromo: Promo | null;
  promoDiscount: number; // in cents
  promoError: string | null;

  addItem: (ci: CartItem) => void;
  removeItem: (idx: number) => void;
  clear: () => void;

  // Promo methods
  applyPromoCode: (code: string, customerIdentifier?: string) => Promise<PromoApplicationResult>;
  removePromo: () => void;

  computeTotals: (
    idx: number,
    ingDict: Record<string, Ingredient>,
    nutr: Record<string, IngredientNutrition>
  ) => ReturnType<typeof totalsFor>;
  getSubtotal: () => number; // Returns subtotal in cents
  getTotal: () => number;     // Returns total after promo discount
}

const Ctx = createContext<CartCtx | null>(null);
export const useCart = () => useContext(Ctx)!;

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [appliedPromo, setAppliedPromo] = useState<Promo | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Calculate subtotal (before promo)
  const getSubtotal = (): number => {
    return items.reduce((sum, item) => sum + item.unit_price_cents, 0);
  };

  // Calculate total (after promo)
  const getTotal = (): number => {
    const subtotal = getSubtotal();
    return Math.max(0, subtotal - promoDiscount);
  };

  const addItem = (ci: CartItem) => setItems((p) => [...p, ci]);
  const removeItem = (idx: number) =>
    setItems((p) => p.filter((_, i) => i !== idx));
  const clear = () => {
    setItems([]);
    setAppliedPromo(null);
    setPromoDiscount(0);
    setPromoError(null);
  };

  /**
   * Apply a promo code to the cart
   */
  const applyPromoCode = async (
    code: string,
    customerIdentifier?: string
  ): Promise<PromoApplicationResult> => {
    setPromoError(null);

    const subtotalCents = getSubtotal();

    // Validate promo code
    const validationResult = await validatePromoCode({
      code,
      cartItems: items,
      subtotalCents,
      customerIdentifier,
    });

    if (!validationResult.valid) {
      setPromoError(validationResult.error || "Invalid promo code");
      return {
        success: false,
        discount_cents: 0,
        new_subtotal_cents: subtotalCents,
        errors: [validationResult.error || "Invalid promo code"],
      };
    }

    // Apply promo and calculate discount
    const applicationResult = await applyPromo({
      promo: validationResult.promo!,
      cartItems: items,
      subtotalCents,
    });

    if (applicationResult.success) {
      setAppliedPromo(validationResult.promo!);
      setPromoDiscount(applicationResult.discount_cents);
    } else {
      setPromoError(applicationResult.errors?.join(", ") || "Failed to apply promo");
    }

    return applicationResult;
  };

  /**
   * Remove applied promo from cart
   */
  const removePromo = () => {
    setAppliedPromo(null);
    setPromoDiscount(0);
    setPromoError(null);
  };

  const computeTotals: CartCtx["computeTotals"] = (idx, ing, nutr) =>
    totalsFor(items[idx].lines, ing, nutr);

  const value = useMemo(
    () => ({
      items,
      appliedPromo,
      promoDiscount,
      promoError,
      addItem,
      removeItem,
      clear,
      applyPromoCode,
      removePromo,
      computeTotals,
      getSubtotal,
      getTotal,
    }),
    [items, appliedPromo, promoDiscount, promoError]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
