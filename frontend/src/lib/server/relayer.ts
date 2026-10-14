import "server-only";
import { createPublicClient, createWalletClient, http, isHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { chain, rpcUrl, TOSS_ADDRESS } from "../chain";
import { tossAbi } from "../abi";

// Gas budget for one claim, with headroom (the Foundry tests measure about 150k).
const CLAIM_GAS = 250_000n;
// 18-decimal native USDC (gas) -> 6-decimal ERC-20 USDC (fee).
const NATIVE_TO_ERC20 = 10n ** 12n;
export const DEADLINE_SECONDS = 600;

export const serverPublicClient = createPublicClient({ chain, transport: http(rpcUrl) });

let walletClient: ReturnType<typeof makeWalletClient> | null = null;

function makeWalletClient(pk: Hex) {
  return createWalletClient({ account: privateKeyToAccount(pk), chain, transport: http(rpcUrl) });
}

export function relayerClient() {
  if (walletClient) return walletClient;
  const pk = process.env.RELAYER_PK;
  if (!pk || !isHex(pk) || pk.length !== 66) throw new Error("RELAYER_PK is not configured");
  walletClient = makeWalletClient(pk);
  return walletClient;
}

/** Fee in 6-decimal USDC that covers gas with a 1.5x buffer, capped at the contract's maxFee. */
export async function quoteFee(): Promise<bigint> {
  const [gasPrice, maxFee] = await Promise.all([
    serverPublicClient.getGasPrice(),
    serverPublicClient.readContract({ address: TOSS_ADDRESS, abi: tossAbi, functionName: "maxFee" }),
  ]);
  const costNative = (CLAIM_GAS * gasPrice * 3n) / 2n;
  const fee = (costNative + NATIVE_TO_ERC20 - 1n) / NATIVE_TO_ERC20;
  return fee > maxFee ? maxFee : fee;
}

// Best-effort, per-instance limits. Enough for a single server; use a shared store if scaled out.
const inFlight = new Set<string>();
const hits = new Map<string, number[]>();

export function rateLimited(ip: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > limit;
}

export function lockKey(claimKey: string) {
  const k = claimKey.toLowerCase();
  if (inFlight.has(k)) return false;
  inFlight.add(k);
  return true;
}

export function unlockKey(claimKey: string) {
  inFlight.delete(claimKey.toLowerCase());
}
