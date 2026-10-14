"use client";

import { motion } from "framer-motion";

type Option<T extends string> = { value: T; label: string };

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col rounded-[14px] bg-surface-2 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`relative h-10 rounded-[10px] text-[14px] font-medium transition-colors ${active ? "text-primary" : "text-secondary hover:text-primary"}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${label}`}
                className="absolute inset-0 rounded-[10px] bg-surface shadow-[var(--shadow-elevated)]"
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
