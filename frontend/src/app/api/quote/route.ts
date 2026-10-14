import { NextResponse } from "next/server";
import { DEADLINE_SECONDS, quoteFee } from "@/lib/server/relayer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const fee = await quoteFee();
    const deadline = Math.floor(Date.now() / 1000) + DEADLINE_SECONDS;
    return NextResponse.json({ fee: fee.toString(), deadline });
  } catch (err) {
    console.error("quote failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not get a fee quote right now." }, { status: 503 });
  }
}
