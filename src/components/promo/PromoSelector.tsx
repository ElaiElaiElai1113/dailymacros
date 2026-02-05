/**
 * PromoSelector Component
 *
 * Customer-facing component for entering and applying promo codes.
 * Shows applied promo details and allows removal.
 */

import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { toast } from "@/hooks/use-toast";
import { Tag, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Promo, PromoVariant, Ingredient } from "@/types";
export function PromoSelector() {
  const {
    appliedPromo,
    promoDiscount,
    promoError,
    applyPromoCode,
    removePromo,
  } = useCart();

  const [promoInput, setPromoInput] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "select_variant" | "select_addon" | "add_items";
    options?: any;
  } | null>(null);
  const [pendingPromo, setPendingPromo] = useState<Promo | null>(null);
  const [pendingCode, setPendingCode] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedAddonId, setSelectedAddonId] = useState<string | null>(null);
  const [addons, setAddons] = useState<Ingredient[]>([]);
  const [loadingAddons, setLoadingAddons] = useState(false);

  useEffect(() => {
    if (actionOpen) return;
    setPendingAction(null);
    setPendingPromo(null);
    setPendingCode("");
    setSelectedVariantId(null);
    setSelectedAddonId(null);
  }, [actionOpen]);

  useEffect(() => {
    if (!actionOpen || pendingAction?.type !== "select_addon") return;
    let active = true;
    (async () => {
      setLoadingAddons(true);
      const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .eq("is_active", true)
        .eq("is_addon", true)
        .order("name");
      if (!active) return;
      if (error) {
        setAddons([]);
      } else {
        setAddons((data || []) as Ingredient[]);
        if (!selectedAddonId && data && data.length > 0) {
          setSelectedAddonId(data[0].id);
        }
      }
      setLoadingAddons(false);
    })();
    return () => {
      active = false;
    };
  }, [actionOpen, pendingAction?.type, selectedAddonId]);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) {
      toast({
        variant: "destructive",
        title: "Enter a promo code",
        description: "Please enter a promo code to apply",
      });
      return;
    }

    setIsApplying(true);
    const result = await applyPromoCode(promoInput);
    setIsApplying(false);

    if (result.requires_action) {
      if (result.requires_action.type === "add_items") {
        const required = (result.requires_action.options as { required?: number } | undefined)
          ?.required;
        toast({
          variant: "destructive",
          title: "Promo requirements not met",
          description:
            result.errors?.[0] ||
            (required
              ? `Add ${required} items to use this promo.`
              : "Add the required items to use this promo."),
        });
        return;
      }
      setPendingAction(result.requires_action);
      setPendingPromo(result.promo || null);
      setPendingCode(promoInput.trim().toUpperCase());
      if (result.requires_action.type === "select_variant") {
        const variants = (result.requires_action.options || []) as PromoVariant[];
        if (!variants.length) {
          toast({
            variant: "destructive",
            title: "No promo options available",
            description: "This promo has no active variants right now.",
          });
          return;
        }
        setSelectedVariantId(variants[0]?.id || null);
      }
      if (result.requires_action.type === "select_addon") {
        setSelectedAddonId(null);
      }
      setActionOpen(true);
      return;
    }

    if (result.success) {
      toast({
        title: "Promo applied!",
        description: `You're saving ₱${(result.discount_cents / 100).toFixed(2)}`,
      });
      setPromoInput("");
    } else {
      toast({
        variant: "destructive",
        title: "Promo code invalid",
        description: result.errors?.[0] || "This promo code cannot be applied",
      });
    }
  };

  const handleRemovePromo = () => {
    removePromo();
    toast({
      title: "Promo removed",
      description: "Promo code has been removed from your cart",
    });
  };

  const handleConfirmAction = async () => {
    if (!pendingCode) return;
    setIsApplying(true);
    const result = await applyPromoCode(pendingCode, {
      selectedVariantId: selectedVariantId || undefined,
      selectedAddonId: selectedAddonId || undefined,
    });
    setIsApplying(false);

    if (result.success) {
      toast({
        title: "Promo applied!",
        description: `You're saving ₱${(result.discount_cents / 100).toFixed(2)}`,
      });
      setPromoInput("");
      setActionOpen(false);
      setPendingAction(null);
      setPendingPromo(null);
      setPendingCode("");
      return;
    }

    toast({
      variant: "destructive",
      title: "Promo code invalid",
      description: result.errors?.[0] || "This promo code cannot be applied",
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="h-4 w-4 text-[#D26E3D]" />
        <h3 className="text-sm font-semibold text-gray-900">Promo Code</h3>
      </div>

      {appliedPromo ? (
        // Applied promo display
        <div className="space-y-3">
          <div className="flex items-start justify-between p-3 rounded-lg bg-gradient-to-r from-[#D26E3D]/10 to-[#B85C2E]/5 border border-[#D26E3D]/20">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm font-bold text-gray-900">
                  {appliedPromo.code}
                </span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-1">
                {appliedPromo.description || appliedPromo.name}
              </p>
              {promoDiscount > 0 && (
                <p className="text-sm font-semibold text-green-600 mt-1">
                  You're saving ₱{(promoDiscount / 100).toFixed(2)}
                </p>
              )}
            </div>
            <button
              onClick={handleRemovePromo}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
              aria-label="Remove promo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        // Promo input
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              className={cn(
                "flex-1 rounded-lg border px-3 py-2.5 text-sm outline-none transition-all",
                "focus:ring-2 focus:ring-[#D26E3D]/30",
                promoError
                  ? "border-red-300 focus:border-red-500"
                  : "border-gray-200 focus:border-[#D26E3D]"
              )}
              type="text"
              placeholder="Enter promo code"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleApplyPromo();
                }
              }}
              disabled={isApplying}
            />
            <button
              onClick={handleApplyPromo}
              disabled={isApplying || !promoInput.trim()}
              className={cn(
                "px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2",
                "bg-[#D26E3D] text-white hover:bg-[#B85C2E]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                "Apply"
              )}
            </button>
          </div>

          {promoError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <X className="h-3 w-3" />
              {promoError}
            </p>
          )}

          {/* Promo hint */}
          <p className="text-xs text-gray-500">
            Try codes like <span className="font-mono font-semibold text-gray-700">GYMSTUDY</span>,{" "}
            <span className="font-mono font-semibold text-gray-700">DAILYDUO</span>, or{" "}
            <span className="font-mono font-semibold text-gray-700">SOLOBOOST</span>
          </p>
        </div>
      )}

      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose your promo option</DialogTitle>
            <DialogDescription>
              {pendingPromo?.name || "This promo requires an extra selection before applying."}
            </DialogDescription>
          </DialogHeader>

          {pendingAction?.type === "select_variant" && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Pick a bundle option</div>
              {(pendingAction.options as PromoVariant[] | undefined)?.length ? (
                <div className="grid gap-2">
                  {(pendingAction.options as PromoVariant[] | undefined)?.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left text-sm transition",
                        selectedVariantId === variant.id
                          ? "border-[#D26E3D] bg-[#D26E3D]/10"
                          : "border-gray-200 hover:border-[#D26E3D]/60"
                      )}
                    >
                      <div className="font-semibold text-gray-900">{variant.variant_name}</div>
                      <div className="text-xs text-gray-600">
                        ₱{((variant.price_cents || 0) / 100).toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No bundle options available.</div>
              )}
            </div>
          )}

          {pendingAction?.type === "select_addon" && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Choose a free add-on</div>
              {loadingAddons ? (
                <div className="text-sm text-gray-500">Loading add-ons…</div>
              ) : addons.length === 0 ? (
                <div className="text-sm text-gray-500">No add-ons available.</div>
              ) : (
                <div className="grid gap-2">
                  {addons.map((addon) => (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => setSelectedAddonId(addon.id)}
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-left text-sm transition",
                        selectedAddonId === addon.id
                          ? "border-[#D26E3D] bg-[#D26E3D]/10"
                          : "border-gray-200 hover:border-[#D26E3D]/60"
                      )}
                    >
                      <div className="font-semibold text-gray-900">{addon.name}</div>
                      <div className="text-xs text-gray-600">{addon.category}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActionOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAction}
              disabled={
                isApplying ||
                (pendingAction?.type === "select_variant" && !selectedVariantId) ||
                (pendingAction?.type === "select_addon" && !selectedAddonId)
              }
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold text-white transition",
                "bg-[#D26E3D] hover:bg-[#B85C2E]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isApplying ? "Applying..." : "Apply promo"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
