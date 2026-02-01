import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import {
  Sparkles,
  Heart,
  Zap,
  Clock,
  Shield,
  ChevronRight,
  Users
} from "lucide-react";
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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 12,
    },
  },
};

const floatVariants = {
  animate: {
    y: [0, -10, 0],
  },
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
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
    <div className="min-h-screen bg-[#FFFDF8] overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating circles */}
          <motion.div
            className="absolute top-20 left-10 w-64 h-64 rounded-full bg-gradient-to-br from-[#D26E3D]/10 to-transparent"
            {...floatVariants}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" as const }}
          />
          <motion.div
            className="absolute top-40 right-20 w-48 h-48 rounded-full bg-gradient-to-br from-[#597A90]/10 to-transparent"
            {...floatVariants}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" as const }}
          />
          <motion.div
            className="absolute bottom-20 left-1/4 w-32 h-32 rounded-full bg-gradient-to-br from-[#EECB65]/10 to-transparent"
            {...floatVariants}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" as const }}
          />

          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(to right, #D26E3D 1px, transparent 1px),
                linear-gradient(to bottom, #D26E3D 1px, transparent 1px)
              `,
              backgroundSize: '80px 80px'
            }}
          />
        </div>

        {/* Main Hero Content */}
        <motion.div
          className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 md:pt-32"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left Content */}
            <motion.div className="space-y-8" variants={itemVariants}>
              {/* Badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" as const, stiffness: 200, damping: 10 }}
              >
                <Badge
                  variant="secondary"
                  className="px-4 py-2 text-sm font-semibold gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  DailyMacros
                </Badge>
              </motion.div>

              {/* Heading */}
              <motion.h1
                className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1]"
                variants={itemVariants}
              >
                <span className="block">Protein shakes</span>
                <span className="block text-[#D26E3D]">that fuel your day.</span>
              </motion.h1>

              {/* Description */}
              <motion.p
                className="text-lg md:text-xl text-gray-600 max-w-xl leading-relaxed"
                variants={itemVariants}
              >
                Dietitian-crafted blends, clear macro breakdowns, and a fast
                checkout built for your busy lifestyle.
              </motion.p>

              {/* Stats/Social Proof */}
              <motion.div
                className="flex flex-wrap gap-6"
                variants={itemVariants}
              >
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-5 w-5 text-[#D26E3D]" />
                  <span>1,000+ happy customers</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="h-5 w-5 text-[#D26E3D]" />
                  <span>Dietitian approved</span>
                </div>
              </motion.div>

              {/* Feature Pills */}
              <motion.div
                className="flex flex-wrap gap-3"
                variants={itemVariants}
              >
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm">
                  <Zap className="h-4 w-4 text-[#D26E3D]" />
                  <span className="text-sm font-medium">Energy boost</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm">
                  <Heart className="h-4 w-4 text-rose-500" />
                  <span className="text-sm font-medium">Healthy ingredients</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm">
                  <Clock className="h-4 w-4 text-[#597A90]" />
                  <span className="text-sm font-medium">Ready in 5 mins</span>
                </div>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                className="flex flex-wrap gap-4"
                variants={itemVariants}
              >
                <Button
                  asChild
                  size="lg"
                  className="px-8 py-6 text-lg shadow-lg shadow-[#D26E3D]/20 hover:shadow-[#D26E3D]/30 transition-all"
                >
                  <Link to="/order" className="flex items-center gap-2">
                    Order Now
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="px-8 py-6 text-lg border-2 hover:bg-gray-50 transition-all"
                >
                  <Link to="/menu">
                    View Menu
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Right Content - Featured Drink Card */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative"
            >
              <Card className="relative overflow-hidden border-2 border-[#D26E3D]/20 shadow-2xl hover:shadow-[#D26E3D]/10 transition-shadow">
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-br from-[#D26E3D]/20 via-[#EECB65]/20 to-[#597A90]/20 rounded-3xl blur-3xl" />

                <CardContent className="relative space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <Badge variant="glow" className="px-4 py-2 text-sm font-semibold animate-pulse">
                      ⭐ Featured
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Ready in 5 min
                    </span>
                  </div>

                  <motion.div
                    className="aspect-[4/3] w-full overflow-hidden rounded-3xl border-2 border-[#D26E3D]/10 bg-gradient-to-br from-[#FFE7C5] via-white to-[#D7EFEA]"
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                  >
                    {featured?.image_url ? (
                      <img
                        src={featured.image_url}
                        alt={featured.name}
                        className="h-full w-full object-contain drop-shadow-lg"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-6xl mb-2">🥤</div>
                          <p className="text-sm text-gray-600">Signature Blend</p>
                        </div>
                      </div>
                    )}
                  </motion.div>

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xl font-bold">
                        {featured?.name || "Signature Berry Oat Shake"}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {featured?.description ||
                          "Balanced flavor with fiber, protein, and clean energy to keep you going."}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className="px-3 py-1 text-base font-semibold">
                        ₱{featured ? featured.price_php.toFixed(0) : "200"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <MiniStat label="Kcal" value="~350" />
                    <MiniStat label="Protein" value="~25g" />
                    <MiniStat label="Carbs" value="~40g" />
                    <MiniStat label="Fat" value="~8g" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400"
        >
          <span className="text-xs">Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronRight className="h-5 w-5 -rotate-90" />
          </motion.div>
        </motion.div>
      </section>

      {/* Popular Blends Section */}
      <section className="relative bg-white py-20">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="mb-10"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <Badge variant="secondary" className="mb-2">Menu</Badge>
                <h2 className="text-3xl md:text-4xl font-bold">
                  Popular blends
                </h2>
                <p className="text-gray-600 mt-2 max-w-xl">
                  Our most loved protein shakes, crafted for taste and nutrition.
                </p>
              </div>
              <Button asChild variant="outline" size="lg" className="group">
                <Link to="/menu" className="flex items-center gap-2">
                  View all drinks
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </motion.div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={`popular-skel-${i}`} className="overflow-hidden">
                  <CardContent className="space-y-4 p-6">
                    <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
                    <div className="space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : drinks.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">No drinks available yet. Check back soon!</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {drinks.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <MiniDrinkCard drink={d} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gradient-to-br from-[#597A90] to-[#D26E3D] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <Badge className="mb-4 bg-white/20 text-white border-white/30">
              Why DailyMacros?
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built for your lifestyle
            </h2>
            <p className="max-w-2xl mx-auto text-white/90 text-lg">
              We make healthy eating easy with transparent nutrition info and fast ordering.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: <Zap className="h-8 w-8" />,
                title: "Energy Boost",
                description: "Get sustained energy without the crash. Perfect for busy professionals.",
              },
              {
                icon: <Heart className="h-8 w-8" />,
                title: "Heart Healthy",
                description: "Balanced macros crafted by nutritionists for your wellbeing.",
              },
              {
                icon: <Clock className="h-8 w-8" />,
                title: "Fast & Fresh",
                description: "Order ahead and pick up on your schedule. No waiting required.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center hover:bg-white/20 transition-colors"
              >
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-white/80 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 bg-[#FFFDF8]">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#D26E3D]/20 to-[#597A90]/20 mx-auto mb-6">
              <Sparkles className="h-10 w-10 text-[#D26E3D]" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Ready to power your day?
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
              Join thousands of customers who have transformed their nutrition with DailyMacros.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
              >
                <Link to="/order" className="flex items-center gap-2">
                  Order Your First Shake
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="px-8 py-6 text-lg"
              >
                <Link to="/menu">
                  Browse Menu
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>© {new Date().getFullYear()} DailyMacros</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Designed for nutrition, built for performance.</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link to="/menu" className="hover:text-[#D26E3D] transition-colors">
                Menu
              </Link>
              <Link to="/order" className="hover:text-[#D26E3D] transition-colors">
                Order
              </Link>
              <Link to="/cart" className="hover:text-[#D26E3D] transition-colors">
                Cart
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MiniDrinkCard({ drink }: { drink: Drink }) {
  return (
    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#D26E3D]/20">
      <CardContent className="space-y-4 p-6">
        <motion.div
          className="aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-gray-100 bg-gradient-to-br from-[#FFE7C5] via-white to-[#D7EFEA]"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.3 }}
        >
          {drink.image_url ? (
            <img
              src={drink.image_url}
              alt={drink.name}
              loading="lazy"
              className="h-full w-full object-contain drop-shadow-md"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-1">🥤</div>
                <p className="text-xs text-gray-600">Custom Blend</p>
              </div>
            </div>
          )}
        </motion.div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="text-lg font-bold group-hover:text-[#D26E3D] transition-colors">
              {drink.name}
            </div>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {drink.description || "Signature protein blend."}
            </p>
          </div>
          <Badge className="px-3 py-1 text-base font-semibold">
            ₱{drink.price_php.toFixed(0)}
          </Badge>
        </div>
        <Button
          asChild
          variant="secondary"
          className="w-full group-hover:bg-[#D26E3D] group-hover:text-white transition-all duration-300"
        >
          <Link to="/menu" className="flex items-center justify-center gap-2">
            View details
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white/80 py-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-[10px] uppercase tracking-wide text-gray-600 font-medium">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-bold text-gray-900">{value}</div>
    </div>
  );
}
