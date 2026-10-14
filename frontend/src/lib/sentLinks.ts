import type { Address, Hex } from "viem";
import { readStore, writeStore } from "./storage";

// Links this browser created, so the sender can re-copy or refund them.
export type SentLink = {
  claimKey: Address;
  privateKey: Hex;
  sender: Address;
  amount: string; // base units
  expiry: string; // unix seconds
  createdAt: number;
};

const KEY = "toss.sent";

export function loadSentLinks(): SentLink[] {
  try {
    return JSON.parse(readStore("local", KEY) ?? "[]") as SentLink[];
  } catch {
    return [];
  }
}

export function saveSentLink(link: SentLink) {
  writeStore("local", KEY, JSON.stringify([link, ...loadSentLinks()]));
}

// The contract can't tell "claimed" from "refunded" without scanning logs; remember our own refunds.
const REFUNDED = "toss.refunded";

export function loadRefunded(): Set<string> {
  try {
    return new Set(JSON.parse(readStore("local", REFUNDED) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function markRefunded(claimKey: string) {
  const set = loadRefunded();
  set.add(claimKey.toLowerCase());
  writeStore("local", REFUNDED, JSON.stringify([...set]));
}
