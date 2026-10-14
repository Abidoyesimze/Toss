"use client";

import { useState } from "react";
import { isAddress, type Address, type Hex } from "viem";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { friendlyError } from "@/lib/errors";
import { formatUsd, parseUsdc } from "@/lib/format";
import { GAS_RESERVE, sendFromLocal } from "@/lib/toss";
import Link from "next/link";

export function SendSheet({
  open,
  onClose,
  pk,
  balance,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  pk: Hex;
  balance: bigint | null;
  onSent: () => void;
}) {
  const toast = useToast();
  const [to, setTo] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [busy, setBusy] = useState(false);

  const max = balance !== null && balance > GAS_RESERVE ? balance - GAS_RESERVE : 0n;
  const amount = parseUsdc(amountInput);
  const toError = to && !isAddress(to.trim()) ? "That doesn't look like a wallet address" : null;
  const amountError = amount !== null && amount > max ? `You can send up to ${formatUsd(max)}` : null;

  async function send() {
    if (!amount || toError || amountError || !isAddress(to.trim())) return;
    setBusy(true);
    try {
      await sendFromLocal(pk, to.trim() as Address, amount);
      toast("success", `Sent ${formatUsd(amount)}`);
      setAmountInput("");
      onSent();
      onClose();
    } catch (err) {
      toast("error", friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Send or spend">
      <div className="space-y-4">
        <Input
          name="to"
          label="To"
          placeholder="Wallet address (0x…)"
          autoComplete="off"
          spellCheck={false}
          className="font-mono text-[14px]"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          error={toError}
        />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="send-amount" className="text-[13px] font-medium text-secondary">
              Amount
            </label>
            <button
              onClick={() => setAmountInput((Number(max) / 1e6).toFixed(6).replace(/\.?0+$/, ""))}
              className="text-[13px] font-medium text-accent hover:text-accent-hover"
            >
              Max {formatUsd(max)}
            </button>
          </div>
          <Input
            id="send-amount"
            inputMode="decimal"
            placeholder="$0.00"
            className="tabular"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value.replace(",", "."))}
            error={amountError}
          />
        </div>
        <Button onClick={send} loading={busy} disabled={!amount || !to || !!toError || !!amountError}>
          {busy ? "Sending" : "Send"}
        </Button>
        <p className="text-center text-[13px] text-tertiary">
          Network fees are paid in USDC — no other token needed.{" "}
          <Link href="/?from=toss" className="text-secondary underline-offset-4 hover:underline" onClick={onClose}>
            Send as a link instead
          </Link>
        </p>
      </div>
    </Sheet>
  );
}
