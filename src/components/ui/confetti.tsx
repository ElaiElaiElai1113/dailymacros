import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

/**
 * Trigger confetti celebration
 *
 * @param options - Confetti options
 */
export function triggerConfetti(options?: {
  particleCount?: number;
  spread?: number;
  origin?: { x: number; y: number };
  colors?: string[];
  scalar?: number;
}) {
  const defaults = {
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#D26E3D", "#597A90", "#FFD700", "#FF6B6B", "#4ECDC4"],
    scalar: 1.2,
  };

  confetti({
    ...defaults,
    ...options,
  });
}

/**
 * Trigger celebration with multiple bursts
 */
export function triggerCelebration() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  const randomInRange = (min: number, max: number) =>
    Math.random() * (max - min) + min;

  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Since particles fall down, start a bit higher than random
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ["#D26E3D", "#597A90"],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ["#FFD700", "#FF6B6B"],
    });
  }, 250);
}

/**
 * Trigger success confetti (top center burst)
 */
export function triggerSuccessConfetti() {
  const end = Date.now() + 1000;
  const colors = ["#D26E3D", "#FFD700", "#4ECDC4"];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());
}

/**
 * Trigger side cannon effect
 */
export function triggerCannon() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
  };

  function fire(particleRatio: number, opts: any) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
      colors: ["#D26E3D", "#597A90", "#FFD700"],
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });

  fire(0.2, {
    spread: 60,
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}

/**
 * React hook to trigger confetti on mount
 */
export function useConfetti(trigger: boolean, type: "success" | "celebration" | "cannon" = "success") {
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (trigger && !hasTriggered.current) {
      hasTriggered.current = true;

      switch (type) {
        case "success":
          triggerSuccessConfetti();
          break;
        case "celebration":
          triggerCelebration();
          break;
        case "cannon":
          triggerCannon();
          break;
      }
    }
  }, [trigger, type]);
}

/**
 * Confetti button component
 */
export function ConfettiButton({
  children,
  onConfetti,
  className = "",
}: {
  children: React.ReactNode;
  onConfetti?: () => void;
  className?: string;
}) {
  const handleClick = () => {
    triggerSuccessConfetti();
    onConfetti?.();
  };

  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
