import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Ingredient } from "@/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

type Props = {
  onAdd: (ing: Ingredient, amount: number, unit: string) => void;
  getPricePHP?: (
    ing: Ingredient,
    amount: number,
    unit: string
  ) => number | null | undefined;
  selectedIngredientIds?: string[];
};

const HIGHLIGHT_CLASSES = [
  "ring-2 ring-primary/60 bg-primary/10",
  "ring-2 ring-[#EECB65]/70 bg-[#FFF6DD]",
  "ring-2 ring-[#5E9CA2]/70 bg-[#EAF7F6]",
];

export default function IngredientSelector({
  onAdd,
  getPricePHP,
  selectedIngredientIds = [],
}: Props) {
  const [ings, setIngs] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState<number>(1);
  const [unit, setUnit] = useState<string>("tablespoon");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data, error } = await supabase
          .from("ingredients")
          .select("*")
          .eq("is_active", true)
          .eq("is_addon", true)
          .order("name");
        if (error) throw error;
        setIngs((data || []) as Ingredient[]);
      } catch (e: any) {
        setErr(e.message || "Failed to load add-ons");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ings;
    return ings.filter((i) => i.name.toLowerCase().includes(q));
  }, [ings, search]);

  function onChangeAmount(v: string) {
    const n = Number(v);
    if (!Number.isFinite(n)) {
      setAmount(0);
      return;
    }
    setAmount(Math.max(0, n));
  }

  return (
    <div>
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-12">
        <div className="relative sm:col-span-7">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search add-ons (chia, honey, cocoa)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Input
          type="number"
          min={0}
          step="any"
          className="sm:col-span-2"
          value={amount}
          onChange={(e) => onChangeAmount(e.target.value)}
        />
        <select
          className="sm:col-span-3 flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        >
          <option value="tablespoon">tablespoon</option>
          <option value="scoop">scoop</option>
          <option value="g">g</option>
          <option value="ml">ml</option>
          <option value="piece">piece</option>
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading add-ons...</div>
      ) : err ? (
        <div className="text-sm text-destructive">Error: {err}</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No add-ons match your search.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map((ing, idx) => {
            const pricePHP =
              typeof getPricePHP === "function"
                ? getPricePHP(ing, amount, unit)
                : undefined;

            const disabled = !amount || amount <= 0;
            const isSelected = selectedIngredientIds.includes(ing.id);
            const highlightClass =
              HIGHLIGHT_CLASSES[idx % HIGHLIGHT_CLASSES.length];

            const baseClasses =
              "relative rounded-2xl border bg-white p-3 text-left transition";

            const stateClasses = disabled
              ? "opacity-60 cursor-not-allowed"
              : isSelected
              ? highlightClass
              : "hover:shadow-sm hover:border-primary/40";

            return (
              <button
                key={ing.id}
                onClick={() => !disabled && onAdd(ing, amount, unit)}
                disabled={disabled}
                className={`${baseClasses} ${stateClasses}`}
                title={
                  pricePHP !== undefined && pricePHP !== null
                    ? `PHP ${pricePHP.toFixed(2)}`
                    : undefined
                }
              >
                {isSelected && (
                  <Badge className="absolute right-2 top-2 text-[10px]">
                    Added
                  </Badge>
                )}

                <div className="truncate font-semibold">{ing.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {ing.category}
                </div>

                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-foreground">
                    {amount || 0} {unit}
                  </span>
                  {pricePHP !== undefined && pricePHP !== null ? (
                    <span className="font-semibold text-emerald-700">
                      PHP {pricePHP.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      no price
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
