export type Profile = {
  user_id: string;
  full_name: string | null;
  role: "customer" | "staff" | "admin";
};
export type Ingredient = {
  id: string;
  name: string;
  category: string;
  unit_default: string;
  grams_per_unit: number | null;
  density_g_per_ml: number | null;
  allergen_tags: string[];
  is_active: boolean;
};
export type IngredientNutrition = {
  ingredient_id: string;
  per_100g_energy_kcal: number;
  per_100g_protein_g: number;
  per_100g_fat_g: number;
  per_100g_carbs_g: number;
  per_100g_sugars_g: number;
  per_100g_fiber_g: number;
  per_100g_sodium_mg: number;
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
export type CartItem = {
  item_name: string;
  drink_id?: string | null;
  size_ml?: number | null;
  unit_price_cents: number;
  lines: LineIngredient[];
};
export type Order = {
  id: string;
  pickup_time: string;
  status: "pending" | "in_progress" | "ready" | "picked_up" | "cancelled";
};
