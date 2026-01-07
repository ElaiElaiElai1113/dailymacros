import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import {
  groupPricing,
  priceForExtrasPHP,
  priceForLinePHP,
} from "@/utils/pricing";
import { totalsFor } from "@/utils/nutrition";
import { useCart } from "@/context/CartContext";
import IngredientSelector from "@/components/IngredientSelector";
import NutritionBar from "@/components/NutritionBar";
import ExplainMath from "@/components/ExplainMath";
import logoUrl from "@/assets/dailymacroslogo.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";

import type {
  CartItem,
  CartLine,
  Drink,
  Ingredient,
  IngredientNutrition,
  IngredientPricing,
} from "@/types";

type BYODrink = Drink & {
  price_cents: number;
  image_url?: string | null;
};

type V100Row = {
  ingredient_id: string;
  per_100g_energy_kcal: number | null;
  per_100g_protein_g: number | null;
  per_100g_fat_g: number | null;
  per_100g_carbs_g: number | null;
};

export default function BuildYourOwnPage() {
  const { addItem } = useCart();
  const [searchParams] = useSearchParams();

  const [ingDict, setIngDict] = useState<Record<string, Ingredient>>({});
  const [nutrDict, setNutrDict] = useState<Record<string, IngredientNutrition>>(
    {}
  );
  const [pricingDict, setPricingDict] = useState<
    Record<string, IngredientPricing[]>
  >({});

  const [baseDrinks, setBaseDrinks] = useState<BYODrink[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);

  const [baseLines, setBaseLines] = useState<CartLine[]>([]);
  const [extraLines, setExtraLines] = useState<CartLine[]>([]);

  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingBase, setLoadingBase] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingAll(true);
      const [{ data: ii }, { data: nn }, { data: dd }, { data: pp }] =
        await Promise.all([
          supabase.from("ingredients").select("*").eq("is_active", true),
          supabase.from("ingredient_nutrition_v100").select("*"),
          supabase
            .from("drinks")
            .select(
              "id,name,description,price_php,base_size_ml,is_active,image_url"
            )
            .eq("is_active", true)
            .order("name"),
          supabase.from("ingredient_pricing_effective").select("*"),
        ]);

      const ingredients = (ii ?? []) as Ingredient[];
      setIngDict(Object.fromEntries(ingredients.map((x) => [x.id, x])));

      const v100 = (nn ?? []) as V100Row[];
      setNutrDict(
        Object.fromEntries(
          v100.map((r) => [
            r.ingredient_id,
            {
              ingredient_id: r.ingredient_id,
              per_100g_energy_kcal: r.per_100g_energy_kcal ?? 0,
              per_100g_protein_g: r.per_100g_protein_g ?? 0,
              per_100g_fat_g: r.per_100g_fat_g ?? 0,
              per_100g_carbs_g: r.per_100g_carbs_g ?? 0,
            } as IngredientNutrition,
          ])
        )
      );

      const pricing = (pp ?? []) as IngredientPricing[];
      setPricingDict(groupPricing(pricing));

      const drinkRows = (dd ?? []) as Array<
        Omit<Drink, "price_cents"> & {
          price_php: number | null;
          image_url?: string | null;
        }
      >;
      const normalized: BYODrink[] = drinkRows.map((d) => ({
        ...d,
        price_cents:
          typeof d.price_php === "number" ? Math.round(d.price_php * 100) : 0,
      }));
      setBaseDrinks(normalized);

      setLoadingAll(false);
    })();
  }, []);

  useEffect(() => {
    const baseFromUrl = searchParams.get("base");
    if (baseFromUrl && baseDrinks.some((d) => d.id === baseFromUrl)) {
      setSelectedBaseId(baseFromUrl);
    }
  }, [searchParams, baseDrinks]);

  useEffect(() => {
    if (!selectedBaseId) {
      setBaseLines([]);
      return;
    }
    (async () => {
      setLoadingBase(true);
      const { data } = await supabase
        .from("drink_lines")
        .select("ingredient_id,amount,unit")
        .eq("drink_id", selectedBaseId);

      const rows =
        (data as Array<{
          ingredient_id: string;
          amount: number;
          unit: string;
        }>) ?? [];

      setBaseLines(
        rows.map((r) => ({
          ingredient_id: r.ingredient_id,
          amount: Number(r.amount),
          unit: r.unit,
          role: "base",
          name: ingDict[r.ingredient_id]?.name,
        }))
      );
      setLoadingBase(false);
    })();
  }, [selectedBaseId, ingDict]);

  function handleAddAddon(
    ingredient: Ingredient,
    amount: number,
    unit: string
  ) {
    if (!selectedBaseId) {
      toast({
        title: "Choose a base drink",
        description: "Pick a base before adding extras.",
        variant: "destructive",
      });
      return;
    }

    const newLine: CartLine = {
      ingredient_id: ingredient.id,
      amount,
      unit,
      name: ingredient.name,
      role: "extra",
    };

    setExtraLines((prev) => [...prev, newLine]);
  }

  function removeAddon(idx: number) {
    setExtraLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const combinedLines = useMemo(
    () => [...baseLines, ...extraLines],
    [baseLines, extraLines]
  );

  const { totals, allergens } = useMemo(
    () => totalsFor(combinedLines, ingDict, nutrDict),
    [combinedLines, ingDict, nutrDict]
  );

  const selectedBase = baseDrinks.find((b) => b.id === selectedBaseId) || null;

  const addons_price_php = useMemo(
    () => priceForExtrasPHP(extraLines, pricingDict),
    [extraLines, pricingDict]
  );

  const addons_price_cents = Math.round(addons_price_php * 100);
  const base_price_cents = selectedBase?.price_cents || 0;
  const total_price_cents = base_price_cents + addons_price_cents;

  const hasMissingNutrition = useMemo(
    () => combinedLines.some((l) => !nutrDict[l.ingredient_id]),
    [combinedLines, nutrDict]
  );

  const linePricePHP = (l: CartLine) => priceForLinePHP(l, pricingDict) ?? 0;

  function addToCart() {
    if (!selectedBase) return;
    const cartItem: CartItem = {
      item_name: `Custom - ${selectedBase.name}`,
      drink_id: selectedBase.id,
      unit_price_cents: total_price_cents,
      base_price_cents,
      addons_price_cents,
      base_drink_name: selectedBase.name,
      image_url: selectedBase.image_url ?? null,
      lines: [...baseLines, ...extraLines],
    };
    addItem(cartItem);
    setExtraLines([]);
    toast({
      title: "Added to cart",
      description: selectedBase.name,
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(210,110,61,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(89,145,144,0.12),_transparent_45%)]">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6 flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border bg-white shadow-sm">
            <img
              src={logoUrl}
              alt="DailyMacros"
              className="h-10 w-10 object-contain"
            />
          </div>
          <div>
            <Badge variant="secondary">Build Your Own</Badge>
            <h1 className="mt-2 text-2xl font-semibold">
              Craft your protein shake
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose a base, add extras, and see nutrition update instantly.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-6 lg:col-span-8">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    1. Choose your base drink
                  </CardTitle>
                </div>
                {loadingBase && (
                  <Badge variant="secondary">Loading recipe...</Badge>
                )}
              </CardHeader>
              <CardContent>
                {loadingAll ? (
                  <div className="text-sm text-muted-foreground">
                    Loading drinks...
                  </div>
                ) : baseDrinks.length === 0 ? (
                  <Alert>
                    <AlertTitle>No base drinks yet</AlertTitle>
                    <AlertDescription>
                      Add base drinks in the admin panel first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {baseDrinks.map((d) => {
                      const active = d.id === selectedBaseId;
                      return (
                        <button
                          key={d.id}
                          onClick={() => setSelectedBaseId(d.id)}
                          className={`group overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition ${
                            active
                              ? "border-primary/60 ring-2 ring-primary/30"
                              : "hover:border-primary/40 hover:shadow-md"
                          }`}
                        >
                          {d.image_url ? (
                            <div className="h-32 w-full bg-white flex items-center justify-center overflow-hidden">
                              <img
                                src={d.image_url}
                                alt={d.name}
                                className="max-h-full max-w-full object-contain transition group-hover:scale-[1.01]"
                              />
                            </div>
                          ) : (
                            <div className="h-32 w-full bg-gradient-to-br from-[#FFE7C5] to-[#FFF8DE]" />
                          )}

                          <div className="p-3 space-y-1">
                            <div className="font-semibold">{d.name}</div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {d.description || "Signature blend"}
                            </p>
                            <div className="text-xs font-medium text-emerald-700">
                              PHP {(d.price_cents / 100).toFixed(2)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">2. Add-ons</CardTitle>
                <Badge variant="glow">Live macros</Badge>
              </CardHeader>
              <CardContent>
                {!selectedBase ? (
                  <div className="text-sm text-muted-foreground">
                    Choose a base drink first to enable add-ons.
                  </div>
                ) : (
                  <IngredientSelector
                    onAdd={handleAddAddon}
                    getPricePHP={(ing, amount, unit) =>
                      priceForLinePHP(
                        { ingredient_id: ing.id, amount, unit },
                        pricingDict
                      )
                    }
                    selectedIngredientIds={extraLines.map((l) => l.ingredient_id)}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Selected add-ons</CardTitle>
                {extraLines.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setExtraLines([])}>
                    Clear all
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {extraLines.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No add-ons yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-muted/60 text-sm">
                    {extraLines.map((l, i) => {
                      const php = linePricePHP(l);
                      return (
                        <li
                          key={i}
                          className="flex items-center justify-between py-2"
                        >
                          <div className="min-w-0">
                            <span className="font-medium">{l.name}</span>{" "}
                            <span className="text-muted-foreground">
                              - {l.amount} {l.unit}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-emerald-700">
                              PHP {php.toFixed(2)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAddon(i)}
                            >
                              Remove
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button onClick={addToCart} disabled={!selectedBase}>
                    Add to Cart - PHP {(total_price_cents / 100).toFixed(2)}
                  </Button>

                  <ExplainMath
                    lines={combinedLines}
                    ingDict={ingDict}
                    nutrDict={nutrDict}
                    buttonClassName="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted/60"
                    styleOverride={{
                      borderColor: "hsl(var(--accent))",
                      color: "hsl(var(--accent))",
                    }}
                  />

                  {hasMissingNutrition && (
                    <span className="ml-auto text-xs text-amber-700">
                      Some ingredients are missing nutrition data.
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="col-span-12 lg:col-span-4">
            <div className="space-y-4 lg:sticky lg:top-24">
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">Your macros</CardTitle>
                  <Badge variant="secondary">Live</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <NutritionBar totals={totals} allergens={allergens} />
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl border bg-muted/30 p-2">
                      <div className="text-xs text-muted-foreground">Base</div>
                      <div className="font-semibold">
                        PHP {((base_price_cents || 0) / 100).toFixed(2)}
                      </div>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-2">
                      <div className="text-xs text-muted-foreground">Add-ons</div>
                      <div className="font-semibold">
                        PHP {addons_price_php.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="text-sm text-muted-foreground">
                  Prices include base plus add-ons. Use "Explain my math" for the
                  price breakdown per ingredient.
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
