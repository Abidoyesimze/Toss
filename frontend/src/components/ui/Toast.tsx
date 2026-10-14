"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Toast = { id: number; tone: "success" | "error"; message: string };

const ToastContext = createContext<(tone: Toast["tone"], message: string) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((tone: Toast["tone"], message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), tone, message });
    timer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[max(24px,env(safe-area-inset-bottom))]"
      >
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex max-w-[388px] items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-3 text-[14px] font-medium shadow-[var(--shadow-elevated)]"
            >
              {toast.tone === "success" ? (
                <Check className="size-5 shrink-0 text-success" strokeWidth={2} />
              ) : (
                <AlertCircle className="size-5 shrink-0 text-danger" strokeWidth={2} />
              )}
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
