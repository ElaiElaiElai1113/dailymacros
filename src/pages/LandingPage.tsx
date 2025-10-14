// src/pages/LandingPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

type Drink = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
};

const COLORS = {
  redOrange: "#D26E3D",
  yellow: "#EECB65",
  cyan: "#599190",
  bg: "#F6ECC6",
};

export default function LandingPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("drinks")
        .select("id,name,description,price_cents")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(6);
      setDrinks((data as Drink[]) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div
      style={{ backgroundColor: COLORS.bg }}
      className="min-h-screen text-gray-900"
    >
      {/* HERO */}
      <header className="relative overflow-hidden">
        {/* soft blobs */}
        <div
          className="absolute -top-24 -right-24 h-80 w-80 rounded-full blur-3xl opacity-40"
          style={{ background: COLORS.redOrange }}
        />
        <div
          className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-40"
          style={{ background: COLORS.yellow }}
        />

        <div className="mx-auto max-w-7xl px-4 pt-6 pb-16 md:pt-10 md:pb-20">
          {/* NAV */}
          <nav className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/logo.svg"
                alt="DailyMacros logo"
                className="h-9 w-9 rounded-lg"
              />
              <span className="font-semibold tracking-tight text-lg">
                DailyMacros
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                to="/menu"
                className="hidden rounded-lg border px-3 py-2 text-sm md:inline-block hover:opacity-90"
                style={{ borderColor: "#00000022" }}
              >
                Menu
              </Link>
              <Link
                to="/build"
                className="hidden rounded-lg border px-3 py-2 text-sm md:inline-block hover:opacity-90"
                style={{ borderColor: "#00000022" }}
              >
                Build Your Own
              </Link>
              <Link
                to="/menu"
                className="rounded-lg px-4 py-2 text-white text-sm font-medium hover:opacity-90"
                style={{ background: COLORS.redOrange }}
              >
                Order Now
              </Link>
            </div>
          </nav>

          {/* HERO GRID */}
          <div className="mt-12 grid items-center gap-10 md:grid-cols-2">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl leading-tight">
                Macro-perfect protein shakes.
                <span className="block" style={{ color: COLORS.cyan }}>
                  Dietitian-approved. Made to order.
                </span>
              </h1>
              <p className="mt-4 text-gray-700 md:text-lg">
                Choose a signature shake or build your own. See calories,
                protein, carbs, and fat update in real time—no login needed to
                order.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/menu"
                  className="rounded-xl px-5 py-3 font-medium text-white hover:opacity-90"
                  style={{ background: COLORS.redOrange }}
                >
                  Order Now
                </Link>
                <Link
                  to="/build"
                  className="rounded-xl px-5 py-3 font-medium hover:opacity-90"
                  style={{ border: "1px solid #00000022", background: "white" }}
                >
                  Build Your Own
                </Link>
              </div>
              <p className="mt-3 text-xs text-gray-600">
                Pickup in-store. Staff POS available on site.
              </p>
            </div>

            {/* hero mock card */}
            <div className="relative mx-auto w-full max-w-md">
              <div
                className="absolute -inset-2 rounded-3xl blur-2xl opacity-70"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.yellow}, ${COLORS.cyan})`,
                }}
              />
              <div className="relative rounded-3xl border bg-white p-6 shadow-xl">
                <div
                  className="h-40 rounded-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${COLORS.redOrange}22, ${COLORS.cyan}22)`,
                  }}
                />
                <div className="mt-4 flex items-start justify-between">
                  <div>
                    <div className="text-sm" style={{ color: COLORS.cyan }}>
                      Featured
                    </div>
                    <div className="text-lg font-semibold">
                      Berry Oat Smoothie
                    </div>
                  </div>
                  <div
                    className="rounded-lg px-3 py-1 text-sm font-medium"
                    style={{
                      background: `${COLORS.yellow}80`,
                      color: "#4a3112",
                    }}
                  >
                    22g protein
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Mixed berries, Greek yogurt, whey, chia, oats.
                  Macro-transparent & delicious.
                </p>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                  <Stat label="Kcal" value="~350" />
                  <Stat label="Protein" value="~25g" />
                  <Stat label="Carbs" value="~45g" />
                  <Stat label="Fat" value="~8g" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* VALUE PROPS */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-center text-2xl font-bold">Why DailyMacros?</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            title="Dietitian-Crafted"
            desc="Signature shakes built from real nutrition data."
            accent={COLORS.yellow}
            icon="🧪"
          />
          <Feature
            title="Build Your Own"
            desc="Choose ingredients & amounts—see macros live."
            accent={COLORS.cyan}
            icon="🧮"
          />
          <Feature
            title="Allergen Aware"
            desc="Ingredients tagged for fast, safe choices."
            accent={COLORS.redOrange}
            icon="⚕️"
          />
          <Feature
            title="POS-Ready"
            desc="In-store staff flow with printable labels."
            accent={COLORS.cyan}
            icon="🖨️"
          />
        </div>
      </section>

      {/* MENU PREVIEW */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Popular on the Menu</h2>
          <Link
            to="/menu"
            className="text-sm font-medium hover:opacity-80"
            style={{ color: COLORS.redOrange }}
          >
            See full menu →
          </Link>
        </div>
        {loading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : drinks.length === 0 ? (
          <div className="text-sm text-gray-600">
            No drinks yet. Add some in the admin panel.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drinks.map((d) => (
              <DrinkCard key={d.id} drink={d} colors={COLORS} />
            ))}
          </div>
        )}
      </section>

      {/* CTA STRIP */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div
          className="rounded-2xl p-6 md:p-10"
          style={{
            background: `linear-gradient(90deg, ${COLORS.yellow}, ${COLORS.redOrange}33)`,
          }}
        >
          <div className="grid items-center gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-xl font-semibold">Ready to fuel your day?</h3>
              <p className="mt-2 text-gray-700">
                Order a signature shake or build your own in seconds.
              </p>
            </div>
            <div className="flex gap-3 md:justify-end">
              <Link
                to="/menu"
                className="rounded-xl px-5 py-3 font-medium text-white hover:opacity-90"
                style={{ background: COLORS.redOrange }}
              >
                Order Now
              </Link>
              <Link
                to="/build"
                className="rounded-xl px-5 py-3 font-medium hover:opacity-90"
                style={{ border: "1px solid #00000022", background: "white" }}
              >
                Build Your Own
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-gray-600">
          © {new Date().getFullYear()} DailyMacros. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function Feature({
  title,
  desc,
  icon,
  accent,
}: {
  title: string;
  desc: string;
  icon: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-2 text-2xl">{icon}</div>
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm text-gray-700">{desc}</div>
      <div
        className="mt-3 h-1 w-12 rounded-full"
        style={{ background: accent }}
      />
    </div>
  );
}

function DrinkCard({
  drink,
  colors,
}: {
  drink: Drink;
  colors: { redOrange: string; yellow: string; cyan: string; bg: string };
}) {
  return (
    <div className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md">
      <div
        className="aspect-[16/9] w-full rounded-xl"
        style={{
          background: `linear-gradient(135deg, ${colors.cyan}22, ${colors.redOrange}22)`,
        }}
      />
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{drink.name}</div>
          <div className="text-sm text-gray-600 line-clamp-2">
            {drink.description || "Signature protein smoothie."}
          </div>
        </div>
        <div
          className="shrink-0 rounded-lg px-2.5 py-1 text-white text-xs font-medium"
          style={{ background: colors.cyan }}
        >
          ₱{(drink.price_cents / 100).toFixed(2)}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Link
          to="/menu"
          className="inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium hover:opacity-80"
          style={{ borderColor: "#00000022" }}
        >
          View
        </Link>
        <Link
          to="/menu"
          className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-white hover:opacity-90"
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
