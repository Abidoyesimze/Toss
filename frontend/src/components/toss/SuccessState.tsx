"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

const PARTICLES = [
  { x: -34, y: -26 },
  { x: 36, y: -22 },
  { x: -40, y: 12 },
  { x: 42, y: 16 },
  { x: -12, y: -40 },
  { x: 16, y: 38 },
];

/** Soft check with a few tiny dots. The only place a spring overshoot is allowed. */
export function SuccessCheck({ size = 64 }: { size?: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      {!reduce &&
        PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute size-1.5 rounded-full bg-accent"
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0], x: p.x, y: p.y, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 + i * 0.03, ease: "easeOut" }}
          />
        ))}
      <motion.div
        className="grid place-items-center rounded-full bg-accent-muted"
        style={{ width: size, height: size }}
        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 18 }}
      >
        <Check className="text-accent" style={{ width: size * 0.45, height: size * 0.45 }} strokeWidth={2.25} />
      </motion.div>
    </div>
  );
}
