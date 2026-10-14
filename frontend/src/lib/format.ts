import { formatUnits, parseUnits } from "viem";
import { USDC_DECIMALS } from "./chain";

/** "$42.00", "$24.9925". Truncates (never rounds up) beyond 4 decimals so we never overstate a balance. */
export function formatUsd(v: bigint) {
  const [whole, frac = ""] = formatUnits(v, USDC_DECIMALS).split(".");
  const trimmed = frac.slice(0, 4).replace(/0+$/, "").padEnd(2, "0");
  return `$${Number(whole).toLocaleString("en-US")}.${trimmed}`;
}

/** Backwards-compatible plain number, e.g. for sentences that already say "USDC". */
export const formatUsdc = (v: bigint) => formatUsd(v).slice(1);

export function parseUsdc(input: string): bigint | null {
  const s = input.trim();
  if (!/^\d+(\.\d{0,6})?$/.test(s)) return null;
  return parseUnits(s, USDC_DECIMALS);
}

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function formatDate(unixSeconds: bigint) {
  return new Date(Number(unixSeconds) * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const rtf = typeof Intl !== "undefined" ? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }) : null;

export function relativeTime(ms: number) {
  const diff = (ms - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf?.format(Math.round(diff / secs), unit) ?? "";
  }
  return "just now";
}
