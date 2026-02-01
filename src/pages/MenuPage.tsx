import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import type { Ingredient, IngredientNutrition, LineIngredient } from "@/types";
import DrinkDetailDrawer from "@/components/DrinkDetailDrawer";
import DrinkCard, { type DrinkRecord } from "@/components/DrinkCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X } from "lucide-react";

type DrinkLineRow = {
  id: string;
  drink_id: string;
  ingredient_id: string;
  amount: number;
  unit: string;
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

export default function MenuPage() {
  const [drinks, setDrinks] = useState<DrinkRecord[]>([]);
  const [lines, setLines] = useState<DrinkLineRow[]>([]);
  const [drinkSizes, setDrinkSizes] = useState<DrinkSizeRow[]>([]);
  const [sizeLines, setSizeLines] = useState<DrinkSizeLineRow[]>([]);
  const [ingDict, setIngDict] = useState<Record<string, Ingredient>>({});
  const [nutrDict, setNutrDict] = useState<Record<string, IngredientNutrition>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [uiErrors, setUiErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const { addItem } = useCart();
  const navigate = useNavigate();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<DrinkRecord | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data: dd, error: de } = await supabase
          .from("drinks")
          .select(
            "id,name,description,base_size_ml,price_php,is_active,image_url"
          )
          .eq("is_active", true)
          .order("name", { ascending: true });
        if (de) throw de;

        const drinkRows = (dd || []) as Array<{
          id: string;
          name: string;
          description: string | null;
          base_size_ml: number | null;
          price_php: number | null;
          is_active: boolean;
          image_url?: string | null;
        }>;

        const normalized = drinkRows.map((d) => ({
          ...d,
          price_cents: Math.round((d.price_php ?? 0) * 100),
        }));

        const drinkIds = normalized.map((d) => d.id);

        const { data: ll, error: le } = await supabase
          .from("drink_lines")
          .select("drink_id,ingredient_id,amount,unit,drinks!inner(id)")
          .in(
            "drink_id",
            drinkIds.length
              ? drinkIds
              : ["00000000-0000-0000-0000-000000000000"]
          );
        if (le) throw le;

        const { data: ds, error: dse } = await supabase
          .from("drink_sizes")
          .select("id,drink_id,size_label,display_name,size_ml,is_active")
          .in(
            "drink_id",
            drinkIds.length
              ? drinkIds
              : ["00000000-0000-0000-0000-000000000000"]
          );
        if (dse) throw dse;

        const drinkSizeIds = (ds || []).map((s) => s.id);
        const { data: sl, error: se } = await supabase
          .from("drink_size_lines")
          .select("drink_size_id,ingredient_id,amount,unit")
          .in(
            "drink_size_id",
            drinkSizeIds.length
              ? drinkSizeIds
              : ["00000000-0000-0000-0000-000000000000"]
          );
        if (se) throw se;

        const [{ data: ii, error: ie }, { data: nn, error: ne }] =
          await Promise.all([
            supabase.from("ingredients").select("*"),
            supabase.from("ingredient_nutrition_v100").select("*"),
          ]);
        if (ie) throw ie;
        if (ne) throw ne;

        setDrinks(normalized as any);
        setLines((ll || []) as any);
        setDrinkSizes((ds || []) as any);
        setSizeLines((sl || []) as any);
        setIngDict(
          Object.fromEntries(((ii || []) as Ingredient[]).map((x) => [x.id, x]))
        );
        setNutrDict(
          Object.fromEntries(
            ((nn || []) as IngredientNutrition[]).map((x) => [
              x.ingredient_id,
              x,
            ])
          )
        );
      } catch (e: any) {
        setErr(e.message || "Failed to load menu");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const drinkLinesMap = useMemo(() => {
    const map: Record<string, LineIngredient[]> = {};
    for (const r of lines) {
      (map[r.drink_id] ||= []).push({
        ingredient_id: r.ingredient_id,
        amount: Number(r.amount),
        unit: r.unit,
      });
    }
    return map;
  }, [lines]);

  const drinkSizeLinesMap = useMemo(() => {
    const map: Record<string, Record<string, LineIngredient[]>> = {};
    const sizeById = new Map(
      drinkSizes.map((s) => [s.id, s] as const)
    );
    for (const r of sizeLines) {
      const size = sizeById.get(r.drink_size_id);
      if (!size) continue;
      const sizeKey = String(size.size_ml);
      if (!map[size.drink_id]) map[size.drink_id] = {};
      (map[size.drink_id][sizeKey] ||= []).push({
        ingredient_id: r.ingredient_id,
        amount: Number(r.amount),
        unit: r.unit,
      });
    }
    return map;
  }, [sizeLines, drinkSizes]);

  // Filter and search logic
  const filteredDrinks = useMemo(() => {
    return drinks.filter((drink) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        drink.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (drink.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      // Category filter (using price ranges as categories for now)
      let matchesCategory = true;
      if (activeCategory === "budget") {
        matchesCategory = drink.price_cents < 15000;
      } else if (activeCategory === "premium") {
        matchesCategory = drink.price_cents >= 15000;
      }

      return matchesSearch && matchesCategory;
    });
  }, [drinks, searchQuery, activeCategory]);

  const categories = [
    { id: "all", label: "All Drinks" },
    { id: "budget", label: "Under ₱150" },
    { id: "premium", label: "₱150+" },
  ];

  function handleAddToCart(drink: DrinkRecord) {
    const drinkLines = drinkLinesMap[drink.id] || [];
    if (drinkLines.length === 0) {
      setSuccessMsg(null);
      setUiErrors([
        `"${drink.name}" does not have a recipe configured yet. Please choose another drink or contact the staff.`,
      ]);
      return;
    }
    addItem({
      item_name: drink.name,
      drink_id: drink.id,
      unit_price_cents: drink.price_cents,
      image_url: drink.image_url ?? null,
      lines: drinkLines,
    });
    setUiErrors([]);
    setSuccessMsg(`${drink.name} added to cart.`);
  }

  function openDrawer(drink: DrinkRecord) {
    setSelected(drink);
    setDrawerOpen(true);
    setUiErrors([]);
    setSuccessMsg(null);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(210,110,61,0.15),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(89,145,144,0.12),_transparent_50%)]">
      <div className="mx-auto max-w-7xl px-4 pt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge variant="secondary">DailyMacros Menu</Badge>
            <h1 className="mt-3 text-3xl font-semibold">
              Protein shakes with macros you can trust.
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Tap a drink for nutrition details, or add it to your cart in one
              click.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/order">Start Order</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/cart">View Cart</Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search drinks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? "bg-[#D26E3D] text-white shadow-md"
                    : "bg-white border border-border/60 text-muted-foreground hover:border-[#D26E3D]/40 hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {err && (
            <Alert variant="destructive">
              <AlertTitle>We could not load the menu</AlertTitle>
              <AlertDescription>{err}</AlertDescription>
            </Alert>
          )}

          {uiErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>Please check the following</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-0.5 pl-4">
                  {uiErrors.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {successMsg && (
            <Alert>
              <AlertTitle>Added to cart</AlertTitle>
              <AlertDescription>{successMsg}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`menu-skel-${i}`}
                className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm"
              >
                <Skeleton className="h-36 w-full rounded-2xl" />
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="mt-4 flex gap-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : !err && drinks.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No active drinks yet. Please check back later.
          </div>
        ) : (
          !err && (
            <>
              {filteredDrinks.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground mb-2">No drinks found matching "{searchQuery}"</p>
                  <Button variant="outline" onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}>
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredDrinks.map((d) => (
                    <DrinkCard
                      key={d.id}
                      drink={d}
                      lines={drinkLinesMap[d.id] || []}
                      ingDict={ingDict}
                      nutrDict={nutrDict}
                      onAdd={() => handleAddToCart(d)}
                      onOpen={() => openDrawer(d)}
                    />
                  ))}
                </div>
              )}
            </>
          )
        )}
      </div>

      <DrinkDetailDrawer
        open={drawerOpen && !!selected}
        onClose={() => setDrawerOpen(false)}
        drink={selected}
        lines={selected ? drinkLinesMap[selected.id] || [] : []}
        sizeLines={selected ? drinkSizeLinesMap[selected.id] : undefined}
        ingDict={ingDict}
        nutrDict={nutrDict}
        onAddToCart={(scaledLines) => {
          if (!selected) return;
          const fallbackLines = drinkLinesMap[selected.id] || [];
          const linesToUse =
            scaledLines && scaledLines.length ? scaledLines : fallbackLines;
          if (!linesToUse.length) {
            setSuccessMsg(null);
            setUiErrors([
              `"${selected.name}" does not have a recipe configured yet. Please choose another drink or contact the staff.`,
            ]);
            return;
          }
          addItem({
            item_name: selected.name,
            drink_id: selected.id,
            unit_price_cents: selected.price_cents,
            image_url: selected.image_url ?? null,
            lines: linesToUse,
          });
          setUiErrors([]);
          setSuccessMsg(`${selected.name} added to cart.`);
          setDrawerOpen(false);
        }}
        onCustomize={() => {
          if (!selected) return;
          setDrawerOpen(false);
          navigate(`/order?base=${selected.id}`);
        }}
      />
    </div>
  );
}
