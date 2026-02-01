import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Drink = {
  id: string;
  name: string;
  description: string | null;
  price_php: number;
  image_url?: string | null;
};

export default function LandingPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("drinks")
        .select("id,name,description,price_php,image_url")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(6);

      if (!error) {
        setDrinks((data as Drink[]) || []);
      }
      setLoading(false);
    })();
  }, []);

  const featured = useMemo<Drink | null>(
    () => (drinks.length > 0 ? drinks[0] : null),
    [drinks]
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(210,110,61,0.15),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(89,145,144,0.12),_transparent_50%)]">
      <section className="relative mx-auto max-w-7xl px-4 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <Badge variant="secondary">DailyMacros</Badge>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Protein shakes with macros you can trust.
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground md:text-base">
              Dietitian-crafted blends, clear macro breakdowns, and a fast
              checkout built for busy days.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/order">Order Now</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/order">Build Your Own</Link>
              </Button>
            </div>
          </div>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(226,188,120,0.35),_transparent_60%)]" />
            <CardContent className="relative space-y-4 p-6">
              <div className="flex items-center justify-between">
                <Badge variant="glow">Featured</Badge>
                <span className="text-xs text-muted-foreground">
                  Ready in minutes
                </span>
              </div>
              <div className="aspect-[4/3] w-full overflow-hidden rounded-3xl border bg-white">
                {featured?.image_url ? (
                  <img
                    src={featured.image_url}
                    alt={featured.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-[#FFE7C5] via-white to-[#D7EFEA]" />
                )}
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">
                    {featured?.name || "Berry Oat Shake"}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {featured?.description ||
                      "Balanced flavor with fiber, protein, and clean energy."}
                  </p>
                </div>
                <Badge variant="secondary">
                  PHP {featured ? featured.price_php.toFixed(0) : "200"}
                </Badge>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <MiniStat label="Kcal" value="~350" />
                <MiniStat label="Protein" value="~25g" />
                <MiniStat label="Carbs" value="~40g" />
                <MiniStat label="Fat" value="~8g" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Popular blends</h2>
          <Button asChild variant="link">
            <Link to="/menu">View all</Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={`popular-skel-${i}`} className="overflow-hidden">
                <CardContent className="space-y-3 p-4">
                  <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : drinks.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No drinks yet. Add some in the admin panel.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drinks.map((d) => (
              <MiniDrinkCard key={d.id} drink={d} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-gradient-to-r from-[#EECB65] to-[#D26E3D] py-14 text-white">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <h3 className="text-3xl font-semibold">Ready to power your day?</h3>
          <p className="mx-auto mt-3 max-w-xl text-white/90">
            Order your favorite protein shake or build your own blend.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="secondary">
              <Link to="/order">Order Now</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/80 text-white hover:bg-white/20"
            >
              <Link to="/order">Build Your Own</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground md:flex-row">
          <div>Ac {new Date().getFullYear()} DailyMacros</div>
          <div>Designed for nutrition, built for performance.</div>
        </div>
      </footer>
    </div>
  );
}

function MiniDrinkCard({ drink }: { drink: Drink }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-4">
        <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-white">
          {drink.image_url ? (
            <img
              src={drink.image_url}
              alt={drink.name}
              loading="lazy"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#FFE7C5] via-white to-[#D7EFEA]" />
          )}
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">{drink.name}</div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {drink.description || "Signature protein blend."}
            </p>
          </div>
          <Badge variant="secondary">PHP {drink.price_php.toFixed(0)}</Badge>
        </div>
        <Button asChild variant="secondary" className="w-full">
          <Link to="/menu">View details</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/70 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}
