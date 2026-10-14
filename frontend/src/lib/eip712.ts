import type { Address } from "viem";
import { chain, TOSS_ADDRESS } from "./chain";

export const claimDomain = () =>
  ({ name: "Toss", version: "1", chainId: chain.id, verifyingContract: TOSS_ADDRESS }) as const;

export const claimTypes = {
  Claim: [
    { name: "claimKey", type: "address" },
    { name: "recipient", type: "address" },
    { name: "fee", type: "uint96" },
    { name: "deadline", type: "uint64" },
  ],
} as const;

export type ClaimMessage = {
  claimKey: Address;
  recipient: Address;
  fee: bigint;
  deadline: bigint;
};
