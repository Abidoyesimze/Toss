"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { privateKeyToAddress } from "viem/accounts";
import { erc20Abi } from "@/lib/abi";
import { chain, USDC_ADDRESS } from "@/lib/chain";
import { publicClient } from "@/lib/clients";
import { formatUsd } from "@/lib/format";
import { loadLocalKey } from "@/lib/localWallet";
import { onWalletChanged } from "@/lib/walletEvents";

export function TopBar() {
  const pathname = usePathname();
  const [hasWallet, setHasWallet] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);

  // Re-read on every route change and whenever a wallet is created, claimed into or spent from.
  useEffect(() => {
    const refresh = () => {
      const pk = loadLocalKey();
      setHasWallet(!!pk);
      if (!pk) return setBalance(null);
      publicClient
        .readContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [privateKeyToAddress(pk)] })
        .then(setBalance)
        .catch(() => {});
    };
    refresh();
    return onWalletChanged(refresh);
  }, [pathname]);

  return (
    <header className="flex h-16 items-center justify-between">
      <Link href="/" className="text-[20px] font-semibold tracking-[-0.03em]">
        toss
      </Link>
      <div className="flex items-center gap-2">
        {hasWallet && (
          <Link
            href="/wallet"
            aria-label="Your Toss wallet"
            className="tabular inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-[13px] font-medium text-primary hover:bg-border"
          >
            <Wallet className="size-4 text-secondary" strokeWidth={1.75} />
            {balance === null ? "Wallet" : formatUsd(balance)}
          </Link>
        )}
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[12px] font-medium text-secondary">
          <span className="size-1.5 rounded-full bg-success" aria-hidden />
          {chain.name}
        </span>
      </div>
    </header>
  );
}
