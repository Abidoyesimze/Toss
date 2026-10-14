import type { Address } from "viem";
import { connect, getAccount, getWalletClient, switchChain } from "wagmi/actions";
import { chain } from "./chain";
import { shortAddr } from "./format";
import type { Signer } from "./toss";
import { wagmiConfig } from "./wagmi";

export type ConnectorKind = "injected" | "walletConnect";

/** Connect an external wallet if needed (extension or WalletConnect), move it to Arc, and return a signer. */
export async function browserSigner(opts: { expected?: Address; via?: ConnectorKind } = {}): Promise<Signer> {
  let account = getAccount(wagmiConfig);
  if (!account.isConnected) {
    const connector = wagmiConfig.connectors.find((c) => c.type === (opts.via ?? "injected"));
    if (!connector) throw new Error("No wallet found on this device.");
    await connect(wagmiConfig, { connector, chainId: chain.id });
    account = getAccount(wagmiConfig);
  }
  if (opts.expected && account.address?.toLowerCase() !== opts.expected.toLowerCase()) {
    throw new Error(`Switch to the wallet that sent this (${shortAddr(opts.expected)}).`);
  }
  if (account.chainId !== chain.id) await switchChain(wagmiConfig, { chainId: chain.id });
  return (await getWalletClient(wagmiConfig, { chainId: chain.id })) as Signer;
}
