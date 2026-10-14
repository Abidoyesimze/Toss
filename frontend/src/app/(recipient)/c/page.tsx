import type { Metadata } from "next";
import { ClaimCard } from "@/components/toss/ClaimCard";

// Link previews (WhatsApp, iMessage) show this; it reveals nothing about the amount or key.
export const metadata: Metadata = {
  title: "You've got money · Toss",
  description: "Tap to claim your USDC. No app needed.",
};

export default function ClaimPage() {
  return <ClaimCard />;
}
