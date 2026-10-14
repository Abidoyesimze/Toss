import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http, isHex, type Hex } from "viem";
import { chain, rpcUrl } from "./chain";
import { readStore, writeStore } from "./storage";
import { emitWalletChanged } from "./walletEvents";

const KEY = "toss.wallet.pk";
const BACKED_UP = "toss.wallet.backedUp";

export function loadLocalKey(): Hex | null {
  const pk = readStore("local", KEY);
  return pk && isHex(pk) && pk.length === 66 ? pk : null;
}

/** Returns the browser wallet's key, creating one if needed. Null if storage is unavailable. */
export function getOrCreateLocalKey(): Hex | null {
  const existing = loadLocalKey();
  if (existing) return existing;
  const pk = generatePrivateKey();
  if (!writeStore("local", KEY, pk)) return null;
  emitWalletChanged();
  return pk;
}

export function saveLocalKey(pk: Hex) {
  const ok = writeStore("local", KEY, pk);
  if (ok) emitWalletChanged();
  return ok;
}

export const isBackedUp = () => readStore("local", BACKED_UP) === "1";
export const markBackedUp = () => writeStore("local", BACKED_UP, "1");

export function localWalletClient(pk: Hex) {
  return createWalletClient({ account: privateKeyToAccount(pk), chain, transport: http(rpcUrl) });
}
