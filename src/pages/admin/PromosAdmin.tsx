/**
 * Daily Macros Promos Admin Page
 *
 * Admin interface for creating and managing promotional codes and bundles.
 * Follows the DrinksAdmin pattern for consistency.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { logAudit } from "@/utils/audit";
import { toast } from "@/hooks/use-toast";
import {
  Check,
  X,
  Tag,
  Search,
  Plus,
  Loader2,
  Calendar,
  Percent,
  Package,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScaleIn } from "@/components/ui/animations";
import { ImageDropzone } from "@/components/ui/ImageDropzone";
import { triggerSuccessConfetti } from "@/components/ui/confetti";
import type { PromoType } from "@/types";
import { formatCents } from "@/utils/format";

// ============================================================
// TYPES
// ============================================================

type PromoRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  promo_type: PromoType;
  discount_percentage?: number | null;
  discount_cents?: number | null;
  bundle_price_cents?: number | null;
  is_active: boolean;
  valid_from: string;
  valid_until?: string | null;
  image_url?: string | null;
  usage_count?: number;
};

type PromoDraft = {
  code?: string | null;
  name?: string | null;
  description?: string | null;
  promo_type?: PromoType;
  discount_percentage?: number | null;
  discount_cents?: number | null;
  bundle_price_cents?: number | null;
  is_active?: boolean;
  valid_from?: string | null;
  valid_until?: string | null;
};

function formatPromoError(msg: string) {
  const bundleSize = msg.match(/requires\s+(\d+)x\s+(\d+)oz/i);
  if (bundleSize) {
    const count = Number(bundleSize[1]);
    const size = bundleSize[2];
    return `Add ${count}x ${size} oz drink${count > 1 ? "s" : ""} to use this bundle.`;
  }
  const countOnly = msg.match(/requires\s+(\d+)\s+item/i);
  if (countOnly) {
    const count = Number(countOnly[1]);
    return `Add ${count} item${count > 1 ? "s" : ""} to use this promo.`;
  }
  return msg;
}

// ============================================================
// FIELD COMPONENT
// ============================================================

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string | number | undefined | null;
  onChange: (v: string) => void;
  type?: "text" | "number" | "date";
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
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
            : "border-gray-200 focus:border-[#D26E3D]",
          disabled && "bg-gray-50 cursor-not-allowed"
        )}
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  );
}

// ============================================================
// SELECT COMPONENT
// ============================================================

function Select({
  label,
  value,
  onChange,
  options,
  error,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-xs font-medium text-gray-600">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
      <select
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all",
          "focus:ring-2 focus:ring-[#D26E3D]/30 bg-white",
          error
            ? "border-red-300 focus:border-red-500"
            : "border-gray-200 focus:border-[#D26E3D]"
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </label>
  );
}

// ============================================================
// STATUS BADGE
// ============================================================

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
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-green-500" : "bg-gray-400"
        )}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ============================================================
// PROMO TYPE BADGE
// ============================================================

function PromoTypeBadge({ type }: { type: PromoType }) {
  const config = {
    bundle: { label: "Bundle", icon: Package, color: "bg-blue-50 text-blue-700 border-blue-200" },
    percentage: { label: "Percent", icon: Percent, color: "bg-purple-50 text-purple-700 border-purple-200" },
    fixed_amount: { label: "Fixed", icon: Tag, color: "bg-orange-50 text-orange-700 border-orange-200" },
    free_addon: { label: "Free Add-on", icon: Gift, color: "bg-pink-50 text-pink-700 border-pink-200" },
    buy_x_get_y: { label: "BOGO", icon: Tag, color: "bg-teal-50 text-teal-700 border-teal-200" },
  };

  const { label, icon: Icon, color } = config[type];

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border", color)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

// ============================================================
// MODAL COMPONENT
// ============================================================

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
            <Tag className="h-4 w-4 text-[#D26E3D]" />
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

// ============================================================
// MAIN ADMIN PAGE
// ============================================================

export default function PromosAdminPage() {
  const [rows, setRows] = useState<PromoRow[]>([]);
  const [editModalId, setEditModalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [newPromo, setNewPromo] = useState<Partial<PromoRow>>({
    code: "",
    name: "",
    description: "",
    promo_type: "percentage",
    discount_percentage: null,
    discount_cents: null,
    bundle_price_cents: null,
    is_active: true,
    valid_from: new Date().toISOString().split("T")[0],
    valid_until: null,
  });
  const [testCode, setTestCode] = useState("");
  const [testSubtotal, setTestSubtotal] = useState("0");
  const [testCount12, setTestCount12] = useState("0");
  const [testCount16, setTestCount16] = useState("0");
  const [testDrinkId, setTestDrinkId] = useState("");
  const [testVariantId, setTestVariantId] = useState("");
  const [testAddonId, setTestAddonId] = useState("");
  const [testCustomerId, setTestCustomerId] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  // ============================================================
  // DATA LOADING
  // ============================================================

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("promos")
      .select(`
        id, code, name, description, promo_type,
        discount_percentage, discount_cents, bundle_price_cents,
        is_active, valid_from, valid_until, image_url
      `)
      .order("created_at", { ascending: false });
    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to load promos",
        description: error.message,
      });
      return;
    }

    // Load usage counts
    const promoIds = (data || []).map((p) => p.id);
    const { data: usageData } = await supabase
      .from("promo_usage")
      .select("promo_id")
      .in("promo_id", promoIds);

    const usageCount: Record<string, number> = {};
    usageData?.forEach((u) => {
      usageCount[u.promo_id] = (usageCount[u.promo_id] || 0) + 1;
    });

    setRows(
      (data || []).map((p) => ({
        ...p,
        usage_count: usageCount[p.id] || 0,
      })) as PromoRow[]
    );
  }

  useEffect(() => {
    load();
  }, []);

  const validatePromoDraft = (draft: PromoDraft) => {
    const errors: Record<string, string> = {};
    const code = (draft.code || "").trim();
    const name = (draft.name || "").trim();
    const promoType = draft.promo_type || "percentage";

    if (!code) {
      errors.code = "Code is required";
    } else if (/\s/.test(code)) {
      errors.code = "Code must not contain spaces";
    }
    if (!name) {
      errors.name = "Name is required";
    }

    const validFrom = draft.valid_from ? Date.parse(draft.valid_from) : NaN;
    if (Number.isNaN(validFrom)) {
      errors.valid_from = "Valid from date is required";
    }
    if (draft.valid_until) {
      const validUntil = Date.parse(draft.valid_until);
      if (Number.isNaN(validUntil)) {
        errors.valid_until = "Valid until date is invalid";
      } else if (!Number.isNaN(validFrom) && validUntil < validFrom) {
        errors.valid_until = "Valid until must be after valid from";
      }
    }

    if (promoType === "percentage") {
      const pct = Number(draft.discount_percentage || 0);
      if (!pct || pct <= 0 || pct > 100) {
        errors.discount_percentage = "Enter a valid percentage (1-100)";
      }
    } else if (promoType === "fixed_amount") {
      const amt = Number(draft.discount_cents || 0);
      if (!amt || amt <= 0) {
        errors.discount_cents = "Enter a valid amount";
      }
    } else if (promoType === "bundle") {
      const amt = Number(draft.bundle_price_cents || 0);
      if (!amt || amt <= 0) {
        errors.bundle_price_cents = "Enter a valid bundle price";
      }
    }

    return { errors };
  };

  const buildPromoPayload = (draft: PromoDraft) => {
    const code = (draft.code || "").trim().toUpperCase();
    const name = (draft.name || "").trim();
    const promoType = draft.promo_type || "percentage";

    const payload: any = {
      code,
      name,
      description: draft.description || null,
      promo_type: promoType,
      is_active: !!draft.is_active,
      valid_from: draft.valid_from ? new Date(draft.valid_from).toISOString() : new Date().toISOString(),
      valid_until: draft.valid_until ? new Date(draft.valid_until).toISOString() : null,
      discount_percentage: null,
      discount_cents: null,
      bundle_price_cents: null,
    };

    if (promoType === "percentage") {
      payload.discount_percentage = Number(draft.discount_percentage || 0);
    } else if (promoType === "fixed_amount") {
      payload.discount_cents = Math.round(Number(draft.discount_cents || 0) * 100);
    } else if (promoType === "bundle") {
      payload.bundle_price_cents = Math.round(Number(draft.bundle_price_cents || 0) * 100);
    }

    return payload;
  };

  // ============================================================
  // CREATE PROMO
  // ============================================================

  async function createPromo() {
    const { errors } = validatePromoDraft(newPromo);
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

    const promoData = buildPromoPayload(newPromo);

    const { error } = await supabase.from("promos").insert(promoData);
    setCreating(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to create promo",
        description: error.message,
      });
      return;
    }

    await logAudit({
      action: "promo.created",
      entity_type: "promo",
      entity_id: null,
      metadata: {
        code: promoData.code,
        name: promoData.name,
        promo_type: promoData.promo_type,
      },
    });

    toast({
      title: "Promo created",
      description: `${newPromo.name} has been added successfully`,
    });
    triggerSuccessConfetti();

    // Reset form
    setNewPromo({
      code: "",
      name: "",
      description: "",
      promo_type: "percentage",
      discount_percentage: null,
      discount_cents: null,
      bundle_price_cents: null,
      is_active: true,
      valid_from: new Date().toISOString().split("T")[0],
      valid_until: null,
    });
    load();
  }

  // ============================================================
  // SAVE PROMO
  // ============================================================

  async function savePromo(p: PromoRow) {
    const { errors } = validatePromoDraft({
      code: p.code,
      name: p.name,
      description: p.description,
      promo_type: p.promo_type,
      discount_percentage: p.discount_percentage,
      discount_cents: p.discount_cents ? p.discount_cents / 100 : null,
      bundle_price_cents: p.bundle_price_cents ? p.bundle_price_cents / 100 : null,
      is_active: p.is_active,
      valid_from: p.valid_from,
      valid_until: p.valid_until,
    });
    if (Object.keys(errors).length > 0) {
      toast({
        variant: "destructive",
        title: "Please fix the errors",
        description: Object.values(errors).join(" • "),
      });
      return;
    }

    const payload = buildPromoPayload({
      code: p.code,
      name: p.name,
      description: p.description,
      promo_type: p.promo_type,
      discount_percentage: p.discount_percentage,
      discount_cents: p.discount_cents ? p.discount_cents / 100 : null,
      bundle_price_cents: p.bundle_price_cents ? p.bundle_price_cents / 100 : null,
      is_active: p.is_active,
      valid_from: p.valid_from,
      valid_until: p.valid_until,
    });

    const { error } = await supabase
      .from("promos")
      .update({
        ...payload,
        image_url: p.image_url ?? null,
      })
      .eq("id", p.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to save promo",
        description: error.message,
      });
      return;
    }

    await logAudit({
      action: "promo.updated",
      entity_type: "promo",
      entity_id: p.id,
      metadata: {
        code: p.code,
        name: p.name,
        promo_type: p.promo_type,
        is_active: p.is_active,
      },
    });

    setSaveSuccessId(p.id);
    setTimeout(() => setSaveSuccessId(null), 2000);

    toast({
      title: "Changes saved",
      description: `${p.name} has been updated successfully`,
    });
    triggerSuccessConfetti();
    load();
  }

  // ============================================================
  // HELPERS
  // ============================================================

  const filtered = useMemo(
    () => rows.filter((r) =>
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.code.toLowerCase().includes(q.toLowerCase())
    ),
    [rows, q]
  );

  const activeEditPromo = useMemo(
    () => rows.find((r) => r.id === editModalId) || null,
    [rows, editModalId]
  );

  const updatePromo = (promoId: string, patch: Partial<PromoRow>) => {
    setRows((prev) => prev.map((x) => (x.id === promoId ? { ...x, ...patch } : x)));
  };

  const buildTestCart = () => {
    const items: any[] = [];
    const count12 = Math.max(0, Number(testCount12 || 0));
    const count16 = Math.max(0, Number(testCount16 || 0));
    const drinkId = testDrinkId.trim();

    for (let i = 0; i < count12; i += 1) {
      const item: any = { size_ml: 355, item_name: "Test 12oz" };
      if (drinkId) item.drink_id = drinkId;
      items.push(item);
    }
    for (let i = 0; i < count16; i += 1) {
      const item: any = { size_ml: 473, item_name: "Test 16oz" };
      if (drinkId) item.drink_id = drinkId;
      items.push(item);
    }
    return items;
  };

  const runPromoTest = async () => {
    const code = testCode.trim();
    if (!code) {
      toast({
        variant: "destructive",
        title: "Promo code required",
        description: "Enter a promo code to test.",
      });
      return;
    }

    const subtotalValue = Number(testSubtotal || 0);
    if (Number.isNaN(subtotalValue) || subtotalValue < 0) {
      toast({
        variant: "destructive",
        title: "Invalid subtotal",
        description: "Enter a valid subtotal amount.",
      });
      return;
    }

    setTestLoading(true);
    const { data, error } = await supabase.rpc("validate_apply_promo", {
      p_code: code,
      p_subtotal_cents: Math.round(subtotalValue * 100),
      p_cart_items: buildTestCart(),
      p_selected_variant_id: testVariantId.trim() || null,
      p_selected_addon_id: testAddonId.trim() || null,
      p_customer_identifier: testCustomerId.trim() || null,
    });
    setTestLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Promo test failed",
        description: error.message,
      });
      return;
    }

    setTestResult(data);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Manage promo codes, bundles, and discounts
          </p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-3">
          <Link
            to="/ops/audit"
            className="text-xs font-semibold text-[#D26E3D] border border-[#D26E3D]/30 rounded-lg px-3 py-2 hover:bg-[#D26E3D]/10 transition-colors"
          >
            View audit log
          </Link>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30 focus:border-[#D26E3D] transition-all"
              placeholder="Search promos…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">Total Promos</div>
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
          <div className="text-[11px] uppercase tracking-wide text-blue-700 font-medium">Total Uses</div>
          <div className="mt-1.5 text-2xl font-bold text-blue-700">
            {rows.reduce((sum, r) => sum + (r.usage_count || 0), 0)}
          </div>
        </div>
      </div>

      {/* Create new */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D26E3D]/10">
            <Plus className="h-4 w-4 text-[#D26E3D]" />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">Add New Promo</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Promo Code"
            value={newPromo.code}
            onChange={(v) => setNewPromo((p) => ({ ...p, code: v }))}
            error={formErrors.code}
            required
            placeholder="e.g., GYMSTUDY"
          />
          <Field
            label="Promo Name"
            value={newPromo.name}
            onChange={(v) => setNewPromo((p) => ({ ...p, name: v }))}
            error={formErrors.name}
            required
            placeholder="e.g., Gym/Study Buddy"
          />
          <Select
            label="Promo Type"
            value={newPromo.promo_type || "percentage"}
            onChange={(v) =>
              setNewPromo((p) => ({
                ...p,
                promo_type: v as PromoType,
                discount_percentage: null,
                discount_cents: null,
                bundle_price_cents: null,
              }))
            }
            options={[
              { value: "percentage", label: "Percentage Discount" },
              { value: "fixed_amount", label: "Fixed Amount Discount" },
              { value: "bundle", label: "Bundle Price" },
              { value: "free_addon", label: "Free Add-on" },
            ]}
            required
          />
          {newPromo.promo_type === "percentage" && (
            <Field
              label="Discount Percentage"
              type="number"
              value={newPromo.discount_percentage}
              onChange={(v) =>
                setNewPromo((p) => ({ ...p, discount_percentage: Number(v || 0) }))
              }
              error={formErrors.discount_percentage}
              placeholder="e.g., 15"
            />
          )}
          {newPromo.promo_type === "fixed_amount" && (
            <Field
              label="Discount Amount (₱)"
              type="number"
              value={newPromo.discount_cents ? newPromo.discount_cents / 100 : ""}
              onChange={(v) =>
                setNewPromo((p) => ({ ...p, discount_cents: Number(v || 0) }))
              }
              error={formErrors.discount_cents}
              placeholder="e.g., 50"
            />
          )}
          {newPromo.promo_type === "bundle" && (
            <Field
              label="Bundle Price (₱)"
              type="number"
              value={newPromo.bundle_price_cents ? newPromo.bundle_price_cents / 100 : ""}
              onChange={(v) =>
                setNewPromo((p) => ({ ...p, bundle_price_cents: Number(v || 0) }))
              }
              error={formErrors.bundle_price_cents}
              placeholder="e.g., 410"
            />
          )}
          <Field
            label="Valid From"
            type="date"
            value={newPromo.valid_from?.split("T")[0] || ""}
            onChange={(v) => setNewPromo((p) => ({ ...p, valid_from: v }))}
            error={formErrors.valid_from}
          />
          <Field
            label="Valid Until"
            type="date"
            value={newPromo.valid_until?.split("T")[0] || ""}
            onChange={(v) => setNewPromo((p) => ({ ...p, valid_until: v || null }))}
            placeholder="Leave empty for no end date"
            error={formErrors.valid_until}
          />
          <label className="flex items-center gap-2 text-sm rounded-lg border border-gray-200 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors md:col-span-2">
            <input
              type="checkbox"
              checked={!!newPromo.is_active}
              onChange={(e) =>
                setNewPromo((p) => ({ ...p, is_active: e.target.checked }))
              }
              className="rounded border-gray-300 text-[#D26E3D] focus:ring-[#D26E3D]"
            />
            <span className="text-gray-700">Active</span>
          </label>
        </div>
        <div className="mt-4">
          <button
            onClick={createPromo}
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
                Create Promo
              </>
            )}
          </button>
        </div>
      </section>

      {/* Promo test tool */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <Package className="h-4 w-4 text-gray-600" />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">Promo Test Bench</h2>
          <span className="text-xs text-gray-500">Simulate promo validation</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Promo Code"
              value={testCode}
              onChange={setTestCode}
              placeholder="PROMOCODE"
              required
            />
            <Field
              label="Subtotal (₱)"
              value={testSubtotal}
              onChange={setTestSubtotal}
              type="number"
              placeholder="300"
              required
            />
            <Field
              label="12oz Count"
              value={testCount12}
              onChange={setTestCount12}
              type="number"
              placeholder="1"
            />
            <Field
              label="16oz Count"
              value={testCount16}
              onChange={setTestCount16}
              type="number"
              placeholder="1"
            />
            <Field
              label="Drink ID (optional)"
              value={testDrinkId}
              onChange={setTestDrinkId}
              placeholder="UUID"
            />
            <Field
              label="Variant ID (optional)"
              value={testVariantId}
              onChange={setTestVariantId}
              placeholder="UUID"
            />
            <Field
              label="Add-on ID (optional)"
              value={testAddonId}
              onChange={setTestAddonId}
              placeholder="UUID"
            />
            <Field
              label="Customer Identifier (optional)"
              value={testCustomerId}
              onChange={setTestCustomerId}
              placeholder="phone/email"
            />
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={runPromoTest}
              disabled={testLoading}
              className="rounded-lg bg-[#D26E3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B85C2E] disabled:opacity-60"
            >
              {testLoading ? "Testing…" : "Run Test"}
            </button>
            <button
              type="button"
              onClick={() => setTestResult(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50"
            >
              Clear Result
            </button>
          </div>
        </div>

        {testResult && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div
              className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
                testResult.success ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              Result: {testResult.success ? "Eligible" : "Not eligible"}
            </div>
            <div className="grid gap-1 text-sm text-gray-800">
              {testResult.promo?.code && (
                <div>
                  <span className="font-semibold">Promo:</span>{" "}
                  {testResult.promo.code}{" "}
                  {testResult.promo.name ? `? ${testResult.promo.name}` : ""}
                </div>
              )}
              {typeof testResult.discount_cents === "number" && (
                <div>
                  <span className="font-semibold">Discount:</span>{" "}
                  {formatCents(testResult.discount_cents)}
                </div>
              )}
              {typeof testResult.new_subtotal_cents === "number" && (
                <div>
                  <span className="font-semibold">New subtotal:</span>{" "}
                  {formatCents(testResult.new_subtotal_cents)}
                </div>
              )}
            </div>
            {Array.isArray(testResult.errors) && testResult.errors.length > 0 && (
              <div className="mt-2 rounded-md border border-rose-100 bg-rose-50 p-2">
                <div className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-1">
                  What to fix
                </div>
                <ul className="text-xs text-rose-700 list-disc pl-4">
                  {testResult.errors.map((e: string, i: number) => (
                    <li key={i}>{formatPromoError(e)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* List + edit */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <Tag className="h-4 w-4 text-gray-600" />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">All Promos</h2>
          <span className="text-xs text-gray-500">({filtered.length})</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Tag className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-sm font-semibold text-gray-700 mb-1">No promos found</h3>
            <p className="text-xs text-gray-500">
              {q ? `No promos match "${q}"` : "Get started by creating your first promo"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p, index) => (
              <ScaleIn key={p.id} delay={index * 0.03}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 hover:border-[#D26E3D]/20 hover:shadow-sm transition-all bg-white">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Icon/Avatar */}
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#D26E3D]/10 to-[#B85C2E]/10 text-[#D26E3D] flex-shrink-0">
                      <Tag className="h-5 w-5" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900 truncate">
                          {p.code}
                        </span>
                        <PromoTypeBadge type={p.promo_type} />
                        <StatusBadge active={p.is_active} />
                      </div>
                      <div className="text-sm text-gray-700 font-medium truncate">
                        {p.name}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>
                          {p.promo_type === "percentage" && `${p.discount_percentage}% off`}
                          {p.promo_type === "fixed_amount" &&
                            `Save ₱${((p.discount_cents || 0) / 100).toFixed(2)}`}
                          {p.promo_type === "bundle" &&
                            `Bundle: ₱${((p.bundle_price_cents || 0) / 100).toFixed(2)}`}
                          {p.promo_type === "free_addon" && "Free add-on"}
                        </span>
                        <span>•</span>
                        <span>{p.usage_count || 0} uses</span>
                        {p.valid_until && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Until {new Date(p.valid_until).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    type="button"
                    onClick={() => setEditModalId(p.id)}
                    className="flex-shrink-0 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#D26E3D] hover:text-[#D26E3D] hover:bg-[#D26E3D]/5 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </ScaleIn>
            ))}
          </div>
        )}
      </section>

      {/* Edit Modal */}
      {editModalId && activeEditPromo && (
        <Modal
          title={`Edit Promo • ${activeEditPromo.code}`}
          onClose={() => setEditModalId(null)}
        >
          <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-4">
              <ImageDropzone
                currentImage={activeEditPromo.image_url}
                onUpload={async (file) => {
                  const ext = file.name.split(".").pop() || "png";
                  const path = `promos/${activeEditPromo.id}.${ext}`;

                  const { error } = await supabase.storage
                    .from("promos")
                    .upload(path, file, { upsert: true });

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
                  }/storage/v1/object/public/promos/${path}`;

                  updatePromo(activeEditPromo.id, { image_url: publicUrl });
                  toast({
                    title: "Image uploaded",
                    description: "Promo image has been updated",
                  });
                }}
              />

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Promo Code
                </label>
                <input
                  className="w-full text-base font-semibold text-gray-900 border-b-2 border-gray-200 bg-transparent focus:border-[#D26E3D] focus:outline-none focus:ring-0 placeholder:text-gray-400 transition-colors px-0 pb-1"
                  value={activeEditPromo.code}
                  onChange={(e) =>
                    updatePromo(activeEditPromo.id, { code: e.target.value.toUpperCase() })
                  }
                  placeholder="PROMOCODE"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Promo Name
                </label>
                <input
                  className="w-full text-base font-semibold text-gray-900 border-b-2 border-gray-200 bg-transparent focus:border-[#D26E3D] focus:outline-none focus:ring-0 placeholder:text-gray-400 transition-colors px-0 pb-1"
                  value={activeEditPromo.name}
                  onChange={(e) => updatePromo(activeEditPromo.id, { name: e.target.value })}
                  placeholder="Promo name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Description
                </label>
                <textarea
                  className="w-full text-sm text-gray-700 bg-gray-50 border-0 rounded-lg px-3 py-2.5 focus:bg-white focus:ring-2 focus:ring-[#D26E3D]/20 resize-none placeholder:text-gray-400 transition-all"
                  rows={3}
                  value={activeEditPromo.description || ""}
                  onChange={(e) =>
                    updatePromo(activeEditPromo.id, { description: e.target.value })
                  }
                  placeholder="Add a brief description..."
                />
              </div>
            </div>

            <div className="space-y-4">
              {/* Promo type */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Promo Type
                </label>
                <select
                  className="w-full text-sm font-semibold bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D26E3D]/20 focus:border-[#D26E3D] transition-all"
                  value={activeEditPromo.promo_type}
                  onChange={(e) =>
                    updatePromo(activeEditPromo.id, {
                      promo_type: e.target.value as PromoType,
                      discount_percentage: null,
                      discount_cents: null,
                      bundle_price_cents: null,
                    })
                  }
                >
                  <option value="percentage">Percentage Discount</option>
                  <option value="fixed_amount">Fixed Amount Discount</option>
                  <option value="bundle">Bundle Price</option>
                  <option value="free_addon">Free Add-on</option>
                </select>
              </div>

              {/* Discount value based on type */}
              {activeEditPromo.promo_type === "percentage" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Discount Percentage
                  </label>
                  <input
                    className="w-full text-sm font-semibold bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D26E3D]/20 focus:border-[#D26E3D] transition-all"
                    type="number"
                    value={activeEditPromo.discount_percentage || ""}
                    onChange={(e) =>
                      updatePromo(activeEditPromo.id, {
                        discount_percentage: Number(e.target.value || 0),
                      })
                    }
                    placeholder="15"
                  />
                </div>
              )}

              {activeEditPromo.promo_type === "fixed_amount" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Discount Amount (₱)
                  </label>
                  <input
                    className="w-full text-sm font-semibold bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D26E3D]/20 focus:border-[#D26E3D] transition-all"
                    type="number"
                    step="0.01"
                    value={activeEditPromo.discount_cents ? activeEditPromo.discount_cents / 100 : ""}
                    onChange={(e) =>
                      updatePromo(activeEditPromo.id, {
                        discount_cents: Number(Number(e.target.value || 0) * 100),
                      })
                    }
                    placeholder="50.00"
                  />
                </div>
              )}

              {activeEditPromo.promo_type === "bundle" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Bundle Price (₱)
                  </label>
                  <input
                    className="w-full text-sm font-semibold bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D26E3D]/20 focus:border-[#D26E3D] transition-all"
                    type="number"
                    step="0.01"
                    value={activeEditPromo.bundle_price_cents ? activeEditPromo.bundle_price_cents / 100 : ""}
                    onChange={(e) =>
                      updatePromo(activeEditPromo.id, {
                        bundle_price_cents: Number(Number(e.target.value || 0) * 100),
                      })
                    }
                    placeholder="410.00"
                  />
                </div>
              )}

              {/* Validity dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Valid From
                  </label>
                  <input
                    className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D26E3D]/20 focus:border-[#D26E3D] transition-all"
                    type="date"
                    value={activeEditPromo.valid_from?.split("T")[0] || ""}
                    onChange={(e) =>
                      updatePromo(activeEditPromo.id, {
                        valid_from: new Date(e.target.value).toISOString(),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                    Valid Until
                  </label>
                  <input
                    className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#D26E3D]/20 focus:border-[#D26E3D] transition-all"
                    type="date"
                    value={activeEditPromo.valid_until?.split("T")[0] || ""}
                    onChange={(e) =>
                      updatePromo(activeEditPromo.id, {
                        valid_until: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                  />
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-2.5 text-sm font-medium text-gray-700 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={activeEditPromo.is_active}
                    onChange={(e) =>
                      updatePromo(activeEditPromo.id, { is_active: e.target.checked })
                    }
                    className="peer h-4 w-4 rounded border-gray-300 text-[#D26E3D] focus:ring-2 focus:ring-[#D26E3D] focus:ring-offset-0 transition-all"
                  />
                  <div className="absolute inset-0 rounded-md ring-2 ring-transparent group-hover:ring-[#D26E3D]/20 transition-all peer-checked:bg-[#D26E3D] peer-checked:border-[#D26E3D]"></div>
                </div>
                <span className="group-hover:text-[#D26E3D] transition-colors">Active</span>
              </label>

              {/* Save button */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => savePromo(activeEditPromo)}
                  className="rounded-lg bg-gradient-to-r from-[#D26E3D] to-[#B85C2E] px-5 py-2.5 text-sm font-semibold text-white hover:from-[#B85C2E] hover:to-[#9A4F2C] transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  Save Changes
                </button>
                {saveSuccessId === activeEditPromo.id && (
                  <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                    <Check className="h-3.5 w-3.5" />
                    Saved!
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
