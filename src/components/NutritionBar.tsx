import { totalsFor } from "@/utils/nutrition";

type NutritionTotals = ReturnType<typeof totalsFor>["totals"];

export default function NutritionBar({
  totals,
  allergens,
}: {
  totals: NutritionTotals;
  allergens: string[];
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 shadow md:static md:rounded md:border" role="region" aria-label="Nutrition information">
      <div className="flex flex-wrap gap-4 items-center text-sm" role="list" aria-label="Nutritional values">
        <div className="font-semibold" role="listitem" aria-label={`Energy: ${Math.round(totals.energy_kcal)} kilocalories`}>
          Energy: {Math.round(totals.energy_kcal)} kcal
        </div>
        <div role="listitem" aria-label={`Protein: ${totals.protein_g} grams`}>Protein: {totals.protein_g} g</div>
        <div role="listitem" aria-label={`Fat: ${totals.fat_g} grams`}>Fat: {totals.fat_g} g</div>
        <div role="listitem" aria-label={`Carbohydrates: ${totals.carbs_g} grams`}>Carbs: {totals.carbs_g} g</div>
        <div role="listitem" aria-label={`Sugars: ${totals.sugars_g} grams`}>Sugars: {totals.sugars_g} g</div>
        <div role="listitem" aria-label={`Fiber: ${totals.fiber_g} grams`}>Fiber: {totals.fiber_g} g</div>
        <div role="listitem" aria-label={`Sodium: ${totals.sodium_mg} milligrams`}>Sodium: {totals.sodium_mg} mg</div>
        {allergens.length > 0 && (
          <div className="ml-auto text-rose-600" role="listitem" aria-label={`Allergens: ${allergens.join(", ")}`}>
            Allergens: {allergens.join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}
