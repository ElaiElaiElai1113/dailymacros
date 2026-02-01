import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { logAudit } from "@/utils/audit";
import { toast } from "@/hooks/use-toast";
import { Check, X, Package, Search, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScaleIn } from "@/components/ui/animations";
import { ImageDropzone } from "@/components/ui/ImageDropzone";
import { triggerSuccessConfetti } from "@/components/ui/confetti";

type DrinkRow = {
  id: string;
  name: string;
  description?: string | null;
  base_size_ml?: number | null;
  price_php: number | null;
  is_active: boolean;
  image_url?: string | null;
};

type IngredientRow = {
  id: string;
  name: string;
  unit_default: "g" | "ml" | "scoop" | "piece";
  is_active: boolean;
};

type DrinkSizeRow = {
  id: string;
  drink_id: string;
  size_label: string | null;
  display_name: string | null;
  size_ml: number;
  is_active: boolean;
};

type DrinkLineRow = {
  drink_id: string;
  ingredient_id: string;
  amount: number;
  unit: string;
};

type RecipeLine = {
  ingredient_id: string;
  amount: number;
  unit: string;
};

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  required = false,
}: {
  label: string;
  value: string | number | undefined | null;
  onChange: (v: string) => void;
  type?: "text" | "number";
  placeholder?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-xs font-medium text-gray-600">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
      <input
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all",
          "focus:ring-2 focus:ring-[#D26E3D]/30",
          error
            ? "border-red-300 focus:border-red-500"
            : "border-gray-200 focus:border-[#D26E3D]"
        )}
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  );
}

// Loading skeleton component
function DrinkCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm animate-pulse">
      <div className="h-48 w-full rounded-xl bg-gray-200" />
      <div className="space-y-3 px-1">
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-200" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-10 rounded bg-gray-200" />
          <div className="h-10 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: any;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-xs text-gray-500 mb-4 max-w-xs">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-lg bg-[#D26E3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B85C2E] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Status badge component
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        active
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-gray-100 text-gray-500 border border-gray-200"
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-green-500" : "bg-gray-400")}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// Success animation component
function SaveSuccess({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-1 text-green-600 text-xs font-medium animate-in fade-in slide-in-from-top-1 duration-300">
      <Check className="h-3.5 w-3.5" />
      Saved!
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-[92vw] max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[#D26E3D]" />
            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-2.5 py-2 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-64px)]">{children}</div>
      </div>
    </div>
  );
}

// Collapsible recipe section with modern design
function CollapsibleRecipeSection({
  title,
  description,
  lines,
  ingredients,
  ingredientById,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
  onSave,
  saving,
  emptyMessage,
  defaultCollapsed = false,
}: {
  title: string;
  description?: string;
  lines: RecipeLine[];
  ingredients: IngredientRow[];
  ingredientById: Map<string, IngredientRow>;
  onAddLine: () => void;
  onUpdateLine: (idx: number, patch: Partial<RecipeLine>) => void;
  onRemoveLine: (idx: number) => void;
  onSave: () => void;
  saving: boolean;
  emptyMessage: string;
  defaultCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-white text-left hover:from-gray-100 hover:to-gray-50 transition-all"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D26E3D]/10 text-[#D26E3D]">
            <Package className="h-3.5 w-3.5" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-gray-900">{title}</div>
            {description && (
              <div className="text-xs text-gray-500 mt-0.5">{description}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-white rounded-lg px-2.5 py-1.5 shadow-sm border border-gray-200">
          <span className="text-xs font-medium text-gray-600">{lines.length}</span>
          <span className="text-xs text-gray-400">ingredients</span>
        </div>
      </button>

      {!isCollapsed && (
        <div className="p-4 space-y-3 bg-white">
          {lines.length === 0 ? (
            <div className="py-8 text-center rounded-lg border-2 border-dashed border-gray-200">
              <Package className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">{emptyMessage}</p>
              <button
                onClick={onAddLine}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D26E3D] text-sm font-semibold text-white hover:bg-[#B85C2E] transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Add Ingredient
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {lines.map((line, idx) => (
                <div
                  key={`line-${idx}`}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                >
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      <span className="sm:hidden">Ing.</span>
                      <span className="hidden sm:inline">Ingredient</span>
                    </label>
                    <select
                      className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D26E3D]/20 focus:border-[#D26E3D] transition-all"
                      value={line.ingredient_id}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        const nextIng = ingredientById.get(nextId);
                        onUpdateLine(idx, {
                          ingredient_id: nextId,
                          unit: nextIng?.unit_default || line.unit,
                        });
                      }}
                    >
                      {ingredients.map((ingOpt) => (
                        <option key={ingOpt.id} value={ingOpt.id}>
                          {ingOpt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-2 sm:grid-cols-1 sm:w-28">
                    <label className="col-span-2 sm:col-span-1 block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      <span className="sm:hidden">Amt</span>
                      <span className="hidden sm:inline">Amount</span>
                    </label>
                    <input
                      className="col-span-2 sm:col-span-1 w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D26E3D]/20 focus:border-[#D26E3D] transition-all"
                      type="number"
                      placeholder="0"
                      value={line.amount || ""}
                      onChange={(e) =>
                        onUpdateLine(idx, {
                          amount: Number(e.target.value || 0),
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-2 sm:grid-cols-1 sm:w-24">
                    <label className="col-span-2 sm:col-span-1 block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                      <span className="sm:hidden">Unit</span>
                      <span className="hidden sm:inline">Unit</span>
                    </label>
                    <select
                      className="col-span-2 sm:col-span-1 w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D26E3D]/20 focus:border-[#D26E3D] transition-all"
                      value={line.unit}
                      onChange={(e) =>
                        onUpdateLine(idx, {
                          unit: e.target.value,
                        })
                      }
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="scoop">scoop</option>
                      <option value="piece">piece</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveLine(idx)}
                    className="sm:mt-5 sm:justify-self-end rounded-lg border border-gray-200 px-3 py-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all"
                    title="Remove ingredient"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <button
                onClick={onAddLine}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-600 hover:border-[#D26E3D] hover:text-[#D26E3D] hover:bg-[#D26E3D]/5 transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Another Ingredient
              </button>
            </div>
          )}

          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={onSave}
              disabled={saving}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all",
                saving
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#D26E3D] to-[#B85C2E] text-white hover:from-[#B85C2E] hover:to-[#9A4F2C] shadow-md hover:shadow-lg active:scale-[0.98]"
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Recipe...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Recipe
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DrinksAdminPage() {
  const [rows, setRows] = useState<DrinkRow[]>([]);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [drinkSizes, setDrinkSizes] = useState<DrinkSizeRow[]>([]);
  const [recipeLines, setRecipeLines] = useState<
    Record<string, RecipeLine[]>
  >({});
  const [sizeRecipeLines, setSizeRecipeLines] = useState<
    Record<string, RecipeLine[]>
  >({});
  const [recipeSavingId, setRecipeSavingId] = useState<string | null>(null);
  const [sizeRecipeSavingKey, setSizeRecipeSavingKey] = useState<string | null>(
    null
  );
  const [recipeModalDrinkId, setRecipeModalDrinkId] = useState<string | null>(
    null
  );
  const [editModalDrinkId, setEditModalDrinkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [newDrink, setNewDrink] = useState<Partial<DrinkRow>>({
    name: "",
    description: "",
    base_size_ml: 350,
    price_php: 0,
    is_active: true,
  });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("drinks")
      .select("id,name,description,base_size_ml,price_php,is_active,image_url")
      .order("name", { ascending: true });
    setLoading(false);
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to load drinks",
        description: error.message,
      });
      return;
    }
    setRows((data || []) as DrinkRow[]);
  }

  async function loadIngredients() {
    const { data, error } = await supabase
      .from("ingredients")
      .select("id,name,unit_default,is_active")
      .eq("is_active", true)
      .order("name");
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to load ingredients",
        description: error.message,
      });
      return;
    }
    setIngredients((data || []) as IngredientRow[]);
  }

  async function loadDrinkSizes() {
    const { data, error } = await supabase
      .from("drink_sizes")
      .select("id,drink_id,size_label,display_name,size_ml,is_active")
      .order("size_ml", { ascending: true });
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to load drink sizes",
        description: error.message,
      });
      return;
    }
    setDrinkSizes((data || []) as DrinkSizeRow[]);
  }

  async function loadLines(drinkIds: string[]) {
    if (drinkIds.length === 0) {
      setRecipeLines({});
      return;
    }
    const { data, error } = await supabase
      .from("drink_lines")
      .select("drink_id,ingredient_id,amount,unit")
      .in("drink_id", drinkIds);
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to load recipes",
        description: error.message,
      });
      return;
    }
    const map: Record<string, RecipeLine[]> = {};
    (data || []).forEach((row) => {
      const r = row as DrinkLineRow;
      (map[r.drink_id] ||= []).push({
        ingredient_id: r.ingredient_id,
        amount: r.amount,
        unit: r.unit,
      });
    });
    drinkIds.forEach((id) => {
      if (!map[id]) map[id] = [];
    });
    setRecipeLines(map);
  }

  useEffect(() => {
    load();
    loadIngredients();
    loadDrinkSizes();
  }, []);

  useEffect(() => {
    const ids = rows.map((r) => r.id);
    loadLines(ids);
  }, [rows]);

  useEffect(() => {
    const sizeIds = drinkSizes.map((s) => s.id);
    if (sizeIds.length === 0) {
      setSizeRecipeLines({});
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("drink_size_lines")
        .select("drink_size_id,ingredient_id,amount,unit")
        .in("drink_size_id", sizeIds);
      if (error) {
        toast({
          variant: "destructive",
          title: "Failed to load size recipes",
          description: error.message,
        });
        return;
      }
      const map: Record<string, RecipeLine[]> = {};
      (data || []).forEach((row) => {
        const r = row as {
          drink_size_id: string;
          ingredient_id: string;
          amount: number;
          unit: string;
        };
        (map[r.drink_size_id] ||= []).push({
          ingredient_id: r.ingredient_id,
          amount: r.amount,
          unit: r.unit,
        });
      });
      setSizeRecipeLines(map);
    })();
  }, [drinkSizes]);

  async function createDrink() {
    const errors: Record<string, string> = {};

    if (!newDrink.name?.trim()) {
      errors.name = "Name is required";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({
        variant: "destructive",
        title: "Please fix the errors",
        description: "Some fields are missing or invalid",
      });
      return;
    }

    setFormErrors({});
    setCreating(true);
    const { error } = await supabase.from("drinks").insert({
      name: newDrink.name?.trim(),
      description: newDrink.description || null,
      base_size_ml: Number(newDrink.base_size_ml || 0) || null,
      price_php: Number(newDrink.price_php || 0),
      is_active: !!newDrink.is_active,
    });
    setCreating(false);
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to create drink",
        description: error.message,
      });
      return;
    }
    await logAudit({
      action: "drink.created",
      entity_type: "drink",
      entity_id: null,
      metadata: {
        name: newDrink.name?.trim(),
        base_size_ml: Number(newDrink.base_size_ml || 0) || null,
        price_php: Number(newDrink.price_php || 0),
        is_active: !!newDrink.is_active,
      },
    });
    toast({
      title: "Drink created",
      description: `${newDrink.name} has been added successfully`,
    });
    triggerSuccessConfetti();
    setNewDrink({
      name: "",
      description: "",
      base_size_ml: 350,
      price_php: 0,
      is_active: true,
    });
    load();
  }

  async function saveDrink(d: DrinkRow) {
    const { error } = await supabase
      .from("drinks")
      .update({
        name: d.name,
        description: d.description ?? null,
        base_size_ml: d.base_size_ml ?? null,
        price_php: d.price_php ?? 0,
        is_active: d.is_active,
        image_url: d.image_url ?? null,
      })
      .eq("id", d.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to save drink",
        description: error.message,
      });
      return;
    }
    await logAudit({
      action: "drink.updated",
      entity_type: "drink",
      entity_id: d.id,
      metadata: {
        name: d.name,
        base_size_ml: d.base_size_ml ?? null,
        price_php: d.price_php ?? 0,
        is_active: d.is_active,
        image_url: d.image_url ?? null,
      },
    });

    // Show success animation
    setSaveSuccessId(d.id);
    setTimeout(() => setSaveSuccessId(null), 2000);

    toast({
      title: "Changes saved",
      description: `${d.name} has been updated successfully`,
    });
    triggerSuccessConfetti();
    load();
  }

  async function saveRecipe(drinkId: string) {
    const lines = recipeLines[drinkId] || [];
    const cleaned = lines
      .map((l) => ({
        ingredient_id: l.ingredient_id,
        amount: Number(l.amount || 0),
        unit: l.unit || "g",
      }))
      .filter((l) => l.ingredient_id && l.amount > 0);
    setRecipeSavingId(drinkId);
    const { error: delErr } = await supabase
      .from("drink_lines")
      .delete()
      .eq("drink_id", drinkId);
    if (delErr) {
      setRecipeSavingId(null);
      toast({
        variant: "destructive",
        title: "Failed to save recipe",
        description: delErr.message,
      });
      return;
    }
    if (cleaned.length > 0) {
      const { error: insErr } = await supabase.from("drink_lines").insert(
        cleaned.map((l) => ({
          drink_id: drinkId,
          ingredient_id: l.ingredient_id,
          amount: l.amount,
          unit: l.unit,
        }))
      );
      if (insErr) {
        setRecipeSavingId(null);
        toast({
          variant: "destructive",
          title: "Failed to save recipe",
          description: insErr.message,
        });
        return;
      }
    }
    await logAudit({
      action: "drink.updated",
      entity_type: "drink",
      entity_id: drinkId,
      metadata: { recipe_updated: true, line_count: cleaned.length },
    });
    setRecipeSavingId(null);
    toast({
      title: "Recipe saved",
      description: `${cleaned.length} ingredient${cleaned.length !== 1 ? "s" : ""} saved`,
    });
    loadLines([drinkId]);
  }

  async function saveSizeRecipe(drinkSizeId: string) {
    const key = drinkSizeId;
    const lines = sizeRecipeLines[drinkSizeId] || [];
    const cleaned = lines
      .map((l) => ({
        ingredient_id: l.ingredient_id,
        amount: Number(l.amount || 0),
        unit: l.unit || "g",
      }))
      .filter((l) => l.ingredient_id && l.amount > 0);
    setSizeRecipeSavingKey(key);
    const { error: delErr } = await supabase
      .from("drink_size_lines")
      .delete()
      .eq("drink_size_id", drinkSizeId);
    if (delErr) {
      setSizeRecipeSavingKey(null);
      toast({
        variant: "destructive",
        title: "Failed to save recipe",
        description: delErr.message,
      });
      return;
    }
    if (cleaned.length > 0) {
      const { error: insErr } = await supabase.from("drink_size_lines").insert(
        cleaned.map((l) => ({
          drink_size_id: drinkSizeId,
          ingredient_id: l.ingredient_id,
          amount: l.amount,
          unit: l.unit,
        }))
      );
      if (insErr) {
        setSizeRecipeSavingKey(null);
        toast({
          variant: "destructive",
          title: "Failed to save recipe",
          description: insErr.message,
        });
        return;
      }
    }
    await logAudit({
      action: "drink.updated",
      entity_type: "drink",
      entity_id: drinkSizeId,
      metadata: {
        recipe_updated: true,
        drink_size_id: drinkSizeId,
        line_count: cleaned.length,
      },
    });
    setSizeRecipeSavingKey(null);
    toast({
      title: "Recipe saved",
      description: `${cleaned.length} ingredient${cleaned.length !== 1 ? "s" : ""} saved`,
    });

    // Reload size recipe lines
    const sizeIds = drinkSizes.map((s) => s.id);
    if (sizeIds.length === 0) return;
    const { data, error } = await supabase
      .from("drink_size_lines")
      .select("drink_size_id,ingredient_id,amount,unit")
      .in("drink_size_id", sizeIds);
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to reload recipes",
        description: error.message,
      });
      return;
    }
    const map: Record<string, RecipeLine[]> = {};
    (data || []).forEach((row) => {
      const r = row as {
        drink_size_id: string;
        ingredient_id: string;
        amount: number;
        unit: string;
      };
      (map[r.drink_size_id] ||= []).push({
        ingredient_id: r.ingredient_id,
        amount: r.amount,
        unit: r.unit,
      });
    });
    setSizeRecipeLines(map);
  }

  function updateRecipeLine(
    drinkId: string,
    idx: number,
    patch: Partial<RecipeLine>
  ) {
    setRecipeLines((prev) => {
      const next = { ...prev };
      const lines = [...(next[drinkId] || [])];
      const current = lines[idx];
      if (!current) return prev;
      lines[idx] = { ...current, ...patch };
      next[drinkId] = lines;
      return next;
    });
  }

  function updateSizeRecipeLine(
    drinkSizeId: string,
    idx: number,
    patch: Partial<RecipeLine>
  ) {
    setSizeRecipeLines((prev) => {
      const next = { ...prev };
      const lines = [...(next[drinkSizeId] || [])];
      const current = lines[idx];
      if (!current) return prev;
      lines[idx] = { ...current, ...patch };
      next[drinkSizeId] = lines;
      return next;
    });
  }

  function addRecipeLine(drinkId: string) {
    const fallback = ingredients[0];
    if (!fallback) {
      toast({
        variant: "destructive",
        title: "No ingredients available",
        description: "Please create ingredients first",
      });
      return;
    }
    setRecipeLines((prev) => {
      const next = { ...prev };
      const lines = [...(next[drinkId] || [])];
      lines.push({
        ingredient_id: fallback.id,
        amount: 0,
        unit: fallback.unit_default || "g",
      });
      next[drinkId] = lines;
      return next;
    });
  }

  function addSizeRecipeLine(drinkSizeId: string) {
    const fallback = ingredients[0];
    if (!fallback) {
      toast({
        variant: "destructive",
        title: "No ingredients available",
        description: "Please create ingredients first",
      });
      return;
    }
    setSizeRecipeLines((prev) => {
      const next = { ...prev };
      const lines = [...(next[drinkSizeId] || [])];
      lines.push({
        ingredient_id: fallback.id,
        amount: 0,
        unit: fallback.unit_default || "g",
      });
      next[drinkSizeId] = lines;
      return next;
    });
  }

  function removeRecipeLine(drinkId: string, idx: number) {
    setRecipeLines((prev) => {
      const next = { ...prev };
      const lines = [...(next[drinkId] || [])];
      lines.splice(idx, 1);
      next[drinkId] = lines;
      return next;
    });
  }

  function removeSizeRecipeLine(drinkSizeId: string, idx: number) {
    setSizeRecipeLines((prev) => {
      const next = { ...prev };
      const lines = [...(next[drinkSizeId] || [])];
      lines.splice(idx, 1);
      next[drinkSizeId] = lines;
      return next;
    });
  }

  async function handleUpload(drinkId: string, file: File) {
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image file",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
      });
      return;
    }

    const ext = file.name.split(".").pop() || "png";
    const path = `${drinkId}.${ext}`;

    const { error } = await supabase.storage.from("drinks").upload(path, file, {
      upsert: true,
      cacheControl: "3600",
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
      return;
    }

    const publicUrl = `${
      import.meta.env.VITE_SUPABASE_URL
    }/storage/v1/object/public/drinks/${path}`;

    const { error: updErr } = await supabase
      .from("drinks")
      .update({ image_url: publicUrl })
      .eq("id", drinkId);

    if (updErr) {
      toast({
        variant: "destructive",
        title: "Failed to update drink",
        description: updErr.message,
      });
      return;
    }

    toast({
      title: "Image uploaded",
      description: "Drink image has been updated",
    });
    load();
  }

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );

  const ingredientById = useMemo(() => {
    const map = new Map<string, IngredientRow>();
    ingredients.forEach((i) => map.set(i.id, i));
    return map;
  }, [ingredients]);

  const drinkSizesByDrink = useMemo(() => {
    const map: Record<string, DrinkSizeRow[]> = {};
    drinkSizes.forEach((s) => {
      (map[s.drink_id] ||= []).push(s);
    });
    return map;
  }, [drinkSizes]);

  const activeRecipeDrink = useMemo(
    () => rows.find((r) => r.id === recipeModalDrinkId) || null,
    [rows, recipeModalDrinkId]
  );
  const activeEditDrink = useMemo(
    () => rows.find((r) => r.id === editModalDrinkId) || null,
    [rows, editModalDrinkId]
  );

  const updateDrink = (drinkId: string, patch: Partial<DrinkRow>) => {
    setRows((prev) => prev.map((x) => (x.id === drinkId ? { ...x, ...patch } : x)));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drinks</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Manage your drink menu, recipes, and sizes
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30 focus:border-[#D26E3D] transition-all"
            placeholder="Search drinks…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">Total Drinks</div>
          <div className="mt-1.5 text-2xl font-bold text-gray-900">{rows.length}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="text-[11px] uppercase tracking-wide text-emerald-700 font-medium">Active</div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-700">{rows.filter((r) => r.is_active).length}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">Inactive</div>
          <div className="mt-1.5 text-2xl font-bold text-gray-700">{rows.filter((r) => !r.is_active).length}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <div className="text-[11px] uppercase tracking-wide text-blue-700 font-medium">With Recipes</div>
          <div className="mt-1.5 text-2xl font-bold text-blue-700">{Object.keys(recipeLines).filter((id) => recipeLines[id]?.length > 0).length}</div>
        </div>
      </div>

      {/* Create new */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D26E3D]/10">
            <Plus className="h-4 w-4 text-[#D26E3D]" />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">Add New Drink</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Name"
            value={newDrink.name}
            onChange={(v) => setNewDrink((p) => ({ ...p, name: v }))}
            error={formErrors.name}
            required
            placeholder="e.g., Mango Smoothie"
          />
          <Field
            label="Price (₱)"
            type="number"
            value={newDrink.price_php}
            onChange={(v) =>
              setNewDrink((p) => ({ ...p, price_php: Number(v || 0) }))
            }
            placeholder="0"
          />
          <Field
            label="Base Size (oz)"
            type="number"
            value={Math.round((newDrink.base_size_ml || 0) / 29.5735 * 10) / 10}
            onChange={(v) =>
              setNewDrink((p) => ({ ...p, base_size_ml: Math.round(Number(v || 0) * 29.5735) }))
            }
            placeholder="11.8"
          />
          <Field
            label="Description"
            value={newDrink.description}
            onChange={(v) => setNewDrink((p) => ({ ...p, description: v }))}
            placeholder="(optional)"
            type="text"
          />
          <label className="flex items-center gap-2 text-sm rounded-lg border border-gray-200 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={!!newDrink.is_active}
              onChange={(e) =>
                setNewDrink((p) => ({ ...p, is_active: e.target.checked }))
              }
              className="rounded border-gray-300 text-[#D26E3D] focus:ring-[#D26E3D]"
            />
            <span className="text-gray-700">Active</span>
          </label>
        </div>
        <div className="mt-4">
          <button
            onClick={createDrink}
            disabled={creating}
            className="rounded-lg bg-[#D26E3D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B85C2E] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Drink
              </>
            )}
          </button>
        </div>
      </section>

      {/* List + edit */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <Package className="h-4 w-4 text-gray-600" />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">All Drinks</h2>
          <span className="text-xs text-gray-500">({filtered.length})</span>
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <DrinkCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No drinks found"
            description={
              q
                ? `No drinks match "${q}"`
                : "Get started by creating your first drink"
            }
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3">
            {filtered.map((d, index) => (
              <ScaleIn key={d.id} delay={index * 0.05}>
                <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-[#D26E3D]/20 transition-all duration-200">
                  <div className="relative">
                    <div className="aspect-[4/5] w-full overflow-hidden rounded-t-xl bg-gray-50 flex items-center justify-center">
                      {d.image_url ? (
                        <img
                          src={d.image_url}
                          alt={d.name}
                          className="h-full w-full object-contain p-4"
                          loading="lazy"
                        />
                      ) : (
                        <div className="text-xs text-gray-400">No image</div>
                      )}
                    </div>
                    <div className="absolute top-3 right-3">
                      <StatusBadge active={d.is_active} />
                    </div>
                  </div>

                  {/* Card content */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Drink
                        </div>
                        <div className="text-base font-semibold text-gray-900 truncate">
                          {d.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Price
                        </div>
                        <div className="text-base font-semibold text-gray-900">
                          ₱{d.price_php ?? 0}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        Size: {Math.round((d.base_size_ml ?? 0) / 29.5735 * 10) / 10} oz
                      </span>
                      <span className="truncate max-w-[60%]">
                        {d.description ? d.description : "No description"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditModalDrinkId(d.id)}
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-[#D26E3D] hover:text-[#D26E3D] hover:bg-[#D26E3D]/5 transition-colors"
                    >
                      Edit Details
                    </button>
                  </div>
                </div>
              </ScaleIn>
            ))}
          </div>
        )}
      </section>

      {recipeModalDrinkId && activeRecipeDrink && (
        <Modal
          title={`Recipe • ${activeRecipeDrink.name}`}
          onClose={() => setRecipeModalDrinkId(null)}
        >
          <div className="space-y-4">
            <CollapsibleRecipeSection
              title="Base Recipe"
              lines={recipeLines[activeRecipeDrink.id] || []}
              ingredients={ingredients}
              ingredientById={ingredientById}
              onAddLine={() => addRecipeLine(activeRecipeDrink.id)}
              onUpdateLine={(idx, patch) =>
                updateRecipeLine(activeRecipeDrink.id, idx, patch)
              }
              onRemoveLine={(idx) => removeRecipeLine(activeRecipeDrink.id, idx)}
              onSave={() => saveRecipe(activeRecipeDrink.id)}
              saving={recipeSavingId === activeRecipeDrink.id}
              emptyMessage="No ingredients in the base recipe yet"
            />

            {(drinkSizesByDrink[activeRecipeDrink.id] || []).length > 0 && (
              <div className="space-y-4">
                <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Size-Specific Recipes
                </div>
                {(drinkSizesByDrink[activeRecipeDrink.id] || []).map((size) => {
                  const sizeLines = sizeRecipeLines[size.id] || [];
                  const label =
                    size.display_name ||
                    size.size_label ||
                    `${Math.round(size.size_ml / 29.5735 * 10) / 10} oz`;
                  return (
                    <CollapsibleRecipeSection
                      key={size.id}
                      title={label}
                      description="Custom recipe for this size"
                      lines={sizeLines}
                      ingredients={ingredients}
                      ingredientById={ingredientById}
                      onAddLine={() => addSizeRecipeLine(size.id)}
                      onUpdateLine={(idx, patch) => updateSizeRecipeLine(size.id, idx, patch)}
                      onRemoveLine={(idx) => removeSizeRecipeLine(size.id, idx)}
                      onSave={() => saveSizeRecipe(size.id)}
                      saving={sizeRecipeSavingKey === size.id}
                      emptyMessage="Uses base recipe"
                    />
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}

      {editModalDrinkId && activeEditDrink && (
        <Modal
          title={`Edit Drink • ${activeEditDrink.name}`}
          onClose={() => setEditModalDrinkId(null)}
        >
          <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-4">
              <ImageDropzone
                currentImage={activeEditDrink.image_url}
                onUpload={async (file) => await handleUpload(activeEditDrink.id, file)}
              />

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Drink Name
                </label>
                <input
                  className="w-full text-base font-semibold text-gray-900 border-b-2 border-gray-200 bg-transparent focus:border-[#D26E3D] focus:outline-none focus:ring-0 placeholder:text-gray-400 transition-colors px-0 pb-1"
                  value={activeEditDrink.name}
                  onChange={(e) => updateDrink(activeEditDrink.id, { name: e.target.value })}
                  placeholder="Enter drink name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Description
                </label>
                <textarea
                  className="w-full text-sm text-gray-700 bg-gray-50 border-0 rounded-lg px-3 py-2.5 focus:bg-white focus:ring-2 focus:ring-[#D26E3D]/20 resize-none placeholder:text-gray-400 transition-all"
                  rows={3}
                  value={activeEditDrink.description || ""}
                  onChange={(e) =>
                    updateDrink(activeEditDrink.id, { description: e.target.value })
                  }
                  placeholder="Add a brief description..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Price (₱)
                  </label>
                  <input
                    className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D26E3D]/20 focus:border-[#D26E3D] transition-all placeholder:text-gray-400"
                    type="number"
                    value={activeEditDrink.price_php ?? 0}
                    onChange={(e) =>
                      updateDrink(activeEditDrink.id, {
                        price_php: Number(e.target.value || 0),
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Base Size (oz)
                  </label>
                  <input
                    className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D26E3D]/20 focus:border-[#D26E3D] transition-all placeholder:text-gray-400"
                    type="number"
                    value={Math.round((activeEditDrink.base_size_ml ?? 0) / 29.5735 * 10) / 10}
                    onChange={(e) =>
                      updateDrink(activeEditDrink.id, {
                        base_size_ml: Math.round(Number(e.target.value || 0) * 29.5735),
                      })
                    }
                    placeholder="11.8"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-sm font-medium text-gray-700 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={activeEditDrink.is_active}
                    onChange={(e) =>
                      updateDrink(activeEditDrink.id, { is_active: e.target.checked })
                    }
                    className="peer h-4 w-4 rounded border-gray-300 text-[#D26E3D] focus:ring-2 focus:ring-[#D26E3D] focus:ring-offset-0 transition-all"
                  />
                  <div className="absolute inset-0 rounded-md ring-2 ring-transparent group-hover:ring-[#D26E3D]/20 transition-all peer-checked:bg-[#D26E3D] peer-checked:border-[#D26E3D]"></div>
                </div>
                <span className="group-hover:text-[#D26E3D] transition-colors">Active</span>
              </label>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => saveDrink(activeEditDrink)}
                  className="rounded-lg bg-gradient-to-r from-[#D26E3D] to-[#B85C2E] px-5 py-2.5 text-sm font-semibold text-white hover:from-[#B85C2E] hover:to-[#9A4F2C] transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  Save Changes
                </button>
                <SaveSuccess show={saveSuccessId === activeEditDrink.id} />
              </div>

              <button
                type="button"
                onClick={() => setRecipeModalDrinkId(activeEditDrink.id)}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:border-[#D26E3D] hover:text-[#D26E3D] hover:bg-[#D26E3D]/5 transition-colors"
              >
                Edit Recipe
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
