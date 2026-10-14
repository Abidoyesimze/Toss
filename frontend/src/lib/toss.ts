import type { Account, Address, Chain, Hex, Transport, WalletClient } from "viem";
import { generatePrivateKey, privateKeyToAccount, privateKeyToAddress } from "viem/accounts";
import { erc20Abi, tossAbi } from "./abi";
import { chain, TOSS_ADDRESS, USDC_ADDRESS } from "./chain";
import { publicClient } from "./clients";
import { claimDomain, claimTypes } from "./eip712";
import { buildClaimLink } from "./link";
import { localWalletClient } from "./localWallet";
import { saveSentLink } from "./sentLinks";

export type Signer = WalletClient<Transport, Chain | undefined, Account>;

const ZERO = "0x0000000000000000000000000000000000000000";

export type DepositState =
  | { kind: "unfunded" }
  | { kind: "gone" }
  | { kind: "expired"; sender: Address; amount: bigint; expiry: bigint }
  | { kind: "pending"; sender: Address; amount: bigint; expiry: bigint };

export async function getDeposit(claimKey: Address): Promise<DepositState> {
  const [[sender, amount, expiry], used] = await Promise.all([
    publicClient.readContract({ address: TOSS_ADDRESS, abi: tossAbi, functionName: "deposits", args: [claimKey] }),
    publicClient.readContract({ address: TOSS_ADDRESS, abi: tossAbi, functionName: "used", args: [claimKey] }),
  ]);
  if (sender === ZERO) return { kind: used ? "gone" : "unfunded" };
  const now = BigInt(Math.floor(Date.now() / 1000));
  return { kind: now >= expiry ? "expired" : "pending", sender, amount, expiry };
}

export const usdcBalance = (owner: Address) =>
  publicClient.readContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [owner] });

export const minDeposit = () =>
  publicClient.readContract({ address: TOSS_ADDRESS, abi: tossAbi, functionName: "minDeposit" });

/** Approve (if needed) and deposit; returns the shareable link. Saves the link locally before funding. */
export async function createLink(
  signer: Signer,
  amount: bigint,
  expiry: bigint,
  onStep?: (step: "approve" | "deposit" | "confirming") => void,
) {
  const sender = signer.account.address;
  const privateKey = generatePrivateKey();
  const claimKey = privateKeyToAddress(privateKey);

  // Save first: if the tab dies mid-flow, History can still refund it.
  saveSentLink({
    claimKey,
    privateKey,
    sender,
    amount: amount.toString(),
    expiry: expiry.toString(),
    createdAt: Date.now(),
  });

  const allowance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: [sender, TOSS_ADDRESS],
  });
  if (allowance < amount) {
    onStep?.("approve");
    const hash = await signer.writeContract({
      account: signer.account,
      chain,
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [TOSS_ADDRESS, amount],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  onStep?.("deposit");
  const { request } = await publicClient.simulateContract({
    account: signer.account,
    address: TOSS_ADDRESS,
    abi: tossAbi,
    functionName: "deposit",
    args: [claimKey, amount, expiry],
  });
  const hash = await signer.writeContract({ ...request, chain });
  onStep?.("confirming");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("The deposit didn't go through. Your money wasn't sent.");

  return { link: buildClaimLink(location.origin, privateKey), claimKey };
}

/** Sign the claim with the link key and hand it to the relayer. */
export async function claimViaRelayer(linkKey: Hex, recipient: Address, amount: bigint) {
  const claimKey = privateKeyToAddress(linkKey);
  const quoteRes = await fetch("/api/quote", { cache: "no-store" });
  const quote = await quoteRes.json();
  if (!quoteRes.ok) throw new Error(quote.error ?? "We couldn't reach the network. Try again.");
  const fee = BigInt(quote.fee);
  const deadline = BigInt(quote.deadline);
  if (fee >= amount) throw new Error("This amount is too small to cover the network fee.");

  const sig = await privateKeyToAccount(linkKey).signTypedData({
    domain: claimDomain(),
    types: claimTypes,
    primaryType: "Claim",
    message: { claimKey, recipient, fee, deadline },
  });

  const res = await fetch("/api/claim", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ claimKey, recipient, fee: fee.toString(), deadline: Number(deadline), sig }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "The claim didn't go through. Try again.");
  return { hash: body.hash as Hex, received: amount - fee };
}

export async function refundLink(signer: Signer, claimKey: Address) {
  const { request } = await publicClient.simulateContract({
    account: signer.account,
    address: TOSS_ADDRESS,
    abi: tossAbi,
    functionName: "refund",
    args: [claimKey],
  });
  const hash = await signer.writeContract({ ...request, chain });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/** Plain USDC transfer from the browser wallet; gas is paid in USDC from the same balance. */
export async function sendFromLocal(pk: Hex, to: Address, amount: bigint) {
  const hash = await localWalletClient(pk).writeContract({
    chain,
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, amount],
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("The transfer didn't go through.");
  return hash;
}

// Gas is paid from the same USDC balance; keep a little back when sending everything.
export const GAS_RESERVE = 10_000n; // $0.01
