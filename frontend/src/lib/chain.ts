import { defineChain, type Address, type Chain } from "viem";
import { anvil } from "viem/chains";

export const arc = defineChain({
  id: 5042,
  name: "Arc",
  // Native USDC is reported with 18 decimals; the ERC-20 interface uses 6.
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.arc.io"] } },
  blockExplorers: { default: { name: "Arc Explorer", url: "https://explorer.arc.io" } },
});

const useLocal = process.env.NEXT_PUBLIC_CHAIN === "local";

export const chain: Chain = useLocal ? anvil : arc;

export const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ?? chain.rpcUrls.default.http[0];

export const TOSS_ADDRESS = (process.env.NEXT_PUBLIC_TOSS_ADDRESS ?? "") as Address;

export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  "0x3600000000000000000000000000000000000000") as Address;

export const USDC_DECIMALS = 6;

export function explorerTx(hash: string) {
  const url = chain.blockExplorers?.default.url;
  return url ? `${url}/tx/${hash}` : undefined;
}
