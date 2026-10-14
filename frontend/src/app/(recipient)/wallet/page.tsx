import type { Metadata } from "next";
import { WalletView } from "@/components/toss/WalletView";

export const metadata: Metadata = { title: "Wallet · Toss" };

export default function WalletPage() {
  return <WalletView />;
}
