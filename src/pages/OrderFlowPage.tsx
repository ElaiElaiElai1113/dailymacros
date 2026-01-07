import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

const steps = [
  { id: 1, label: "Choose base" },
  { id: 2, label: "Customize" },
  { id: 3, label: "Review" },
];

export default function OrderFlowPage() {
  const { addItem } = useCart();
  const navigate = useNavigate();
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
  const [step, setStep] = useState(1);
  const [added, setAdded] = useState(false);
  const hasBase = !!selectedBaseId;

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
      setStep(2);
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

  useEffect(() => {
    setAdded(false);
  }, [selectedBaseId, extraLines]);

  function handleAddAddon(
    ingredient: Ingredient,
    amount: number,
    unit: string
  ) {
    if (!selectedBaseId) {
      alert("Pick a base drink first.");
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

  function buildCartItem(): CartItem | null {
    if (!selectedBase) return null;
    return {
      item_name: `Custom - ${selectedBase.name}`,
      drink_id: selectedBase.id,
      unit_price_cents: total_price_cents,
      base_price_cents,
      addons_price_cents,
      base_drink_name: selectedBase.name,
      image_url: selectedBase.image_url ?? null,
      lines: [...baseLines, ...extraLines],
    };
  }

  function addToCart() {
    const item = buildCartItem();
    if (!item) return;
    addItem(item);
    setAdded(true);
  }

  function proceedToCheckout() {
    if (!added) {
      addToCart();
    }
    navigate("/checkout");
  }

  function goNext() {
    if (step === 1 && hasBase) {
      setStep(2);
      return;
    }
    if (step === 2 && hasBase) {
      setStep(3);
      return;
    }
    if (step === 3 && hasBase) {
      proceedToCheckout();
    }
  }

  function goBack() {
    if (step === 3) {
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(1);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(210,110,61,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(89,145,144,0.12),_transparent_45%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 pb-24 lg:pb-8">
        <header className="mb-6 space-y-2">
          <Badge variant="secondary">Guided Order</Badge>
          <h1 className="text-2xl font-semibold">Build your perfect shake</h1>
          <p className="text-sm text-muted-foreground">
            Choose a base, customize add-ons, then review before checkout.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {steps.map((s) => (
                <Button
                  key={s.id}
                  variant={step === s.id ? "default" : "outline"}
                  size="sm"
                  disabled={!hasBase && s.id > 1}
                  onClick={() => setStep(s.id)}
                >
                  {s.id}. {s.label}
                </Button>
              ))}
            </div>

            {step === 1 && (
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    Choose your base drink
                  </CardTitle>
                  {loadingBase && <Badge variant="secondary">Loading...</Badge>}
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
                            onClick={() => {
                              setSelectedBaseId(d.id);
                              setStep(2);
                            }}
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
            )}

            {step === 2 && (
              <div className="space-y-6">
                {!selectedBase ? (
                  <Alert>
                    <AlertTitle>Select a base drink</AlertTitle>
                    <AlertDescription>
                      Choose a base drink to unlock customization.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <Card>
                      <CardHeader className="flex-row items-center justify-between">
                        <CardTitle className="text-base">
                          Customize add-ons
                        </CardTitle>
                        <Badge variant="glow">Live macros</Badge>
                      </CardHeader>
                      <CardContent>
                        <IngredientSelector
                          onAdd={handleAddAddon}
                          getPricePHP={(ing, amount, unit) =>
                            priceForLinePHP(
                              { ingredient_id: ing.id, amount, unit },
                              pricingDict
                            )
                          }
                          selectedIngredientIds={extraLines.map(
                            (l) => l.ingredient_id
                          )}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex-row items-center justify-between">
                        <CardTitle className="text-base">
                          Selected add-ons
                        </CardTitle>
                        {extraLines.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExtraLines([])}
                          >
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
                      </CardContent>
                    </Card>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Button variant="outline" onClick={goBack}>
                        Back to base
                      </Button>
                      <Button onClick={() => setStep(3)}>
                        Review order
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Review your order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selectedBase ? (
                    <Alert>
                      <AlertTitle>Select a base drink first</AlertTitle>
                      <AlertDescription>
                        Go back to Step 1 to pick a base.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">
                          {selectedBase.name}
                        </div>
                        <Badge variant="secondary">
                          PHP {(base_price_cents / 100).toFixed(2)}
                        </Badge>
                      </div>
                      {extraLines.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Add-ons
                          </div>
                          <ul className="space-y-1 text-sm">
                            {extraLines.map((l, i) => (
                              <li
                                key={i}
                                className="flex items-center justify-between"
                              >
                                <span>{l.name}</span>
                                <span className="text-muted-foreground">
                                  {l.amount} {l.unit}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-base">
                        <span className="font-semibold">Total</span>
                        <span className="font-semibold">
                          PHP {(total_price_cents / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={addToCart} disabled={added}>
                          {added ? "Added to cart" : "Add to Cart"}
                        </Button>
                        <Button variant="secondary" onClick={proceedToCheckout}>
                          Proceed to Checkout
                        </Button>
                        <Button variant="outline" onClick={goBack}>
                          Back to customize
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Order summary</CardTitle>
                <Badge variant="secondary">
                  PHP {(total_price_cents / 100).toFixed(2)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Base</span>
                  <span>PHP {(base_price_cents / 100).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Add-ons</span>
                  <span>PHP {addons_price_php.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>PHP {(total_price_cents / 100).toFixed(2)}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(3)}
                >
                  Review order
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Your macros</CardTitle>
                <Badge variant="secondary">Live</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <NutritionBar totals={totals} allergens={allergens} />
                {hasMissingNutrition && (
                  <div className="text-xs text-amber-700">
                    Some ingredients are missing nutrition data.
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-base font-semibold">
                PHP {(total_price_cents / 100).toFixed(2)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {step > 1 && (
                <Button variant="outline" size="sm" onClick={goBack}>
                  Back
                </Button>
              )}
              <Button
                size="sm"
                onClick={goNext}
                disabled={!hasBase && step < 3}
              >
                {step === 3 ? "Checkout" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
