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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 shadow md:static md:rounded md:border">
      <div className="flex flex-wrap gap-4 items-center text-sm">
        <div className="font-semibold">
          Energy: {Math.round(totals.energy_kcal)} kcal
        </div>
        <div>Protein: {totals.protein_g} g</div>
        <div>Fat: {totals.fat_g} g</div>
        <div>Carbs: {totals.carbs_g} g</div>
        <div>Sugars: {totals.sugars_g} g</div>
        <div>Fiber: {totals.fiber_g} g</div>
        <div>Sodium: {totals.sodium_mg} mg</div>
        {allergens.length > 0 && (
          <div className="ml-auto text-rose-600">
            Allergens: {allergens.join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}
