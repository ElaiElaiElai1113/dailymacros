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
};

// ——— Cart ———

// richer line for cart display
export type CartLine = LineIngredient & {
  role?: "base" | "extra";
  name?: string; // snapshot of the ingredient name for stable display
};

export type CartItem = {
  item_name: string; // card title
  drink_id?: string | null; // base drink id (if any)
  size_ml?: number | null;
  unit_price_cents: number;

  // NEW: optional base/add-on breakdown to show in the cart
  base_drink_name?: string;
  base_price_cents?: number;
  addons_price_cents?: number;

  lines: CartLine[];
};

export type Order = {
  id: string;
  pickup_time: string;
  status: "pending" | "in_progress" | "ready" | "picked_up" | "cancelled";
};
