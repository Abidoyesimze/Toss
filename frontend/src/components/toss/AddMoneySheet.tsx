"use client";

import { Copy, ShieldAlert } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { formatUsd } from "@/lib/format";
import { tick } from "@/lib/haptics";
import { usdcBalance } from "@/lib/toss";

/** Receive screen for the Toss wallet: QR + address, and a toast when money lands. */
export function AddMoneySheet({
  open,
  onClose,
  address,
  backedUp,
  onBackup,
  onReceived,
}: {
  open: boolean;
  onClose: () => void;
  address: Address;
  backedUp: boolean;
  onBackup: () => void;
  onReceived: (balance: bigint) => void;
}) {
  const toast = useToast();
  const [qr, setQr] = useState<string | null>(null);
  const last = useRef<bigint | null>(null);

  useEffect(() => {
    // Dark modules on white with a quiet zone scan reliably in both themes.
    QRCode.toDataURL(address, { margin: 2, width: 480, color: { dark: "#0a0b0d", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [address]);

  // Watch for incoming funds while the sheet is open (Arc finality is sub-second).
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const poll = async () => {
      try {
        const b = await usdcBalance(address);
        if (!alive) return;
        if (last.current !== null && b > last.current) {
          tick(12);
          toast("success", `Received ${formatUsd(b - last.current)}`);
          onReceived(b);
        }
        last.current = b;
      } catch {
        // keep polling
      }
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [open, address, toast, onReceived]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      tick();
      toast("success", "Address copied");
    } catch {
      toast("error", "Couldn't copy");
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add money">
      <div className="space-y-4">
        {!backedUp && (
          <button
            onClick={onBackup}
            className="flex w-full items-center gap-3 rounded-[16px] bg-warning-muted px-4 py-3 text-left text-[14px] text-warning"
          >
            <ShieldAlert className="size-5 shrink-0" strokeWidth={1.75} />
            <span className="flex-1">Back up this wallet first. It only lives in this browser.</span>
          </button>
        )}

        <div className="mx-auto w-fit rounded-[16px] bg-white p-3">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code of your Toss wallet address" width={200} height={200} className="size-[200px]" />
          ) : (
            <div className="size-[200px] animate-pulse rounded-[8px] bg-neutral-200" />
          )}
        </div>

        <button
          onClick={copy}
          className="flex w-full items-center gap-3 rounded-[16px] border border-dashed border-border bg-surface-2 px-4 py-3 text-left"
        >
          <span className="flex-1 break-all font-mono text-[13px] leading-5">{address}</span>
          <Copy className="size-5 shrink-0 text-secondary" strokeWidth={1.75} />
        </button>

        <div className="rounded-[16px] border border-border px-4 py-3 text-[14px] leading-6 text-secondary">
          Send <span className="font-medium text-primary">USDC on the Arc network</span> to this address. USDC sent
          on another network (Ethereum, Base, Solana…) won&apos;t arrive here.
        </div>

        <Button onClick={copy}>
          <Copy className="size-5" strokeWidth={2} /> Copy address
        </Button>
        <p className="text-center text-[13px] text-tertiary">This page updates when your money arrives.</p>
      </div>
    </Sheet>
  );
}
