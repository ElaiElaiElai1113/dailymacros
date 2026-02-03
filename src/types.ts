export type Profile = {
  user_id: string;
  full_name: string | null;
  role: "customer" | "staff" | "admin";
};

export type Ingredient = {
  id: string;
  name: string;
  category: string; // e.g. “Dairy”, “Fruit”, “Add-on”
  unit_default: string; // e.g. “g”
  grams_per_unit: number | null; // for scoop/piece → g
  density_g_per_ml: number | null;
  allergen_tags: string[];
  is_active: boolean;
};

export type IngredientNutrition = {
  ingredient_id: string;

  // v100 view (always present)
  per_100g_energy_kcal: number;
  per_100g_protein_g: number;
  per_100g_fat_g: number;
  per_100g_carbs_g: number;

  // optional extras (we usually default to 0 in code)
  per_100g_sugars_g?: number;
  per_100g_fiber_g?: number;
  per_100g_sodium_mg?: number;

  // exposed by v100 for debugging
  factor_per100?: number | null;
};

export type Drink = {
  id: string;
  name: string;
  description?: string | null;
  base_size_ml?: number | null;
  price_cents: number;
  image_url?: string | null;
};

export type IngredientPricing = {
  id: string;
  ingredient_id: string;
  pricing_mode: "flat" | "per_gram" | "per_ml" | "per_unit";
  price_php: number | null;
  per_php: number | null;
  unit_label: string | null;
  unit_label_norm?: string | null;
  is_active: boolean;
  updated_at: string;
};

export type DrinkIngredient = {
  drink_id: string;
  ingredient_id: string;
  amount: number;
  unit: string;
  is_required: boolean;
};

export type LineIngredient = {
  ingredient_id: string;
  amount: number;
  unit: string;
  is_extra?: boolean;
  name?: string;
};

// ——— Cart ———

export type CartLine = LineIngredient & {
  role?: "base" | "extra";
  name?: string;
};

export type CartItem = {
  item_name: string;
  drink_id?: string | null;
  size_ml?: number | null;
  unit_price_cents: number;
  lines: LineIngredient[];
  base_drink_name?: string;
  base_price_cents?: number;
  addons_price_cents?: number;
  image_url?: string | null;
};

export type Order = {
  id: string;
  pickup_time: string;
  status: "pending" | "in_progress" | "ready" | "picked_up" | "cancelled";
};

// ==================== PROMO TYPES ====================

export type PromoType =
  | "bundle"           // Fixed bundle at set price
  | "percentage"       // Percentage discount
  | "fixed_amount"     // Fixed amount discount
  | "free_addon"       // Free add-on/item
  | "buy_x_get_y";     // Buy X get Y free

export interface Promo {
  id: string;
  code: string;
  name: string;
  description?: string | null;

  promo_type: PromoType;

  // Discount values (one applies based on type)
  discount_percentage?: number | null;
  discount_cents?: number | null;
  bundle_price_cents?: number | null;

  // Constraints
  min_order_cents?: number | null;
  max_discount_cents?: number | null;
  usage_limit_per_customer?: number | null;
  usage_limit_total?: number | null;

  // Time constraints
  valid_from: string;
  valid_until?: string | null;

  // Targeting
  applicable_drink_ids?: string[] | null;
  applicable_size_mls?: number[] | null;
  required_categories?: string[] | null;
  customer_type?: "all" | "new" | "returning";

  // Status
  is_active: boolean;
  priority: number;

  // Display
  image_url?: string | null;
  terms?: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface PromoBundle {
  id: string;
  promo_id: string;
  bundle_name: string;
  requires_multiple_items: boolean;
  items_quantity: number;
  size_12oz_quantity: number;
  size_16oz_quantity: number;
  allow_variants: boolean;
  variant_types?: string[] | null;
}

export interface PromoFreeAddon {
  id: string;
  promo_id: string;
  qualifying_drink_id?: string | null;
  qualifying_size_ml?: number | null;
  free_addon_id?: string | null;
  free_addon_quantity: number;
  max_free_quantity: number;
  can_choose_addon: boolean;
}

export interface PromoVariant {
  id: string;
  promo_id: string;
  variant_name: string;
  price_cents: number;
  drink_config?: any;
  is_active: boolean;
}

export interface PromoUsage {
  id: string;
  promo_id: string;
  order_id: string;
  customer_identifier?: string | null;
  discount_cents: number;
  applied_at: string;
}

export interface PromoValidationResult {
  valid: boolean;
  promo?: Promo;
  error?: string;
  discount_cents?: number;
  requires_action?: {
    type: "select_variant" | "select_addon" | "add_items";
    options?: any;
  };
}

export interface PromoApplicationResult {
  success: boolean;
  discount_cents: number;
  new_subtotal_cents: number;
  applied_promo?: {
    promo_id: string;
    code: string;
    description: string;
  };
  promo?: Promo;
  requires_action?: {
    type: "select_variant" | "select_addon" | "add_items";
    options?: any;
  };
  errors?: string[];
}
