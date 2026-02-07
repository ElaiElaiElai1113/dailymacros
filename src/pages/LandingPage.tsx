import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { motion, useScroll, useTransform, MotionConfig } from "framer-motion";
import {
  Sparkles,
  Heart,
  Zap,
  Clock,
  Shield,
  ChevronRight,
  Users,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPHP } from "@/utils/format";

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

// Word wrapper for text reveal animation
function AnimatedText({ text, className = "" }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring" as const,
            stiffness: 100,
            damping: 12,
            delay: i * 0.05,
          }}
          className="inline-block mr-1"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

// Animated counter component
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      {value.toLocaleString()}{suffix}
    </motion.span>
  );
}

export default function LandingPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const { scrollY } = useScroll();

  // Parallax effects
  const y1 = useTransform(scrollY, [0, 500], [0, 150]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);
  const opacity1 = useTransform(scrollY, [0, 300], [1, 0]);
  const scaleHero = useTransform(scrollY, [0, 500], [1, 0.95]);

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
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#FFFDF8] overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating circles with parallax */}
          <motion.div
            className="absolute top-20 left-10 w-64 h-64 rounded-full bg-gradient-to-br from-[#D26E3D]/10 to-transparent"
            animate={{ y: [0, -10, 0] }}
            style={{ y: y1 }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" as const }}
          />
          <motion.div
            className="absolute top-40 right-20 w-48 h-48 rounded-full bg-gradient-to-br from-[#597A90]/10 to-transparent"
            animate={{ y: [0, -10, 0] }}
            style={{ y: y2 }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" as const }}
          />
          <motion.div
            className="absolute bottom-20 left-1/4 w-32 h-32 rounded-full bg-gradient-to-br from-[#EECB65]/10 to-transparent"
            animate={{ y: [0, -10, 0] }}
            style={{ y: y1 }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" as const }}
          />

          {/* Animated particles */}
          <motion.div
            className="absolute top-1/4 right-1/4 w-2 h-2 rounded-full bg-[#D26E3D]/40"
            animate={{
              y: [0, -30, 0],
              x: [0, 20, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut" as const,
            }}
          />
          <motion.div
            className="absolute bottom-1/3 left-1/3 w-3 h-3 rounded-full bg-[#597A90]/40"
            animate={{
              y: [0, -40, 0],
              x: [0, -15, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut" as const,
              delay: 1,
            }}
          />
          <motion.div
            className="absolute top-1/2 left-20 w-2 h-2 rounded-full bg-[#EECB65]/40"
            animate={{
              y: [0, -25, 0],
              x: [0, 25, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut" as const,
              delay: 0.5,
            }}
          />

          {/* Grid pattern overlay with parallax */}
          <motion.div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              y: useTransform(scrollY, [0, 500], [0, 50]),
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
          style={{ scale: scaleHero, opacity: opacity1 }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left Content */}
            <motion.div className="space-y-8" variants={itemVariants}>
              {/* Badge with enhanced animation */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring" as const, stiffness: 200, damping: 10 }}
                whileHover={{ scale: 1.05 }}
              >
                <Badge
                  variant="secondary"
                  className="px-4 py-2 text-sm font-semibold gap-2 cursor-default"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" as const }}
                  >
                    <Sparkles className="h-4 w-4" />
                  </motion.div>
                  DailyMacros
                </Badge>
              </motion.div>

              {/* Heading with text reveal animation */}
              <motion.h1
                className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1]"
                variants={itemVariants}
              >
                <motion.span
                  className="block"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, type: "spring" as const, stiffness: 100 }}
                >
                  Protein shakes
                </motion.span>
                <motion.span
                  className="block text-[#D26E3D]"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, type: "spring" as const, stiffness: 100 }}
                >
                  that fuel your day.
                </motion.span>
              </motion.h1>

              {/* Description with fade in */}
              <motion.p
                className="text-lg md:text-xl text-gray-600 max-w-xl leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                Dietitian-crafted blends, clear macro breakdowns, and a fast
                checkout built for your busy lifestyle.
              </motion.p>

              {/* Stats/Social Proof with staggered animation */}
              <motion.div
                className="flex flex-wrap gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <motion.div
                  className="flex items-center gap-2 text-sm text-gray-600"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.9, type: "spring" as const }}
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 2, delay: 1.5, repeat: Infinity }}
                  >
                    <Users className="h-5 w-5 text-[#D26E3D]" />
                  </motion.div>
                  <span><AnimatedCounter value={1000} suffix="+" /> happy customers</span>
                </motion.div>
                <motion.div
                  className="flex items-center gap-2 text-sm text-gray-600"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1, type: "spring" as const }}
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, delay: 1.6, repeat: Infinity }}
                  >
                    <Shield className="h-5 w-5 text-[#D26E3D]" />
                  </motion.div>
                  <span>Dietitian approved</span>
                </motion.div>
              </motion.div>

              {/* Feature Pills with staggered entrance */}
              <motion.div
                className="flex flex-wrap gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
              >
                {[
                  { icon: Zap, text: "Energy boost", color: "text-[#D26E3D]" },
                  { icon: Heart, text: "Healthy ingredients", color: "text-rose-500" },
                  { icon: Clock, text: "Ready in 5 mins", color: "text-[#597A90]" },
                ].map((pill, i) => (
                  <motion.div
                    key={pill.text}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm cursor-default"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.2 + i * 0.1, type: "spring" as const }}
                    whileHover={{ y: -2, scale: 1.02 }}
                  >
                    <pill.icon className={`h-4 w-4 ${pill.color}`} />
                    <span className="text-sm font-medium">{pill.text}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* CTA Buttons with enhanced hover */}
              <motion.div
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    asChild
                    size="lg"
                    className="px-8 py-6 text-lg shadow-lg shadow-[#D26E3D]/20 hover:shadow-[#D26E3D]/30 transition-all"
                  >
                    <Link to="/order" className="flex items-center gap-2">
                      Order Now
                      <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                      >
                        <ArrowRight className="h-5 w-5" />
                      </motion.div>
                    </Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
            </motion.div>

            {/* Right Content - Featured Drink Card */}
            <motion.div
              initial={{ opacity: 0, x: 50, rotateY: 10 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 0.8, delay: 0.3, type: "spring" as const }}
              className="relative"
              whileHover={{ y: -10 }}
              style={{ perspective: 1000 }}
            >
              <motion.div
                animate={{ rotateY: [0, 2, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" as const }}
              >
                <Card className="relative overflow-hidden border-2 border-[#D26E3D]/20 shadow-2xl hover:shadow-[#D26E3D]/10 transition-all">
                  {/* Animated glow effect */}
                  <motion.div
                    className="absolute -inset-4 bg-gradient-to-br from-[#D26E3D]/20 via-[#EECB65]/20 to-[#597A90]/20 rounded-3xl blur-3xl"
                    animate={{
                      opacity: [0.5, 0.8, 0.5],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" as const }}
                  />

                  <CardContent className="relative space-y-4 p-6">
                    <motion.div
                      className="flex items-center justify-between"
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <motion.div
                        animate={{
                          scale: [1, 1.05, 1],
                          rotate: [0, 2, -2, 0],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Badge variant="glow" className="px-4 py-2 text-sm font-semibold">
                           Featured
                        </Badge>
                      </motion.div>
                      <motion.span
                        className="text-xs text-muted-foreground flex items-center gap-1"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Clock className="h-3 w-3" />
                        Ready in 5 min
                      </motion.span>
                    </motion.div>

                    <motion.div
                      className="aspect-[4/3] w-full overflow-hidden rounded-3xl border-2 border-[#D26E3D]/10 bg-gradient-to-br from-[#FFE7C5] via-white to-[#D7EFEA]"
                      whileHover={{ scale: 1.05, rotate: 2 }}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.6, type: "spring" as const }}
                    >
                      {featured?.image_url ? (
                        <motion.img
                          src={featured.image_url}
                          alt={featured.name}
                          className="h-full w-full object-contain drop-shadow-lg"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ duration: 0.4 }}
                        />
                      ) : (
                        <motion.div
                          className="h-full w-full flex items-center justify-center"
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" as const }}
                        >
                          <div className="text-center">
                            <motion.div
                              className="text-6xl mb-2"
                              animate={{ y: [0, -10, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              Signature
                            </motion.div>
                            <p className="text-sm text-gray-600">Signature Blend</p>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>

                    <motion.div
                      className="flex items-start justify-between gap-3"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      <div>
                        <motion.div
                          className="text-xl font-bold"
                          whileHover={{ x: 5, color: "#D26E3D" }}
                          transition={{ duration: 0.2 }}
                        >
                          {featured?.name || "Signature Berry Oat Shake"}
                        </motion.div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {featured?.description ||
                            "Balanced flavor with fiber, protein, and clean energy to keep you going."}
                        </p>
                      </div>
                      <motion.div
                        className="flex flex-col items-end gap-2"
                        whileHover={{ scale: 1.1 }}
                      >
                        <Badge className="px-3 py-1 text-base font-semibold">
                          {featured ? formatPHP(featured.price_php ?? 0) : formatPHP(200)}
                        </Badge>
                      </motion.div>
                    </motion.div>

                    <motion.div
                      className="grid grid-cols-4 gap-2 text-center text-xs"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                    >
                      <AnimatedMiniStat label="Kcal" value="~350" delay={0} />
                      <AnimatedMiniStat label="Protein" value="~25g" delay={0.1} />
                      <AnimatedMiniStat label="Carbs" value="~40g" delay={0.2} />
                      <AnimatedMiniStat label="Fat" value="~8g" delay={0.3} />
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Enhanced Scroll indicator */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400"
        >
          <motion.span
            className="text-xs"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Scroll to explore
          </motion.span>
          <motion.div
            animate={{ y: [0, 12, 0] }}
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
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, type: "spring" as const }}
            className="mb-10"
          >
            <div className="flex items-center justify-between mb-4">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring" as const, stiffness: 200 }}
                >
                  <Badge variant="secondary" className="mb-2">Menu</Badge>
                </motion.div>
                <h2 className="text-3xl md:text-4xl font-bold">
                  <AnimatedText text="Popular blends" />
                </h2>
                <p className="text-gray-600 mt-2 max-w-xl">
                  Our most loved protein shakes, crafted for taste and nutrition.
                </p>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button asChild variant="outline" size="lg" className="group">
                  <Link to="/menu" className="flex items-center gap-2">
                    View all drinks
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </motion.div>
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
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <p className="text-gray-500">No drinks available yet. Check back soon!</p>
            </motion.div>
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
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1, type: "spring" as const }}
                  whileHover={{ y: -10 }}
                >
                  <MiniDrinkCard drink={d} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gradient-to-br from-[#597A90] to-[#D26E3D] py-20 text-white relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white/5"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" as const }}
          />
          <motion.div
            className="absolute bottom-10 right-10 w-60 h-60 rounded-full bg-white/5"
            animate={{
              scale: [1, 1.3, 1],
              x: [0, -30, 0],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" as const }}
          />
        </div>

        <div className="mx-auto max-w-7xl px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, type: "spring" as const }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              whileInView={{ scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring" as const, stiffness: 150 }}
            >
              <Badge className="mb-4 bg-white/20 text-white border-white/30">
                Why DailyMacros?
              </Badge>
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <AnimatedText text="Built for your lifestyle" />
            </h2>
            <motion.p
              className="max-w-2xl mx-auto text-white/90 text-lg"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              We make healthy eating easy with transparent nutrition info and fast ordering.
            </motion.p>
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
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15, type: "spring" as const }}
                whileHover={{
                  y: -10,
                  scale: 1.02,
                  backgroundColor: "rgba(255,255,255,0.25)",
                }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center transition-all cursor-default"
              >
                <motion.div
                  className="flex justify-center mb-4"
                  whileHover={{ rotate: 360, scale: 1.2 }}
                  transition={{ duration: 0.6, type: "spring" as const }}
                >
                  {feature.icon}
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-white/80 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 bg-[#FFFDF8] overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br from-[#D26E3D]/5 to-transparent"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" as const }}
          />
          <motion.div
            className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-gradient-to-br from-[#597A90]/5 to-transparent"
            animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" as const }}
          />
        </div>

        <div className="mx-auto max-w-4xl px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, type: "spring" as const }}
          >
            <motion.div
              className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#D26E3D]/20 to-[#597A90]/20 mx-auto mb-6"
              initial={{ scale: 0, rotate: -180 }}
              whileInView={{ scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring" as const, stiffness: 150, delay: 0.2 }}
              whileHover={{ scale: 1.1, rotate: 10 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" as const }}
              >
                <Sparkles className="h-10 w-10 text-[#D26E3D]" />
              </motion.div>
            </motion.div>
            <motion.h2
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <AnimatedText text="Ready to power your day?" />
            </motion.h2>
            <motion.p
              className="text-lg text-gray-600 mb-8 max-w-xl mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              Join <AnimatedCounter value={1000} suffix="+" /> customers who have transformed their nutrition with DailyMacros.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  asChild
                  size="lg"
                  className="px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  <Link to="/order" className="flex items-center gap-2">
                    Order Your First Shake
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </motion.div>
                  </Link>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        className="border-t border-gray-200 bg-white py-8"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <motion.div
              className="flex items-center gap-2 text-sm text-gray-600"
              initial={{ x: -20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
            >
              <span>(c) {new Date().getFullYear()} DailyMacros</span>
              <span className="hidden md:inline">-</span>
              <span className="hidden md:inline">Designed for nutrition, built for performance.</span>
            </motion.div>
            <motion.div
              className="flex gap-6 text-sm text-gray-500"
              initial={{ x: 20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
            >
              {["Menu", "Order", "Cart"].map((item) => (
                <motion.div
                  key={item}
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring" as const, stiffness: 300 }}
                >
                  <Link
                    to={`/${item.toLowerCase()}`}
                    className="hover:text-[#D26E3D] transition-colors"
                  >
                    {item}
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.footer>
      </div>
    </MotionConfig>
  );
}

function MiniDrinkCard({ drink }: { drink: Drink }) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: "spring" as const, stiffness: 300 }}
    >
      <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#D26E3D]/20 h-full">
        <CardContent className="space-y-4 p-6">
          <motion.div
            className="aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-gray-100 bg-gradient-to-br from-[#FFE7C5] via-white to-[#D7EFEA]"
            whileHover={{ scale: 1.08, rotate: 2 }}
            transition={{ duration: 0.4, type: "spring" as const }}
          >
            {drink.image_url ? (
              <motion.img
                src={drink.image_url}
                alt={drink.name}
                loading="lazy"
                className="h-full w-full object-contain drop-shadow-md"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <motion.div
                className="h-full w-full flex items-center justify-center"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" as const }}
              >
                <div className="text-center">
                  <motion.div
                    className="text-4xl mb-1"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Signature
                  </motion.div>
                  <p className="text-xs text-gray-600">Custom Blend</p>
                </div>
              </motion.div>
            )}
          </motion.div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <motion.div
                className="text-lg font-bold group-hover:text-[#D26E3D] transition-colors"
                whileHover={{ x: 3 }}
              >
                {drink.name}
              </motion.div>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {drink.description || "Signature protein blend."}
              </p>
            </div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring" as const, stiffness: 400 }}
            >
              <Badge className="px-3 py-1 text-base font-semibold">
                {formatPHP(drink.price_php ?? 0)}
              </Badge>
            </motion.div>
          </div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              asChild
              variant="secondary"
              className="w-full group-hover:bg-[#D26E3D] group-hover:text-white transition-all duration-300"
            >
              <Link to="/menu" className="flex items-center justify-center gap-2">
                View details
                <motion.div
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                  className="group-hover:animate-none"
                >
                  <ChevronRight className="h-4 w-4" />
                </motion.div>
              </Link>
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AnimatedMiniStat({ label, value, delay = 0 }: { label: string; value: string; delay?: number }) {
  return (
    <motion.div
      className="rounded-xl border bg-white/80 py-2 shadow-sm hover:shadow-md transition-all cursor-default"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, type: "spring" as const, stiffness: 200 }}
      whileHover={{ y: -2, scale: 1.05 }}
    >
      <div className="text-[10px] uppercase tracking-wide text-gray-600 font-medium">
        {label}
      </div>
      <motion.div
        className="mt-0.5 text-sm font-bold text-gray-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.2 }}
      >
        {value}
      </motion.div>
    </motion.div>
  );
}
