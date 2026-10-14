"use client";

import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { tick } from "@/lib/haptics";

/** Massive centered amount with a fixed "$" and a locked USDC badge. */
export function AmountInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const size = value.length > 9 ? "text-[40px]" : value.length > 6 ? "text-[48px]" : "text-[56px]";

  return (
    <div className="flex flex-col items-center gap-3 py-6" onClick={() => ref.current?.focus()}>
      <motion.div
        animate={{ scale: focused ? 1.02 : 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`tabular flex items-baseline justify-center font-semibold tracking-[-0.03em] ${size}`}
      >
        <span className={value ? "text-primary" : "text-tertiary"}>$</span>
        {/* The invisible mirror sizes the field to its content so "$" stays snug against the number. */}
        <span className="relative inline-grid grid-cols-[min-content]">
          <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre">
            {value || "0"}
          </span>
          <input
          ref={ref}
          autoFocus
          inputMode="decimal"
          autoComplete="off"
          aria-label="Amount in US dollars"
          placeholder="0"
          size={1}
          value={value}
          onFocus={(e) => {
            setFocused(true);
            tick();
            const el = e.currentTarget;
            requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
          }}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const v = e.target.value.replace(",", ".");
            if (v === "" || /^\d{0,9}(\.\d{0,6})?$/.test(v)) onChange(v);
          }}
          className="tabular col-start-1 row-start-1 w-full min-w-0 bg-transparent p-0 text-primary caret-accent outline-none placeholder:text-tertiary focus-visible:outline-none"
        />
        </span>
      </motion.div>
      <span className="inline-flex h-6 items-center rounded-full bg-surface-2 px-2.5 text-[12px] font-medium text-secondary">
        USDC
      </span>
    </div>
  );
}

const CHIPS = ["5", "10", "25", "50", "100"];

export function AmountChips({ value, onPick }: { value: string; onPick: (v: string) => void }) {
  return (
    <div className="flex justify-center gap-2">
      {CHIPS.map((c) => {
        const active = value === c;
        return (
          <motion.button
            key={c}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              tick();
              onPick(c);
            }}
            className={`tabular h-9 min-w-12 rounded-full border px-3 text-[14px] font-medium transition-colors ${
              active
                ? "border-accent bg-accent-muted text-accent"
                : "border-border text-secondary hover:border-tertiary hover:text-primary"
            }`}
          >
            ${c}
          </motion.button>
        );
      })}
    </div>
  );
}
