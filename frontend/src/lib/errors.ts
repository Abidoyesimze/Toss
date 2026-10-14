import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

const messages: Record<string, string> = {
  KeyAlreadyUsed: "This link was already used.",
  AmountTooSmall: "Amount is below the minimum.",
  InvalidExpiry: "Expiry must be between 1 hour and 30 days.",
  NoDeposit: "This link has already been claimed or refunded.",
  Expired: "This link has expired. The sender can take the money back.",
  DeadlinePassed: "The claim took too long. Please try again.",
  FeeTooHigh: "The relayer fee is above the allowed maximum.",
  InvalidRecipient: "That recipient address isn't valid.",
  InvalidSignature: "This link is invalid.",
  NotSender: "Only the sender can refund this link.",
};

export function friendlyError(err: unknown): string {
  if (err instanceof Error && (err.name === "ProviderNotFoundError" || err.name === "ConnectorNotFoundError")) {
    return "No wallet found on this device.";
  }
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name && messages[name]) return messages[name];
    }
    if (err.walk((e) => e instanceof UserRejectedRequestError)) return "Cancelled in your wallet.";
    return err.shortMessage;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}

export const errorMessageFor = (name: string) => messages[name];
