import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

type Drink = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url?: string | null; // 👈 add image
};

const COLORS = {
  redOrange: "#D26E3D",
  yellow: "#EECB65",
  cyan: "#599190",
  bg: "#FFF9EE",
};

export default function LandingPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("drinks")
        .select("id,name,description,price_cents,image_url") // 👈 pull image_url
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(6);
      setDrinks((data as Drink[]) || []);
      setLoading(false);
    })();
  }, []);

  // first drink = featured (fallback if none)
  const featured = useMemo<Drink | null>(
    () => (drinks.length > 0 ? drinks[0] : null),
    [drinks]
  );

  return (
    <div
      style={{
        background: `linear-gradient(180deg, ${COLORS.bg}, #FFFFFF)`,
      }}
      className="min-h-screen text-gray-900"
    >
      {/* HERO SECTION */}
      <section className="relative mx-auto max-w-7xl grid items-center gap-10 px-4 py-16 md:grid-cols-2">
        {/* left copy */}
        <div className="z-10 space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-white/40">
            🥤 DailyMacros POS • protein shakes
          </span>
          <h1 className="text-5xl font-extrabold leading-tight text-gray-900 md:text-6xl">
            Fuel your day with{" "}
            <span style={{ color: COLORS.cyan }}>macro-perfect</span> shakes.
          </h1>
          <p className="text-gray-700 md:text-lg">
            Hand-crafted by dietitians. Customize your ingredients, track your
            macros, and order seamlessly — no login needed.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/menu"
              className="rounded-xl px-6 py-3 font-semibold text-white shadow hover:opacity-90"
              style={{ background: COLORS.redOrange }}
            >
              Order Now
            </Link>
            <Link
              to="/build"
              className="rounded-xl px-6 py-3 font-semibold border text-gray-700 hover:bg-gray-50"
            >
              Build Your Own
            </Link>
          </div>

          {/* tiny badges */}
          <div className="flex flex-wrap gap-3 pt-2 text-xs text-gray-500">
            <Badge>Transparent macros</Badge>
            <Badge>No guesswork</Badge>
            <Badge>Works with Supabase</Badge>
          </div>
        </div>

        {/* HERO CARD */}
        <div className="relative mx-auto max-w-md">
          {/* glow */}
          <div
            className="absolute -inset-3 rounded-3xl blur-2xl opacity-60"
            style={{
              background: `linear-gradient(135deg, ${COLORS.cyan}, ${COLORS.yellow})`,
            }}
          />
          <div className="relative rounded-3xl border bg-white/90 backdrop-blur p-6 shadow-xl space-y-4">
            {/* image area */}
            <div className="h-48 w-full rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden">
              {featured?.image_url ? (
                <img
                  src={featured.image_url}
                  alt={featured.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-tr from-[#D26E3D22] to-[#59919022] rounded-2xl" />
              )}
            </div>

            {/* meta */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-[#599190] uppercase tracking-wide">
                  Featured
                </div>
                <div className="text-lg font-semibold">
                  {featured?.name || "Berry Oat Smoothie"}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {featured?.description ||
                    "Mixed berries, oats, Greek yogurt & whey protein."}
                </p>
              </div>
              <div className="rounded-md bg-[#EECB65aa] px-3 py-1 text-xs font-semibold text-[#5a4200]">
                ₱{featured ? (featured.price_cents / 100).toFixed(0) : "200"}
              </div>
            </div>

            {/* stats */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <Stat label="Kcal" value="~350" />
              <Stat label="Protein" value="~25g" />
              <Stat label="Carbs" value="~40g" />
              <Stat label="Fat" value="~8g" />
            </div>
          </div>

          {/* floating mini card */}
          <div className="absolute -bottom-6 -left-6 rounded-2xl bg-white shadow-lg px-4 py-3 text-xs flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#D26E3D22]" />
            <div>
              <div className="font-semibold text-gray-800">Macros live</div>
              <div className="text-gray-500 text-[11px]">
                Updates as you add toppings
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center text-3xl font-extrabold">
          Why DailyMacros?
        </h2>
        <p className="text-center text-gray-500 mt-2 max-w-2xl mx-auto">
          Built for people who actually track. Everything is priced, measured,
          and visible for you and your customers.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            icon="🥤"
            title="Nutrition-Based"
            desc="Every shake is calculated with verified nutrition data."
            accent={COLORS.cyan}
          />
          <Feature
            icon="🧮"
            title="Build Your Own"
            desc="Customize ingredients & instantly see your macros."
            accent={COLORS.yellow}
          />
          <Feature
            icon="⚕️"
            title="Dietitian Verified"
            desc="Formulated by professionals for optimal results."
            accent={COLORS.redOrange}
          />
          <Feature
            icon="🚀"
            title="Quick Ordering"
            desc="Smart POS integration and pickup-ready flow."
            accent={COLORS.cyan}
          />
        </div>
      </section>

      {/* MENU PREVIEW */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-extrabold">Popular on the Menu</h2>
            <p className="text-gray-500 text-sm">
              Pulled straight from your Supabase drinks table.
            </p>
          </div>
          <Link
            to="/menu"
            className="text-sm font-semibold hover:opacity-80"
            style={{ color: COLORS.redOrange }}
          >
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="text-gray-600 text-sm">Loading popular drinks...</div>
        ) : drinks.length === 0 ? (
          <div className="text-gray-600 text-sm">
            No drinks yet. Add some in the admin panel.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {drinks.map((d) => (
              <DrinkCard key={d.id} drink={d} colors={COLORS} />
            ))}
          </div>
        )}
      </section>

      {/* CTA STRIP */}
      <section className="bg-gradient-to-r from-[#EECB65] to-[#D26E3D] text-white py-16 mt-4">
        <div className="mx-auto max-w-6xl flex flex-col items-center text-center gap-6">
          <h3 className="text-3xl font-bold">Ready to power your day?</h3>
          <p className="text-white/90 max-w-xl">
            Order your favorite protein shake or build your own blend.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/menu"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-[#D26E3D] hover:opacity-90"
            >
              Order Now
            </Link>
            <Link
              to="/build"
              className="rounded-xl border border-white px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Build Your Own
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t bg-white text-gray-600 text-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-gray-100 rounded" />
            <span>© {new Date().getFullYear()} DailyMacros</span>
          </div>
          <p className="text-gray-500">
            Designed for nutrition, built for performance.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------- COMPONENTS -------------------------- */

function Feature({
  icon,
  title,
  desc,
  accent,
}: {
  icon: string;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition-all">
      <div className="text-3xl">{icon}</div>
      <div className="mt-3 font-semibold text-lg">{title}</div>
      <p className="mt-2 text-gray-600 text-sm">{desc}</p>
      <div
        className="mt-3 h-1 w-12 rounded-full"
        style={{ background: accent }}
      />
    </div>
  );
}

function DrinkCard({ drink, colors }: { drink: Drink; colors: typeof COLORS }) {
  return (
    <div className="group rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition flex flex-col gap-3">
      <div className="h-36 w-full rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
        {drink.image_url ? (
          <img
            src={drink.image_url}
            alt={drink.name}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div
            className="h-full w-full rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${colors.cyan}22, ${colors.redOrange}22)`,
            }}
          />
        )}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{drink.name}</div>
          <div className="text-sm text-gray-600 line-clamp-2">
            {drink.description || "Signature protein smoothie."}
          </div>
        </div>
        <div
          className="rounded-md px-2.5 py-1 text-xs font-medium text-white"
          style={{ background: colors.cyan }}
        >
          ₱{(drink.price_cents / 100).toFixed(2)}
        </div>
      </div>
      <div className="mt-auto flex gap-2">
        <Link
          to="/menu"
          className="flex-1 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 text-center"
        >
          View
        </Link>
        <Link
          to="/menu"
          className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white text-center hover:opacity-90"
          style={{ background: colors.redOrange }}
        >
          Order
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white py-2">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white/80 px-3 py-1 ring-1 ring-white/30 shadow-sm">
      {children}
    </span>
  );
}
