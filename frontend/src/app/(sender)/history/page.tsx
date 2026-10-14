import type { Metadata } from "next";
import { HistoryList } from "@/components/toss/HistoryList";

export const metadata: Metadata = { title: "History · Toss" };

export default function HistoryPage() {
  return (
    <div className="space-y-5 pt-2">
      <h1 className="text-[28px]">History</h1>
      <HistoryList />
    </div>
  );
}
