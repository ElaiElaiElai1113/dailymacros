/**
 * PromoCard Component
 *
 * Customer-facing card for displaying available promos.
 * Shows promo details, pricing, and allows selection.
 */

import { Tag, Calendar, Gift, Package, Percent, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Promo, PromoVariant } from "@/types";

interface PromoCardProps {
  promo: Promo;
  variant?: PromoVariant;
  onSelect?: () => void;
  isSelected?: boolean;
}

export function PromoCard({ promo, variant, onSelect, isSelected }: PromoCardProps) {
  const formatDiscount = () => {
    if (variant) {
      return `₱${(variant.price_cents / 100).toFixed(2)}`;
    }

    switch (promo.promo_type) {
      case "percentage":
        return `${promo.discount_percentage}% OFF`;
      case "fixed_amount":
        return `SAVE ₱${((promo.discount_cents || 0) / 100).toFixed(2)}`;
      case "bundle":
        return `₱${((promo.bundle_price_cents || 0) / 100).toFixed(2)} BUNDLE`;
      case "free_addon":
        return `FREE ADD-ON`;
      default:
        return "SPECIAL OFFER";
    }
  };

  const getPromoIcon = () => {
    switch (promo.promo_type) {
      case "bundle":
        return Package;
      case "percentage":
        return Percent;
      case "free_addon":
        return Gift;
      default:
        return Tag;
    }
  };

  const Icon = getPromoIcon();
  const isValid = isPromoValid();
  const isExpired = promo.valid_until && new Date(promo.valid_until) < new Date();

  function isPromoValid() {
    if (!promo.is_active) return false;
    const now = new Date();
    const validFrom = new Date(promo.valid_from);
    const validUntil = promo.valid_until ? new Date(promo.valid_until) : null;
    if (now < validFrom) return false;
    if (validUntil && now > validUntil) return false;
    return true;
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white transition-all duration-200",
        isSelected
          ? "border-[#D26E3D] shadow-lg ring-2 ring-[#D26E3D]/20"
          : "border-gray-200 hover:border-[#D26E3D]/30 hover:shadow-md",
        !isValid && "opacity-60"
      )}
    >
      {/* Header with icon */}
      <div
        className={cn(
          "relative px-5 py-4 flex items-center justify-between",
          "bg-gradient-to-r from-[#D26E3D]/10 to-[#B85C2E]/5"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              "bg-gradient-to-br from-[#D26E3D] to-[#B85C2E] text-white shadow-sm"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                {promo.code}
              </span>
              {isExpired && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 border border-red-200">
                  <Clock className="h-2.5 w-2.5" />
                  Expired
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-gray-900">{promo.name}</h3>
          </div>
        </div>

        {/* Badge */}
        <div
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold",
            "bg-gradient-to-r from-[#D26E3D] to-[#B85C2E] text-white shadow-sm"
          )}
        >
          {formatDiscount()}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Description */}
        {promo.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{promo.description}</p>
        )}

        {/* Variant selection */}
        {variant && (
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-xs font-medium text-gray-600">Variant</span>
            <span className="text-sm font-semibold text-gray-900">
              {variant.variant_name}
            </span>
          </div>
        )}

        {/* Details */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          {promo.valid_from && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              From {new Date(promo.valid_from).toLocaleDateString()}
            </span>
          )}
          {promo.valid_until && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Until {new Date(promo.valid_until).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Terms preview */}
        {promo.terms && (
          <details className="group">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 transition-colors list-none flex items-center gap-1">
              <span>Terms & conditions apply</span>
              <span className="group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="mt-2 text-xs text-gray-600 pl-3 border-l-2 border-gray-200">
              {promo.terms}
            </p>
          </details>
        )}

        {/* Action button */}
        {onSelect && (
          <button
            onClick={onSelect}
            disabled={!isValid}
            className={cn(
              "w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-2",
              isSelected
                ? "bg-gradient-to-r from-[#D26E3D] to-[#B85C2E] text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-[#D26E3D]/10 hover:text-[#D26E3D]",
              !isValid && "cursor-not-allowed opacity-50"
            )}
          >
            {isSelected ? "Selected" : "Select Promo"}
          </button>
        )}
      </div>
    </div>
  );
}
