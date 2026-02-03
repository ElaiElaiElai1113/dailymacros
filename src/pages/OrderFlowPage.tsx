import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
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
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ChevronRight, Sparkles, Plus, X, ShoppingCart } from "lucide-react";

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

type DrinkSizeRow = {
  id: string;
  drink_id: string;
  size_label: string | null;
  display_name: string | null;
  size_ml: number;
  is_active: boolean;
};

type DrinkSizeLineRow = {
  drink_size_id: string;
  ingredient_id: string;
  amount: number;
  unit: string;
};

const DEFAULT_SIZES = [
  { label: "12 oz", ml: 355 },
  { label: "16 oz", ml: 473 },
];

function mlToOzLabel(sizeMl: number) {
  const oz = Math.round((sizeMl / 29.5735) * 10) / 10;
  return `${oz} oz`;
}

function scaleLines(
  lines: CartLine[],
  referenceMl: number | null,
  targetMl: number
): CartLine[] {
  if (!referenceMl || referenceMl <= 0) return lines;
  const factor = targetMl / referenceMl;
  return lines.map((l) => ({ ...l, amount: Number(l.amount) * factor }));
}

const steps = [
  { id: 1, label: "Choose base" },
  { id: 2, label: "Customize" },
  { id: 3, label: "Review" },
];

// Animation variants
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 80,
      damping: 12,
    },
  },
};

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
  const [drinkSizes, setDrinkSizes] = useState<DrinkSizeRow[]>([]);
  const [sizeLines, setSizeLines] = useState<DrinkSizeLineRow[]>([]);

  const [baseDrinks, setBaseDrinks] = useState<BYODrink[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [baseLines, setBaseLines] = useState<CartLine[]>([]);
  const [extraLines, setExtraLines] = useState<CartLine[]>([]);
  const [sizeMl, setSizeMl] = useState<number>(DEFAULT_SIZES[1].ml);

  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingBase, setLoadingBase] = useState(false);
  const [step, setStep] = useState(1);
  const [added, setAdded] = useState(false);
  const [direction, setDirection] = useState(0);
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

      const drinkIds = normalized.map((d) => d.id);
      const { data: ds } = await supabase
        .from("drink_sizes")
        .select("id,drink_id,size_label,display_name,size_ml,is_active")
        .in(
          "drink_id",
          drinkIds.length
            ? drinkIds
            : ["00000000-0000-0000-0000-000000000000"]
        );
      setDrinkSizes((ds || []) as DrinkSizeRow[]);

      const drinkSizeIds = (ds || []).map((s) => s.id);
      const { data: sl } = await supabase
        .from("drink_size_lines")
        .select("drink_size_id,ingredient_id,amount,unit")
        .in(
          "drink_size_id",
          drinkSizeIds.length
            ? drinkSizeIds
            : ["00000000-0000-0000-0000-000000000000"]
        );
      setSizeLines((sl || []) as DrinkSizeLineRow[]);

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

  const selectedBase = baseDrinks.find((b) => b.id === selectedBaseId) || null;

  const sizeOptions = useMemo(() => {
    if (!selectedBaseId) return DEFAULT_SIZES;
    const sizes = drinkSizes
      .filter((s) => s.drink_id === selectedBaseId && s.is_active)
      .map((s) => ({
        ml: s.size_ml,
        label: s.display_name || s.size_label || mlToOzLabel(s.size_ml),
      }));
    return sizes.length ? sizes : DEFAULT_SIZES;
  }, [drinkSizes, selectedBaseId]);

  const sizeLinesByDrink = useMemo(() => {
    const map: Record<string, Record<string, CartLine[]>> = {};
    const sizeById = new Map(drinkSizes.map((s) => [s.id, s] as const));
    for (const r of sizeLines) {
      const size = sizeById.get(r.drink_size_id);
      if (!size) continue;
      const sizeKey = String(size.size_ml);
      if (!map[size.drink_id]) map[size.drink_id] = {};
      (map[size.drink_id][sizeKey] ||= []).push({
        ingredient_id: r.ingredient_id,
        amount: Number(r.amount),
        unit: r.unit,
        role: "base",
        name: ingDict[r.ingredient_id]?.name,
      });
    }
    return map;
  }, [sizeLines, drinkSizes, ingDict]);

  useEffect(() => {
    if (!selectedBase) return;
    const baseSize = selectedBase.base_size_ml ?? sizeOptions[0]?.ml ?? DEFAULT_SIZES[1].ml;
    const optionMls = sizeOptions.map((s) => s.ml);
    setSizeMl(optionMls.includes(baseSize) ? baseSize : optionMls[0]);
  }, [selectedBase?.id, selectedBase?.base_size_ml, sizeOptions]);

  const sizeLinesForSelection =
    selectedBaseId && sizeLinesByDrink[selectedBaseId]
      ? sizeLinesByDrink[selectedBaseId][String(sizeMl)] || []
      : [];

  const scaledBaseLines = useMemo(
    () => scaleLines(baseLines, selectedBase?.base_size_ml ?? null, sizeMl),
    [baseLines, selectedBase?.base_size_ml, sizeMl]
  );

  const effectiveBaseLines =
    sizeLinesForSelection.length > 0 ? sizeLinesForSelection : scaledBaseLines;

  const combinedLines = useMemo(
    () => [...effectiveBaseLines, ...extraLines],
    [effectiveBaseLines, extraLines]
  );

  const { totals, allergens } = useMemo(
    () => totalsFor(combinedLines, ingDict, nutrDict),
    [combinedLines, ingDict, nutrDict]
  );

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
      size_ml: sizeMl,
      unit_price_cents: total_price_cents,
      base_price_cents,
      addons_price_cents,
      base_drink_name: selectedBase.name,
      image_url: selectedBase.image_url ?? null,
      lines: [...effectiveBaseLines, ...extraLines],
    };
  }

  function addToCart() {
    const item = buildCartItem();
    if (!item) return;
    addItem(item);
    setAdded(true);
    toast({
      title: "Added to cart",
      description: item.base_drink_name,
    });
  }

  function proceedToCheckout() {
    if (!added) {
      addToCart();
    }
    navigate("/checkout");
  }

  function goNext() {
    if (step === 1 && hasBase) {
      setDirection(1);
      setStep(2);
      return;
    }
    if (step === 2 && hasBase) {
      setDirection(1);
      setStep(3);
      return;
    }
    if (step === 3 && hasBase) {
      proceedToCheckout();
    }
  }

  function goBack() {
    if (step === 3) {
      setDirection(-1);
      setStep(2);
      return;
    }
    if (step === 2) {
      setDirection(-1);
      setStep(1);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(210,110,61,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(89,145,144,0.12),_transparent_45%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 pb-24 lg:pb-8">
        {/* Animated Header */}
        <motion.header
          className="mb-6 space-y-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring" as const }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" as const, stiffness: 200 }}
          >
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Guided Order
            </Badge>
          </motion.div>
          <h1 className="text-2xl font-semibold">Build your perfect shake</h1>
          <p className="text-sm text-muted-foreground">
            Choose a base, customize add-ons, then review before checkout.
          </p>
        </motion.header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            {/* Enhanced Progress Stepper */}
            <motion.div
              className="overflow-hidden"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="flex items-center justify-between">
                {steps.map((s, idx) => {
                  const isCompleted = step > s.id;
                  const isActive = step === s.id;
                  const isClickable = hasBase && idx < step;

                  return (
                    <motion.div
                      key={s.id}
                      className="flex items-center flex-1"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <div className="flex flex-col items-center flex-1">
                        <motion.div
                          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all cursor-default relative ${
                            isActive
                              ? "border-[#D26E3D] bg-[#D26E3D] text-white scale-110 shadow-lg shadow-[#D26E3D]/30"
                              : isCompleted
                              ? "border-emerald-500 bg-emerald-500 text-white scale-105"
                              : hasBase || s.id === 1
                              ? "border-gray-300 bg-white text-gray-500"
                              : "border-gray-200 bg-gray-100 text-gray-400"
                          }`}
                          whileHover={isClickable ? { scale: 1.15 } : {}}
                          animate={isActive ? {
                            boxShadow: [
                              "0 0 0 0 rgba(210, 110, 61, 0.4)",
                              "0 0 0 10px rgba(210, 110, 61, 0)",
                            ],
                          } : {}}
                          transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
                        >
                          {isCompleted ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring" as const, stiffness: 200 }}
                            >
                              <Check className="h-5 w-5" />
                            </motion.div>
                          ) : (
                            <span>{s.id}</span>
                          )}
                        </motion.div>
                        <motion.span
                          className={`mt-2 text-xs font-medium transition-colors ${
                            isActive
                              ? "text-[#D26E3D] font-semibold"
                              : isCompleted
                              ? "text-emerald-600"
                              : "text-gray-500"
                          }`}
                          animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                          transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
                        >
                          {s.label}
                        </motion.span>
                      </div>
                      {idx < steps.length - 1 && (
                        <motion.div
                          className={`h-0.5 flex-1 transition-colors mx-2 ${
                            isCompleted ? "bg-emerald-500" : "bg-gray-200"
                          }`}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: isCompleted ? 1 : 0 }}
                          transition={{ delay: idx * 0.1 + 0.2, duration: 0.5 }}
                          style={{ originX: 0 }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Card>
                      <CardHeader className="flex-row items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            🥤
                          </motion.div>
                          Choose your base drink
                        </CardTitle>
                        {loadingBase && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <Badge variant="secondary">Loading...</Badge>
                          </motion.div>
                        )}
                      </CardHeader>
                      <CardContent>
                        {loadingAll ? (
                          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <motion.div
                                key={`base-skel-${i}`}
                                className="rounded-2xl border border-border/60 bg-white p-3 shadow-sm"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                              >
                                <Skeleton className="h-28 w-full rounded-xl" />
                                <div className="mt-3 space-y-2">
                                  <Skeleton className="h-4 w-2/3" />
                                  <Skeleton className="h-3 w-full" />
                                  <Skeleton className="h-3 w-1/2" />
                                </div>
                              </motion.div>
                            ))}
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
                            {baseDrinks.map((d, i) => {
                              const active = d.id === selectedBaseId;
                              return (
                                <motion.button
                                  key={d.id}
                                  onClick={() => {
                                    setSelectedBaseId(d.id);
                                    setTimeout(() => setStep(2), 150);
                                  }}
                                  className={`group overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all relative ${
                                    active
                                      ? "border-[#D26E3D] ring-2 ring-[#D26E3D]/30 shadow-lg"
                                      : "hover:border-[#D26E3D]/40 hover:shadow-md"
                                  }`}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: i * 0.05, type: "spring" as const }}
                                  whileHover={{ y: -4, scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  {active && (
                                    <motion.div
                                      className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[#D26E3D] flex items-center justify-center z-10"
                                      initial={{ scale: 0, rotate: -180 }}
                                      animate={{ scale: 1, rotate: 0 }}
                                      transition={{ type: "spring" as const, stiffness: 200 }}
                                    >
                                      <Check className="h-4 w-4 text-white" />
                                    </motion.div>
                                  )}
                                  {d.image_url ? (
                                    <div className="h-32 w-full bg-white flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#FFE7C5] via-white to-[#D7EFEA]">
                                      <motion.img
                                        src={d.image_url}
                                        alt={d.name}
                                        loading="lazy"
                                        className="max-h-full max-w-full object-contain"
                                        whileHover={{ scale: 1.05, rotate: 2 }}
                                        transition={{ duration: 0.3 }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="h-32 w-full bg-gradient-to-br from-[#FFE7C5] to-[#FFF8DE]" />
                                  )}

                                  <div className="p-3 space-y-1">
                                    <div className="font-semibold group-hover:text-[#D26E3D] transition-colors">
                                      {d.name}
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {d.description || "Signature blend"}
                                    </p>
                                    <motion.div
                                      className="text-xs font-medium text-emerald-700"
                                      whileHover={{ scale: 1.05 }}
                                    >
                                      ₱{(d.price_cents / 100).toFixed(2)}
                                    </motion.div>
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                  className="space-y-6"
                >
                  {!selectedBase ? (
                    <motion.div
                      variants={fadeInUp}
                      initial="hidden"
                      animate="visible"
                    >
                      <Alert>
                        <AlertTitle>Select a base drink</AlertTitle>
                        <AlertDescription>
                          Choose a base drink to unlock customization.
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  ) : (
                    <>
                      <motion.div
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        <Card>
                          <CardHeader className="flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <motion.div
                                animate={{ rotate: [0, -10, 10, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                📏
                              </motion.div>
                              Choose size
                            </CardTitle>
                            <Badge variant="secondary">
                              {mlToOzLabel(sizeMl)}
                            </Badge>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {sizeOptions.map((s) => (
                                <Button
                                  key={s.ml}
                                  variant={sizeMl === s.ml ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setSizeMl(s.ml)}
                                >
                                  {s.label}
                                </Button>
                              ))}
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {sizeLinesForSelection.length > 0
                                ? "Uses the saved recipe for this size."
                                : selectedBase?.base_size_ml
                                  ? `Scales from base size ${mlToOzLabel(selectedBase.base_size_ml)}.`
                                  : "Scales from default base size."}
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>

                      <motion.div
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        <Card>
                          <CardHeader className="flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <motion.div
                                animate={{ rotate: [0, 15, -15, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                ⚡
                              </motion.div>
                              Customize add-ons
                            </CardTitle>
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring" as const, stiffness: 200 }}
                            >
                              <Badge variant="glow" className="gap-1">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                                Live macros
                              </Badge>
                            </motion.div>
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
                      </motion.div>

                      <motion.div
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: 0.1 }}
                      >
                        <Card>
                          <CardHeader className="flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                ✨
                              </motion.div>
                              Selected add-ons
                            </CardTitle>
                            {extraLines.length > 0 && (
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setExtraLines([])}
                                >
                                  Clear all
                                </Button>
                              </motion.div>
                            )}
                          </CardHeader>
                          <CardContent>
                            {extraLines.length === 0 ? (
                              <motion.div
                                className="flex flex-col items-center justify-center py-8 text-center"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: "spring" as const }}
                              >
                                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#D26E3D]/10 to-[#597A90]/10 flex items-center justify-center mb-3">
                                  <Plus className="h-8 w-8 text-[#D26E3D]/50" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  No add-ons yet. Browse ingredients above to customize your shake!
                                </p>
                              </motion.div>
                            ) : (
                              <motion.ul
                                className="divide-y divide-muted/60 text-sm"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              >
                                <AnimatePresence>
                                  {extraLines.map((l, i) => {
                                    const php = linePricePHP(l);
                                    return (
                                      <motion.li
                                        key={i}
                                        className="flex items-center justify-between py-2"
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: 20, opacity: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                      >
                                        <div className="min-w-0">
                                          <span className="font-medium">{l.name}</span>{" "}
                                          <span className="text-muted-foreground">
                                            - {l.amount} {l.unit}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                          <motion.span
                                            className="text-emerald-700 font-medium"
                                            key={`price-${i}-${php}`}
                                            initial={{ scale: 1.2, color: "#059669" }}
                                            animate={{ scale: 1, color: "#047857" }}
                                          >
                                            ₱{php.toFixed(2)}
                                          </motion.span>
                                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeAddon(i)}
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </motion.div>
                                        </div>
                                      </motion.li>
                                    );
                                  })}
                                </AnimatePresence>
                              </motion.ul>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                      <motion.div
                        className="flex flex-wrap items-center justify-between gap-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button variant="outline" onClick={goBack}>
                            Back to base
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button onClick={() => setStep(3)} className="gap-2">
                            Review order
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      </motion.div>
                    </>
                  )}
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            🛒
                          </motion.div>
                          Review your order
                        </CardTitle>
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
                            <motion.div
                              className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-[#D26E3D]/5 to-transparent"
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                            >
                              <div className="text-sm font-semibold">
                                {selectedBase.name}
                              </div>
                              <Badge variant="secondary" className="font-semibold">
                                ₱{(base_price_cents / 100).toFixed(2)}
                              </Badge>
                            </motion.div>
                            {extraLines.length > 0 && (
                              <motion.div
                                className="space-y-2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                              >
                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Add-ons
                                </div>
                                <ul className="space-y-1 text-sm">
                                  {extraLines.map((l, i) => (
                                    <motion.li
                                      key={i}
                                      className="flex items-center justify-between"
                                      initial={{ x: -10, opacity: 0 }}
                                      animate={{ x: 0, opacity: 1 }}
                                      transition={{ delay: 0.15 + i * 0.05 }}
                                    >
                                      <span>{l.name}</span>
                                      <span className="text-muted-foreground">
                                        {l.amount} {l.unit}
                                      </span>
                                    </motion.li>
                                  ))}
                                </ul>
                              </motion.div>
                            )}
                            <motion.div
                              className="flex items-center justify-between text-base p-4 rounded-lg bg-gradient-to-r from-[#597A90]/10 to-[#D26E3D]/10 border border-[#D26E3D]/20"
                              initial={{ scale: 0.95, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.2, type: "spring" as const }}
                            >
                              <span className="font-semibold">Total</span>
                              <motion.span
                                className="font-bold text-lg text-[#D26E3D]"
                                key={total_price_cents}
                                initial={{ scale: 1.3 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring" as const, stiffness: 300 }}
                              >
                                ₱{(total_price_cents / 100).toFixed(2)}
                              </motion.span>
                            </motion.div>
                            <motion.div
                              className="flex flex-wrap gap-2"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                            >
                              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Button onClick={addToCart} disabled={added} className="gap-2">
                                  <ShoppingCart className="h-4 w-4" />
                                  {added ? "Added to cart" : "Add to Cart"}
                                </Button>
                              </motion.div>
                              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Button variant="secondary" onClick={proceedToCheckout}>
                                  Proceed to Checkout
                                </Button>
                              </motion.div>
                              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Button variant="outline" onClick={goBack}>
                                  Back to customize
                                </Button>
                              </motion.div>
                            </motion.div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Animated Sidebar */}
          <motion.aside
            className="space-y-4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6, type: "spring" as const }}
          >
            <motion.div whileHover={{ y: -2 }} transition={{ type: "spring" as const }}>
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">Order summary</CardTitle>
                  <motion.div
                    key={`summary-price-${total_price_cents}`}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" as const, stiffness: 300 }}
                  >
                    <Badge variant="secondary" className="font-semibold">
                      ₱{(total_price_cents / 100).toFixed(2)}
                    </Badge>
                  </motion.div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <motion.div
                    className="flex items-center justify-between"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <span>Base</span>
                    <span>₱{(base_price_cents / 100).toFixed(2)}</span>
                  </motion.div>
                  <motion.div
                    className="flex items-center justify-between"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    <span>Add-ons</span>
                    <motion.span
                      key={`addons-price-${addons_price_cents}`}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                    >
                      ₱{addons_price_php.toFixed(2)}
                    </motion.span>
                  </motion.div>
                  <motion.div
                    className="flex items-center justify-between text-base font-semibold p-2 rounded-lg bg-gradient-to-r from-[#597A90]/5 to-[#D26E3D]/5"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring" as const }}
                  >
                    <span>Total</span>
                    <motion.span
                      className="text-[#D26E3D]"
                      key={`total-price-${total_price_cents}`}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring" as const, stiffness: 300 }}
                    >
                      ₱{(total_price_cents / 100).toFixed(2)}
                    </motion.span>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStep(3)}
                      className="w-full"
                    >
                      Review order
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ y: -2 }} transition={{ type: "spring" as const }}>
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">Your macros</CardTitle>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" as const }}
                  >
                    <Badge variant="secondary">Live</Badge>
                  </motion.div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <NutritionBar totals={totals} allergens={allergens} />
                  </motion.div>
                  {hasMissingNutrition && (
                    <motion.div
                      className="text-xs text-amber-700"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      Some ingredients are missing nutrition data.
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.aside>
        </div>

        {/* Animated Mobile Bottom Bar */}
        <motion.div
          className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring" as const, stiffness: 300, damping: 30 }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <motion.div
              key={`mobile-total-${total_price_cents}`}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" as const, stiffness: 300 }}
            >
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-base font-semibold">
                ₱{(total_price_cents / 100).toFixed(2)}
              </div>
            </motion.div>
            <div className="flex items-center gap-2">
              {step > 1 && (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" size="sm" onClick={goBack}>
                    Back
                  </Button>
                </motion.div>
              )}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="sm"
                  onClick={goNext}
                  disabled={!hasBase && step < 3}
                >
                  {step === 3 ? "Checkout" : "Next"}
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
