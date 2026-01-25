import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { logAudit } from "@/utils/audit";
import { toast } from "@/hooks/use-toast";
import { Check, X, Image as ImageIcon, Package, Search, Plus, Loader2, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

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

// Image upload zone component
function ImageUploadZone({
  imageUrl,
  drinkName,
  onUpload,
  uploading,
}: {
  imageUrl: string | null | undefined;
  drinkName: string;
  onUpload: (file: File) => void;
  uploading: boolean;
}) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative h-48 w-full rounded-2xl border-2 border-dashed overflow-hidden transition-all duration-200",
          dragActive
            ? "border-[#D26E3D] bg-[#D26E3D]/5"
            : "border-gray-200 hover:border-gray-300",
          imageUrl && "border-0"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={drinkName}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-gray-400">
            <ImageIcon className="h-10 w-10 mb-2" />
            <span className="text-xs">No image</span>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-[#D26E3D]" />
          </div>
        )}

        <label className="absolute bottom-2 right-2 flex cursor-pointer items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-gray-700 shadow-md hover:bg-white transition-colors">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading..." : "Change"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleChange}
            disabled={uploading}
          />
        </label>
      </div>
      <p className="text-[11px] text-gray-500 text-center">
        Drag & drop or click to upload
      </p>
    </div>
  );
}

// Collapsible recipe section
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
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 overflow-hidden">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-100/50 transition-colors"
      >
        <div>
          <div className="text-xs font-semibold text-gray-700">{title}</div>
          {description && (
            <div className="text-[11px] text-gray-500 mt-0.5">{description}</div>
          )}
        </div>
        {isCollapsed ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {!isCollapsed && (
        <div className="p-3 pt-0 border-t border-gray-200/50">
          {lines.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-gray-500 mb-3">{emptyMessage}</p>
              <button
                onClick={onAddLine}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D26E3D] hover:text-[#B85C2E] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add first ingredient
              </button>
            </div>
          ) : (
            <div className="space-y-2 mt-3">
              {lines.map((line, idx) => (
                <div
                  key={`line-${idx}`}
                  className="grid grid-cols-12 gap-2 items-center"
                >
                  <select
                    className="col-span-6 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#D26E3D]/30 focus:border-[#D26E3D]"
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
                  <input
                    className="col-span-3 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#D26E3D]/30 focus:border-[#D26E3D]"
                    type="number"
                    placeholder="Amount"
                    value={line.amount || ""}
                    onChange={(e) =>
                      onUpdateLine(idx, {
                        amount: Number(e.target.value || 0),
                      })
                    }
                  />
                  <select
                    className="col-span-2 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#D26E3D]/30 focus:border-[#D26E3D]"
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
                  <button
                    type="button"
                    onClick={() => onRemoveLine(idx)}
                    className="col-span-1 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove line"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              <button
                onClick={onAddLine}
                className="mt-2 text-xs font-semibold text-[#D26E3D] hover:text-[#B85C2E] transition-colors flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add another ingredient
              </button>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={onSave}
              disabled={saving}
              className={cn(
                "w-full rounded-lg px-3 py-2 text-xs font-semibold transition-all",
                saving
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
              )}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-3 w-3.5 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save recipe"
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
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
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

    setUploadingId(drinkId);
    const ext = file.name.split(".").pop() || "png";
    const path = `${drinkId}.${ext}`;

    const { error } = await supabase.storage.from("drinks").upload(path, file, {
      upsert: true,
      cacheControl: "3600",
    });

    if (error) {
      setUploadingId(null);
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

    setUploadingId(null);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Drinks Admin</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your drink menu and recipes
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30 focus:border-[#D26E3D] transition-all"
            placeholder="Search drinks…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Create new */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D26E3D]/10">
            <Plus className="h-4 w-4 text-[#D26E3D]" />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">Add New Drink</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
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
            label="Base Size (ml)"
            type="number"
            value={newDrink.base_size_ml}
            onChange={(v) =>
              setNewDrink((p) => ({ ...p, base_size_ml: Number(v || 0) }))
            }
            placeholder="350"
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
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <Package className="h-4 w-4 text-gray-600" />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">All Drinks</h2>
          <span className="text-xs text-gray-500">({filtered.length})</span>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((d) => (
              <div
                key={d.id}
                className="flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Image upload */}
                <div className="p-4 pb-2">
                  <ImageUploadZone
                    imageUrl={d.image_url}
                    drinkName={d.name}
                    onUpload={(file) => handleUpload(d.id, file)}
                    uploading={uploadingId === d.id}
                  />
                </div>

                <div className="px-4 pb-4 space-y-3">
                  {/* Status badge */}
                  <div className="flex items-center justify-between">
                    <StatusBadge active={d.is_active} />
                    <SaveSuccess show={saveSuccessId === d.id} />
                  </div>

                  <Field
                    label="Name"
                    value={d.name}
                    onChange={(v) =>
                      setRows((prev) =>
                        prev.map((x) => (x.id === d.id ? { ...x, name: v } : x))
                      )
                    }
                    placeholder="Drink name"
                  />
                  <Field
                    label="Description"
                    value={d.description || ""}
                    onChange={(v) =>
                      setRows((prev) =>
                        prev.map((x) =>
                          x.id === d.id ? { ...x, description: v } : x
                        )
                      )
                    }
                    placeholder="Description (optional)"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Price (₱)"
                      type="number"
                      value={d.price_php ?? 0}
                      onChange={(v) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === d.id
                              ? { ...x, price_php: Number(v || 0) }
                              : x
                          )
                        )
                      }
                    />
                    <Field
                      label="Base Size (ml)"
                      type="number"
                      value={d.base_size_ml ?? 0}
                      onChange={(v) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === d.id
                              ? { ...x, base_size_ml: Number(v || 0) }
                              : x
                          )
                        )
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm rounded-lg border border-gray-200 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={d.is_active}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === d.id
                              ? { ...x, is_active: e.target.checked }
                              : x
                          )
                        )
                      }
                      className="rounded border-gray-300 text-[#D26E3D] focus:ring-[#D26E3D]"
                    />
                    <span className="text-gray-700">Active</span>
                  </label>

                  <div className="pt-1">
                    <button
                      onClick={() => saveDrink(d)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                    >
                      Save details
                    </button>
                  </div>

                  {/* Base Recipe */}
                  <CollapsibleRecipeSection
                    title="Base Recipe"
                    lines={recipeLines[d.id] || []}
                    ingredients={ingredients}
                    ingredientById={ingredientById}
                    onAddLine={() => addRecipeLine(d.id)}
                    onUpdateLine={(idx, patch) => updateRecipeLine(d.id, idx, patch)}
                    onRemoveLine={(idx) => removeRecipeLine(d.id, idx)}
                    onSave={() => saveRecipe(d.id)}
                    saving={recipeSavingId === d.id}
                    emptyMessage="No ingredients in the base recipe yet"
                  />

                  {/* Size Recipes */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-gray-700 px-1">
                      Size-Specific Recipes
                    </div>
                    {(drinkSizesByDrink[d.id] || []).length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center">
                        <p className="text-xs text-gray-500">
                          No sizes configured for this drink
                        </p>
                      </div>
                    ) : (
                      (drinkSizesByDrink[d.id] || []).map((size) => {
                        const sizeLines = sizeRecipeLines[size.id] || [];
                        const label =
                          size.display_name ||
                          size.size_label ||
                          `${size.size_ml} ml`;
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
                      })
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
