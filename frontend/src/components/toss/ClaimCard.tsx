"use client";

import { ArrowUpRight, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isAddress, type Address, type Hex } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { useConnect } from "wagmi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { chain, explorerTx } from "@/lib/chain";
import { friendlyError } from "@/lib/errors";
import { formatDate, formatUsd, shortAddr } from "@/lib/format";
import { tick } from "@/lib/haptics";
import { parseClaimFragment } from "@/lib/link";
import { getOrCreateLocalKey, isBackedUp, loadLocalKey } from "@/lib/localWallet";
import { readStore, writeStore } from "@/lib/storage";
import { claimViaRelayer, getDeposit, usdcBalance, type DepositState } from "@/lib/toss";
import { SendSheet } from "./SendSheet";
import { SuccessCheck } from "./SuccessState";

const SESSION_KEY = "toss.claim.pk";

type View =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "offline" }
  | DepositState
  | { kind: "claimed"; received: bigint; hash: Hex; toToss: boolean; to: Address };

export function ClaimCard() {
  const toast = useToast();
  const [linkKey, setLinkKey] = useState<Hex | null>(null);
  const [view, setView] = useState<View>({ kind: "loading" });
  const [hasTossWallet, setHasTossWallet] = useState(false);
  const [busy, setBusy] = useState<"new" | "existing" | null>(null);
  const [existingOpen, setExistingOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [sendOpen, setSendOpen] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const { connectAsync, connectors } = useConnect();

  // Take the key from the fragment, keep it for this tab only, and strip it from the address bar.
  // Nothing happens until the recipient taps, so link scanners and previews can't move funds.
  useEffect(() => {
    const fromHash = parseClaimFragment(location.hash);
    if (fromHash) {
      writeStore("session", SESSION_KEY, fromHash);
      history.replaceState(null, "", location.pathname);
    }
    const key = fromHash ?? (readStore("session", SESSION_KEY) as Hex | null);
    setHasTossWallet(!!loadLocalKey());
    if (!key) return setView({ kind: "invalid" });
    setLinkKey(key);
    getDeposit(privateKeyToAddress(key))
      .then(setView)
      .catch(() => setView({ kind: "offline" }));
  }, []);

  async function claimTo(recipient: Address, toToss: boolean) {
    if (!linkKey || view.kind !== "pending") return;
    const { received, hash } = await claimViaRelayer(linkKey, recipient, view.amount);
    writeStore("session", SESSION_KEY, null);
    tick(12);
    setView({ kind: "claimed", received, hash, toToss, to: recipient });
  }

  async function claimNew() {
    const pk = getOrCreateLocalKey();
    if (!pk) {
      toast("error", "This browser can't keep a wallet (private mode?). Claim to an existing wallet instead.");
      return;
    }
    setBusy("new");
    try {
      await claimTo(privateKeyToAddress(pk), true);
      setHasTossWallet(true);
      usdcBalance(privateKeyToAddress(pk)).then(setBalance).catch(() => {});
    } catch (err) {
      toast("error", friendlyError(err));
    } finally {
      setBusy(null);
    }
  }

  async function claimExisting() {
    const to = address.trim();
    if (!isAddress(to)) return;
    setBusy("existing");
    try {
      await claimTo(to, false);
      setExistingOpen(false);
    } catch (err) {
      toast("error", friendlyError(err));
    } finally {
      setBusy(null);
    }
  }

  async function useConnectedWallet() {
    const connector = connectors[0];
    if (!connector) return toast("error", "No wallet app found on this device. Paste your address instead.");
    try {
      const { accounts } = await connectAsync({ connector, chainId: chain.id });
      if (accounts[0]) setAddress(accounts[0]);
    } catch (err) {
      toast("error", friendlyError(err));
    }
  }

  return (
    <>
      {view.kind === "loading" && (
        <div key="loading" className="page-enter flex flex-col items-center gap-4 pt-16" aria-busy>
          <div className="h-4 w-24 animate-pulse rounded-full bg-surface-2" />
          <div className="h-14 w-48 animate-pulse rounded-[14px] bg-surface-2" />
        </div>
      )}

      {view.kind === "pending" && (
        <div key="pending" className="page-enter screen flex flex-col pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-[15px] text-secondary">You received</p>
            <p className="tabular text-[56px] font-semibold leading-none tracking-[-0.03em]">{formatUsd(view.amount)}</p>
            <p className="text-[14px] text-tertiary">from {shortAddr(view.sender)}</p>
          </div>
          <div className="space-y-2">
            <Button onClick={claimNew} loading={busy === "new"} disabled={!!busy}>
              {busy === "new"
                ? hasTossWallet
                  ? "Claiming"
                  : "Creating your wallet"
                : hasTossWallet
                  ? "Claim to my Toss wallet"
                  : "Claim to new wallet"}
            </Button>
            <Button variant="text" onClick={() => setExistingOpen(true)} disabled={!!busy}>
              Claim to existing wallet
            </Button>
            <p className="pt-2 text-center text-[13px] text-tertiary">
              Money returns to sender if unclaimed by {formatDate(view.expiry)}
            </p>
          </div>

          <Sheet open={existingOpen} onClose={() => setExistingOpen(false)} title="Claim to existing wallet">
            <div className="space-y-4">
              <Input
                name="address"
                label="Your wallet address"
                placeholder="0x…"
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-[14px]"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                error={address && !isAddress(address.trim()) ? "That doesn't look like a wallet address" : null}
              />
              <Button onClick={claimExisting} loading={busy === "existing"} disabled={!isAddress(address.trim()) || !!busy}>
                Claim {formatUsd(view.amount)}
              </Button>
              <Button variant="text" onClick={useConnectedWallet}>
                Use my browser wallet
              </Button>
              <p className="text-center text-[13px] text-tertiary">Any EVM wallet address works. Funds arrive on Arc.</p>
            </div>
          </Sheet>
        </div>
      )}

      {view.kind === "claimed" && (
        <div key="claimed" className="page-enter screen flex flex-col pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <SuccessCheck size={72} />
            <h1 className="pt-2 text-[28px]">Claimed</h1>
            <p className="tabular text-[40px] font-semibold leading-none tracking-[-0.03em]">{formatUsd(view.received)}</p>
            <p className="text-[15px] text-secondary">
              {view.toToss ? "Your USDC is ready" : `Sent to ${shortAddr(view.to)} on Arc`}
            </p>
          </div>
          <div className="space-y-2">
            {view.toToss && !isBackedUp() && (
              <Link
                href="/wallet"
                className="mb-2 flex items-center gap-3 rounded-[16px] bg-warning-muted px-4 py-3 text-[14px] text-warning"
              >
                <ShieldAlert className="size-5 shrink-0" strokeWidth={1.75} />
                <span className="flex-1">This wallet lives in this browser. Back it up so you don&apos;t lose it.</span>
              </Link>
            )}
            {view.toToss ? (
              <Button onClick={() => setSendOpen(true)}>Send or spend</Button>
            ) : (
              <Link
                href="/"
                className="flex h-14 w-full items-center justify-center rounded-[14px] bg-accent text-[17px] font-semibold text-accent-fg hover:bg-accent-hover"
              >
                Create your own Toss
              </Link>
            )}
            {explorerTx(view.hash) && (
              <a
                href={explorerTx(view.hash)}
                target="_blank"
                rel="noreferrer noopener"
                className="flex h-11 items-center justify-center gap-1 text-[15px] font-medium text-secondary hover:text-primary"
              >
                View on explorer <ArrowUpRight className="size-4" strokeWidth={1.75} />
              </a>
            )}
          </div>
          {view.toToss && loadLocalKey() && (
            <SendSheet
              open={sendOpen}
              onClose={() => setSendOpen(false)}
              pk={loadLocalKey()!}
              balance={balance}
              onSent={() => usdcBalance(view.to).then(setBalance).catch(() => {})}
            />
          )}
        </div>
      )}

      {(view.kind === "gone" || view.kind === "expired" || view.kind === "invalid" || view.kind === "unfunded" || view.kind === "offline") && (
        <div key="state" className="page-enter screen flex flex-col pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 text-center">
            <h1 className="text-[24px]">{stateCopy[view.kind].title}</h1>
            <p className="max-w-[300px] text-[15px] leading-6 text-secondary">{stateCopy[view.kind].body}</p>
          </div>
          {view.kind === "offline" ? (
            <Button onClick={() => location.reload()}>Try again</Button>
          ) : (
            <Link
              href="/"
              className="flex h-14 w-full items-center justify-center rounded-[14px] bg-accent text-[17px] font-semibold text-accent-fg hover:bg-accent-hover"
            >
              Create your own Toss
            </Link>
          )}
        </div>
      )}
    </>
  );
}

const stateCopy = {
  gone: { title: "Already claimed", body: "This money has already been claimed or taken back by the sender." },
  expired: { title: "This link expired", body: "It wasn't claimed in time, so the money goes back to the sender. Ask them for a new link." },
  invalid: { title: "This link doesn't work", body: "Part of it may be missing. Ask the sender to share it again." },
  unfunded: { title: "Not ready yet", body: "This link hasn't been funded. If it was just sent, wait a moment and reload." },
  offline: { title: "Can't connect", body: "Check your internet connection and try again." },
} as const;
