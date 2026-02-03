/**
 * Daily Macros Promo/Discount System
 *
 * Core utility functions for promo validation, application, and tracking.
 */

import { supabase } from "@/lib/supabaseClient";
import type {
  Promo,
  PromoBundle,
  PromoFreeAddon,
  PromoVariant,
  PromoApplicationResult,
  CartItem,
} from "@/types";

// ============================================================
// TYPES
// ============================================================

export interface PromoWithRelations extends Promo {
  promo_bundles?: PromoBundle[];
  promo_free_addons?: PromoFreeAddon[];
  promo_variants?: PromoVariant[];
}

export interface ValidatePromoCodeOptions {
  code: string;
  cartItems: CartItem[];
  subtotalCents: number;
  customerIdentifier?: string;
}

export interface ApplyPromoOptions {
  promo: Promo;
  subtotalCents: number;
  selectedVariantId?: string;
  selectedAddonId?: string;
}

export interface ApplyPromoServerOptions {
  code: string;
  cartItems: CartItem[];
  subtotalCents: number;
  selectedVariantId?: string;
  selectedAddonId?: string;
  customerIdentifier?: string;
}

// ============================================================
// CONSTANTS
// ============================================================

// Size conversions
export const SIZE_12OZ_ML = 355;  // 12 oz in ml
export const SIZE_16OZ_ML = 473;  // 16 oz in ml

// ============================================================
// PROMO VALIDATION
// ============================================================

/**
 * Check if a promo code is valid for the current cart
 */
export async function validatePromoCode({
  code,
  cartItems,
  subtotalCents,
  customerIdentifier,
}: ValidatePromoCodeOptions): Promise<{
  valid: boolean;
  promo?: PromoWithRelations;
  error?: string;
  discountCents?: number;
  requiresAction?: {
    type: "select_variant" | "select_addon" | "add_items";
    options?: any;
  };
}> {
  // Normalize code to uppercase
  const normalizedCode = code.toUpperCase().trim();

  if (!normalizedCode) {
    return { valid: false, error: "Please enter a promo code" };
  }

  // Fetch promo from Supabase with relations
  const { data: promo, error } = await supabase
    .from("promos")
    .select(`
      *,
      promo_bundles(*),
      promo_free_addons(*),
      promo_variants(*)
    `)
    .eq("code", normalizedCode)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !promo) {
    return { valid: false, error: "Invalid promo code" };
  }

  // Check time validity
  const now = new Date();
  const validFrom = new Date(promo.valid_from);
  const validUntil = promo.valid_until ? new Date(promo.valid_until) : null;

  if (now < validFrom) {
    return { valid: false, error: "This promo is not yet active" };
  }

  if (validUntil && now > validUntil) {
    return { valid: false, error: "This promo has expired" };
  }

  // Check total usage limit
  if (promo.usage_limit_total) {
    const { count } = await supabase
      .from("promo_usage")
      .select("*", { count: "exact", head: true })
      .eq("promo_id", promo.id);

    if ((count || 0) >= promo.usage_limit_total) {
      return { valid: false, error: "This promo has reached its usage limit" };
    }
  }

  // Check per-customer usage limit
  if (promo.usage_limit_per_customer && customerIdentifier) {
    const { count } = await supabase
      .from("promo_usage")
      .select("*", { count: "exact", head: true })
      .eq("promo_id", promo.id)
      .eq("customer_identifier", customerIdentifier);

    if ((count || 0) >= promo.usage_limit_per_customer) {
      return { valid: false, error: "You've reached the usage limit for this promo" };
    }
  }

  // Type-specific validation
  switch (promo.promo_type) {
    case "percentage":
    case "fixed_amount":
      return validateDiscountPromo(promo, cartItems, subtotalCents);

    case "bundle":
      return validateBundlePromo(promo, cartItems, subtotalCents);

    case "free_addon":
      return validateFreeAddonPromo(promo, cartItems);

    default:
      return { valid: false, error: "Unsupported promo type" };
  }
}

/**
 * Server-side promo validation + application via RPC
 */
export async function applyPromoServer({
  code,
  cartItems,
  subtotalCents,
  selectedVariantId,
  selectedAddonId,
  customerIdentifier,
}: ApplyPromoServerOptions): Promise<PromoApplicationResult> {
  const cartPayload = cartItems.map((item) => ({
    drink_id: item.drink_id ?? null,
    size_ml: item.size_ml ?? null,
  }));

  const { data, error } = await supabase.rpc("validate_apply_promo", {
    p_code: code,
    p_subtotal_cents: subtotalCents,
    p_cart_items: cartPayload,
    p_selected_variant_id: selectedVariantId ?? null,
    p_selected_addon_id: selectedAddonId ?? null,
    p_customer_identifier: customerIdentifier ?? null,
  });

  if (error || !data) {
    return {
      success: false,
      discount_cents: 0,
      new_subtotal_cents: subtotalCents,
      errors: ["Failed to apply promo"],
    };
  }

  return data as PromoApplicationResult;
}

/**
 * Validate discount promos (percentage or fixed amount)
 */
function validateDiscountPromo(
  promo: PromoWithRelations,
  cartItems: CartItem[],
  subtotalCents: number
): {
  valid: boolean;
  promo: PromoWithRelations;
  error?: string;
  discountCents: number;
} {
  // Check minimum order
  if (promo.min_order_cents && subtotalCents < promo.min_order_cents) {
    return {
      valid: false,
      promo,
      error: `Minimum order of ₱${(promo.min_order_cents / 100).toFixed(2)} required`,
      discountCents: 0,
    };
  }

  // Check applicable drinks/categories
  if (promo.applicable_drink_ids?.length || promo.required_categories?.length) {
    const hasApplicableItem = cartItems.some((item) =>
      promo.applicable_drink_ids?.includes(item.drink_id || "")
    );

    if (!hasApplicableItem) {
      return {
        valid: false,
        promo,
        error: "This promo applies to specific drinks only",
        discountCents: 0,
      };
    }
  }

  // Calculate discount
  let discountCents = 0;
  if (promo.promo_type === "percentage" && promo.discount_percentage) {
    discountCents = Math.round(subtotalCents * (promo.discount_percentage / 100));
  } else if (promo.promo_type === "fixed_amount" && promo.discount_cents) {
    discountCents = promo.discount_cents;
  }

  // Cap discount
  if (promo.max_discount_cents && discountCents > promo.max_discount_cents) {
    discountCents = promo.max_discount_cents;
  }

  return {
    valid: true,
    promo,
    discountCents,
  };
}

/**
 * Validate bundle promos
 */
function validateBundlePromo(
  promo: PromoWithRelations,
  cartItems: CartItem[],
  subtotalCents: number
): {
  valid: boolean;
  promo: PromoWithRelations;
  error?: string;
  discountCents?: number;
  requiresAction?: {
    type: "select_variant" | "select_addon" | "add_items";
    options?: any;
  };
} {
  const bundleConfig = promo.promo_bundles?.[0];

  if (!bundleConfig) {
    return {
      valid: false,
      promo,
      error: "Bundle configuration not found",
      discountCents: 0,
    };
  }

  // Check size requirements
  const count12oz = cartItems.filter((item) => item.size_ml === SIZE_12OZ_ML).length;
  const count16oz = cartItems.filter((item) => item.size_ml === SIZE_16OZ_ML).length;

  if (bundleConfig.size_12oz_quantity > 0 && count12oz < bundleConfig.size_12oz_quantity) {
    return {
      valid: false,
      promo,
      error: `This bundle requires ${bundleConfig.size_12oz_quantity}x 12oz drink(s)`,
      discountCents: 0,
    };
  }

  if (bundleConfig.size_16oz_quantity > 0 && count16oz < bundleConfig.size_16oz_quantity) {
    return {
      valid: false,
      promo,
      error: `This bundle requires ${bundleConfig.size_16oz_quantity}x 16oz drink(s)`,
      discountCents: 0,
    };
  }

  // Check item count
  if (cartItems.length < bundleConfig.items_quantity) {
    return {
      valid: false,
      promo,
      error: `This bundle requires ${bundleConfig.items_quantity} items`,
      discountCents: 0,
      requiresAction: {
        type: "add_items",
        options: { required: bundleConfig.items_quantity },
      },
    };
  }

  // Check if bundle requires variants
  if (bundleConfig.allow_variants && promo.promo_variants && promo.promo_variants.length > 0) {
    return {
      valid: true,
      promo,
      discountCents: 0,
      requiresAction: {
        type: "select_variant",
        options: promo.promo_variants.filter((v) => v.is_active),
      },
    };
  }

  // Calculate bundle discount (difference between cart total and bundle price)
  const bundlePrice = promo.bundle_price_cents || 0;
  const discountCents = Math.max(0, subtotalCents - bundlePrice);

  return {
    valid: true,
    promo,
    discountCents,
  };
}

/**
 * Validate free add-on promos
 */
function validateFreeAddonPromo(
  promo: PromoWithRelations,
  cartItems: CartItem[]
): {
  valid: boolean;
  promo: PromoWithRelations;
  error?: string;
  discountCents: number;
  requiresAction?: {
    type: "select_variant" | "select_addon" | "add_items";
    options?: any;
  };
} {
  const freeAddonConfig = promo.promo_free_addons?.[0];

  if (!freeAddonConfig) {
    return {
      valid: false,
      promo,
      error: "Free add-on configuration not found",
      discountCents: 0,
    };
  }

  // Check for qualifying items
  const hasQualifyingItem = cartItems.some((item) => {
    // Check size requirements
    if (freeAddonConfig.qualifying_size_ml) {
      return item.size_ml === freeAddonConfig.qualifying_size_ml;
    }
    if (freeAddonConfig.qualifying_drink_id) {
      return item.drink_id === freeAddonConfig.qualifying_drink_id;
    }
    return true;
  });

  if (!hasQualifyingItem) {
    return {
      valid: false,
      promo,
      error: "Add a qualifying drink to use this promo",
      discountCents: 0,
    };
  }

  // If customer can choose add-on, return action
  if (freeAddonConfig.can_choose_addon) {
    return {
      valid: true,
      promo,
      discountCents: 0, // Will be calculated when add-on selected
      requiresAction: {
        type: "select_addon",
        options: {
          maxFreeQuantity: freeAddonConfig.max_free_quantity,
        },
      },
    };
  }

  // Fixed free add-on - calculate discount
  if (freeAddonConfig.free_addon_id) {
    // Get add-on price
    // Note: This will be calculated during application
    return {
      valid: true,
      promo,
      discountCents: 0, // Will be calculated when applied
    };
  }

  return {
    valid: true,
    promo,
    discountCents: 0,
  };
}

// ============================================================
// PROMO APPLICATION
// ============================================================

/**
 * Apply a promo to the cart and calculate new totals
 */
export async function applyPromo({
  promo,
  subtotalCents,
  selectedVariantId,
  selectedAddonId,
}: ApplyPromoOptions): Promise<PromoApplicationResult> {
  const errors: string[] = [];
  let discountCents = 0;

  try {
    switch (promo.promo_type) {
      case "percentage": {
        if (!promo.discount_percentage) {
          errors.push("Invalid percentage discount");
          break;
        }
        discountCents = Math.round(subtotalCents * (promo.discount_percentage / 100));
        break;
      }

      case "fixed_amount": {
        if (!promo.discount_cents) {
          errors.push("Invalid fixed discount");
          break;
        }
        discountCents = promo.discount_cents;
        break;
      }

      case "bundle": {
        // Get bundle price from variant if selected
        if (selectedVariantId) {
          const { data: variant } = await supabase
            .from("promo_variants")
            .select("price_cents")
            .eq("id", selectedVariantId)
            .eq("is_active", true)
            .single();

          if (variant) {
            discountCents = Math.max(0, subtotalCents - variant.price_cents);
          }
        } else if (promo.bundle_price_cents) {
          discountCents = Math.max(0, subtotalCents - promo.bundle_price_cents);
        }
        break;
      }

      case "free_addon": {
        // Get add-on price
        if (selectedAddonId) {
          const { data: pricing } = await supabase
            .from("ingredient_pricing_effective")
            .select("price_php")
            .eq("ingredient_id", selectedAddonId)
            .eq("is_active", true)
            .single();

          if (pricing?.price_php) {
            discountCents = Math.round(pricing.price_php * 100);
          }
        }
        break;
      }
    }

    // Cap discount
    if (promo.max_discount_cents && discountCents > promo.max_discount_cents) {
      discountCents = promo.max_discount_cents;
    }

    // Ensure discount doesn't exceed subtotal
    if (discountCents > subtotalCents) {
      discountCents = subtotalCents;
    }

    if (errors.length > 0) {
      return {
        success: false,
        discount_cents: 0,
        new_subtotal_cents: subtotalCents,
        errors,
      };
    }

    return {
      success: true,
      discount_cents: discountCents,
      new_subtotal_cents: subtotalCents - discountCents,
      applied_promo: {
        promo_id: promo.id,
        code: promo.code,
        description: promo.description || promo.name,
      },
    };
  } catch (error) {
    console.error("Error applying promo:", error);
    return {
      success: false,
      discount_cents: 0,
      new_subtotal_cents: subtotalCents,
      errors: ["Failed to apply promo"],
    };
  }
}

// ============================================================
// PROMO TRACKING
// ============================================================

/**
 * Record promo usage for an order
 */
export async function recordPromoUsage(
  promoId: string,
  orderId: string,
  discountCents: number,
  customerIdentifier?: string
): Promise<void> {
  try {
    await supabase.from("promo_usage").insert({
      promo_id: promoId,
      order_id: orderId,
      customer_identifier: customerIdentifier,
      discount_cents: discountCents,
    });
  } catch (error) {
    console.error("Error recording promo usage:", error);
    // Don't throw - this shouldn't block order completion
  }
}

/**
 * Get available promos for the current cart
 */
export async function getAvailablePromos(
  cartItems: CartItem[],
  subtotalCents: number
): Promise<Promo[]> {
  const { data, error } = await supabase
    .from("promos")
    .select("*")
    .eq("is_active", true)
    .lte("valid_from", new Date().toISOString())
    .or("valid_until.is.null,valid_until.gte." + new Date().toISOString())
    .order("priority", { ascending: false });

  if (error) {
    console.error("Error fetching available promos:", error);
    return [];
  }

  return (data || []).filter((promo) => {
    // Filter by cart contents
    if (promo.min_order_cents && subtotalCents < promo.min_order_cents) {
      return false;
    }

    // Check if cart has applicable items
    if (promo.applicable_drink_ids?.length) {
      const hasApplicableItem = cartItems.some((item) =>
        promo.applicable_drink_ids!.includes(item.drink_id || "")
      );
      if (!hasApplicableItem) return false;
    }

    return true;
  });
}

// ============================================================
// DISPLAY HELPERS
// ============================================================

/**
 * Format promo discount for display
 */
export function formatPromoDiscount(promo: Promo): string {
  switch (promo.promo_type) {
    case "percentage":
      return `${promo.discount_percentage}% OFF`;
    case "fixed_amount":
      return `SAVE ₱${((promo.discount_cents || 0) / 100).toFixed(2)}`;
    case "bundle":
      return `₱${((promo.bundle_price_cents || 0) / 100).toFixed(2)} BUNDLE`;
    case "free_addon":
      return `FREE ADD-ON`;
    default:
      return "SPECIAL OFFER";
  }
}

/**
 * Calculate promo savings amount
 */
export function calculatePromoSavings(originalCents: number, promo: Promo): number {
  switch (promo.promo_type) {
    case "percentage":
      return Math.round(originalCents * ((promo.discount_percentage || 0) / 100));
    case "fixed_amount":
      return Math.min(promo.discount_cents || 0, originalCents);
    case "bundle":
      return Math.max(0, originalCents - (promo.bundle_price_cents || 0));
    default:
      return 0;
  }
}

/**
 * Format price in cents to PHP
 */
export function formatPrice(cents: number): string {
  return `₱${(cents / 100).toFixed(2)}`;
}

/**
 * Check if promo is currently valid
 */
export function isPromoCurrentlyValid(promo: Promo): boolean {
  const now = new Date();
  const validFrom = new Date(promo.valid_from);
  const validUntil = promo.valid_until ? new Date(promo.valid_until) : null;

  if (!promo.is_active) return false;
  if (now < validFrom) return false;
  if (validUntil && now > validUntil) return false;

  return true;
}
