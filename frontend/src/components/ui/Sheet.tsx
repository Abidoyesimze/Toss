"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

/** Bottom sheet on mobile (drag down to dismiss), centered modal on desktop. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const desktop = useIsDesktop();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-black/50 sm:backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative max-h-[92dvh] w-full max-w-[420px] overflow-y-auto overscroll-contain rounded-t-[24px] border border-border bg-surface px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 shadow-[var(--shadow-elevated)] sm:mx-4 sm:rounded-[20px] sm:px-5 sm:pb-5 sm:pt-5"
            initial={desktop ? { opacity: 0, scale: 0.98 } : { y: "100%" }}
            animate={desktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={desktop ? { opacity: 0, scale: 0.98 } : { y: "100%" }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            drag={desktop ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) onClose();
            }}
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border sm:hidden" />
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[19px]">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="-mr-2 grid size-10 place-items-center rounded-full text-secondary hover:bg-surface-2 hover:text-primary"
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
