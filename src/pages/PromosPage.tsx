/**
 * Daily Macros Promos Page
 *
 * Customer-facing page to view all available promotions and discounts.
 */

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import { Tag, Loader2, Search, Sparkles } from "lucide-react";
import { ScaleIn } from "@/components/ui/animations";
import { PromoCard } from "@/components/promo/PromoCard";
import type { Promo, PromoVariant, CartItem } from "@/types";

type PromoWithVariants = Promo & {
  promo_variants?: PromoVariant[];
};

export default function PromosPage() {
  const [promos, setPromos] = useState<PromoWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Load promos
  useEffect(() => {
    loadPromos();
  }, []);

  async function loadPromos() {
    setLoading(true);
    const { data, error } = await supabase
      .from("promos")
      .select(`
        *,
        promo_variants(*)
      `)
      .eq("is_active", true)
      .lte("valid_from", new Date().toISOString())
      .or("valid_until.is.null,valid_until.gte." + new Date().toISOString())
      .order("priority", { ascending: false })
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

    setPromos((data || []) as PromoWithVariants[]);
  }

  // Filter promos
  const filtered = useMemo(() => {
    if (!q) return promos;
    return promos.filter(
      (p) =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.code.toLowerCase().includes(q.toLowerCase()) ||
        (p.description?.toLowerCase().includes(q.toLowerCase()) ?? false)
    );
  }, [promos, q]);

  // Get selected variant
  const selectedVariant = useMemo(() => {
    if (!selectedPromoId || !selectedVariantId) return undefined;
    const promo = promos.find((p) => p.id === selectedPromoId);
    return promo?.promo_variants?.find((v) => v.id === selectedVariantId);
  }, [selectedPromoId, selectedVariantId, promos]);

  // Get selected promo
  const selectedPromo = useMemo(() => {
    return promos.find((p) => p.id === selectedPromoId) || null;
  }, [selectedPromoId, promos]);

  const handleSelectPromo = (promoId: string, variantId?: string) => {
    setSelectedPromoId(promoId);
    if (variantId) {
      setSelectedVariantId(variantId);
    }
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFDF8] to-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#D26E3D]/10 to-[#B85C2E]/10 px-4 py-2 mb-4">
            <Sparkles className="h-4 w-4 text-[#D26E3D]" />
            <span className="text-sm font-semibold text-[#D26E3D]">
              Special Offers
            </span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Promotions & Deals
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Save on your favorite drinks with our exclusive promotions.
            Enter the promo code at checkout to apply your discount.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              className="w-full rounded-full border border-gray-200 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#D26E3D]/30 focus:border-[#D26E3D] transition-all shadow-sm"
              placeholder="Search promos..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {/* Selected promo notice */}
        {selectedPromo && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="rounded-xl bg-gradient-to-r from-[#D26E3D]/10 to-[#B85C2E]/5 border border-[#D26E3D]/20 p-4 flex items-center gap-3">
              <Tag className="h-5 w-5 text-[#D26E3D]" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Promo selected: {selectedPromo.code}
                </p>
                <p className="text-xs text-gray-600">
                  Enter this code at checkout to apply your discount
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedPromoId(null);
                  setSelectedVariantId(null);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-[#D26E3D] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div className="text-center py-12">
            <Tag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {q ? `No promos match "${q}"` : "No promotions available"}
            </h3>
            <p className="text-sm text-gray-500">
              {q
                ? "Try a different search term"
                : "Check back later for new deals and discounts"}
            </p>
          </div>
        ) : (
          /* Promo grid */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((promo, index) => (
              <ScaleIn key={promo.id} delay={index * 0.05}>
                {/* Show variants if available */}
                {promo.promo_variants && promo.promo_variants.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      {promo.name}
                    </div>
                    {promo.promo_variants.map((variant) => (
                      <PromoCard
                        key={variant.id}
                        promo={promo}
                        variant={variant}
                        isSelected={
                          selectedPromoId === promo.id &&
                          selectedVariantId === variant.id
                        }
                        onSelect={() => handleSelectPromo(promo.id, variant.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <PromoCard
                    promo={promo}
                    isSelected={selectedPromoId === promo.id}
                    onSelect={() => handleSelectPromo(promo.id)}
                  />
                )}
              </ScaleIn>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
