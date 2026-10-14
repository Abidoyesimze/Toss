"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

type Props = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: "primary" | "secondary" | "text";
  loading?: boolean;
  children: ReactNode;
};

const styles = {
  primary:
    "h-14 w-full rounded-[14px] bg-accent text-[17px] font-semibold text-accent-fg hover:bg-accent-hover active:bg-accent-pressed",
  secondary:
    "h-14 w-full rounded-[14px] border border-border bg-transparent text-[17px] font-semibold text-primary hover:bg-surface-2",
  text: "h-11 w-full rounded-[14px] text-[15px] font-medium text-secondary hover:text-primary hover:underline underline-offset-4",
};

export function Button({ variant = "primary", loading, disabled, className = "", children, ...props }: Props) {
  return (
    <motion.button
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="size-5 animate-spin" strokeWidth={2} aria-hidden />}
      {children}
    </motion.button>
  );
}
