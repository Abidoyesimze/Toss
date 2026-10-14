import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { TopBar } from "@/components/ui/TopBar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Toss",
  description: "Send dollars with a link. No app, no seed phrase, no gas token.",
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh">
        <Providers>
          <div className="mx-auto min-h-dvh w-full max-w-[420px] px-4 pt-[env(safe-area-inset-top)] sm:my-8 sm:min-h-[calc(100dvh-64px)] sm:rounded-[28px] sm:border sm:border-border sm:bg-bg sm:px-5 sm:shadow-[var(--shadow-elevated)]">
            <TopBar />
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
