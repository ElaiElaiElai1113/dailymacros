/**
 * PromoSelector Component
 *
 * Customer-facing component for entering and applying promo codes.
 * Shows applied promo details and allows removal.
 */

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { toast } from "@/hooks/use-toast";
import { Tag, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
        description: result.errors?.join(", ") || "This promo code cannot be applied",
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
    </div>
  );
}
