"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { ToastProvider } from "@/components/ui/Toast";
import { wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <ToastProvider>{children}</ToastProvider>
        </MotionConfig>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
