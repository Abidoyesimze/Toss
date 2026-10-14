"use client";

import { Copy, Eye, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { isHex, type Hex } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { formatUsd, shortAddr } from "@/lib/format";
import { getOrCreateLocalKey, isBackedUp, loadLocalKey, markBackedUp, saveLocalKey } from "@/lib/localWallet";
import { GAS_RESERVE, minDeposit, usdcBalance } from "@/lib/toss";
import { AddMoneySheet } from "./AddMoneySheet";
import { SendSheet } from "./SendSheet";

export function WalletView() {
  const toast = useToast();
  const [pk, setPk] = useState<Hex | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [backedUp, setBackedUp] = useState(true);
  const [backupOpen, setBackupOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [restore, setRestore] = useState("");
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [minimum, setMinimum] = useState(1_000_000n);

  useEffect(() => {
    const k = loadLocalKey();
    setPk(k);
    setBackedUp(isBackedUp());
    setLoaded(true);
    if (k && new URLSearchParams(location.search).get("add") === "1") setAddOpen(true);
    minDeposit().then(setMinimum).catch(() => {});
  }, []);

  const address = pk ? privateKeyToAddress(pk) : null;
  // A link needs the contract minimum plus a little USDC for gas.
  const canLink = balance !== null && balance >= minimum + GAS_RESERVE;

  const refresh = useCallback(() => {
    if (address) usdcBalance(address).then(setBalance).catch(() => {});
  }, [address]);
  useEffect(refresh, [refresh]);
  const onReceived = useCallback((b: bigint) => setBalance(b), []);

  function onCreateWallet() {
    const k = getOrCreateLocalKey();
    if (!k) return toast("error", "This browser can't keep a wallet (private mode?)");
    setPk(k);
    setBackedUp(isBackedUp());
    setBalance(0n);
    setAddOpen(true);
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast("success", `${what} copied`);
    } catch {
      toast("error", "Couldn't copy");
    }
  }

  function onRestore() {
    const k = restore.trim();
    if (!isHex(k) || k.length !== 66) return toast("error", "That isn't a valid backup key");
    if (!saveLocalKey(k)) return toast("error", "This browser can't keep a wallet");
    markBackedUp();
    setPk(k);
    setBackedUp(true);
    setRestore("");
    setRestoreOpen(false);
    toast("success", "Wallet restored");
  }

  if (!loaded) return null;

  if (!pk || !address) {
    return (
      <div className="screen flex flex-col pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 text-center">
          <h1 className="text-[28px]">Your Toss wallet</h1>
          <p className="max-w-[300px] text-[15px] leading-6 text-secondary">
            Hold USDC and send it as a link, right in this browser. No app, no seed phrase, no gas token.
          </p>
        </div>
        <div className="space-y-2">
          <Button onClick={onCreateWallet}>Create wallet</Button>
          <Button variant="text" onClick={() => setRestoreOpen(true)}>
            Restore from backup key
          </Button>
        </div>
        <Sheet open={restoreOpen} onClose={() => setRestoreOpen(false)} title="Restore wallet">
          <div className="space-y-4">
            <Input
              name="restore"
              label="Backup key"
              placeholder="0x…"
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-[14px]"
              value={restore}
              onChange={(e) => setRestore(e.target.value)}
            />
            <Button onClick={onRestore} disabled={!restore}>
              Restore
            </Button>
          </div>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="screen flex flex-col pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-[15px] text-secondary">Balance</p>
        <p className="tabular text-[56px] font-semibold leading-none tracking-[-0.03em]">
          {balance === null ? "—" : formatUsd(balance)}
        </p>
        <button
          onClick={() => copy(address, "Address")}
          className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3 font-mono text-[13px] text-secondary hover:text-primary"
        >
          {shortAddr(address)}
          <Copy className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => setBackupOpen(true)}
          className={`flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-[14px] ${
            backedUp ? "border border-border text-secondary hover:bg-surface-2" : "bg-warning-muted text-warning"
          }`}
        >
          {backedUp ? (
            <ShieldCheck className="size-5 shrink-0 text-success" strokeWidth={1.75} />
          ) : (
            <ShieldAlert className="size-5 shrink-0" strokeWidth={1.75} />
          )}
          <span className="flex-1">
            {backedUp ? "Backed up" : "Back up this wallet. It only lives in this browser."}
          </span>
        </button>
        {balance ? (
          <>
            <Button onClick={() => setSendOpen(true)}>Send or spend</Button>
            <div className="grid grid-cols-2">
              <Button variant="text" onClick={() => setAddOpen(true)}>
                Add money
              </Button>
              {canLink ? (
                <Link
                  href="/?from=toss"
                  className="flex h-11 items-center justify-center text-[15px] font-medium text-secondary underline-offset-4 hover:text-primary hover:underline"
                >
                  Send as a link
                </Link>
              ) : (
                <span className="flex h-11 items-center justify-center text-[13px] text-tertiary">Links start at $1</span>
              )}
            </div>
            {!canLink && (
              <p className="text-center text-[13px] text-tertiary">
                Under $1? Use Send or spend to move it straight to any wallet address.
              </p>
            )}
          </>
        ) : (
          <Button onClick={() => setAddOpen(true)}>Add money</Button>
        )}
      </div>

      <AddMoneySheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        address={address}
        backedUp={backedUp}
        onBackup={() => {
          setAddOpen(false);
          setBackupOpen(true);
        }}
        onReceived={onReceived}
      />

      <SendSheet open={sendOpen} onClose={() => setSendOpen(false)} pk={pk} balance={balance} onSent={refresh} />

      <Sheet
        open={backupOpen}
        onClose={() => {
          setBackupOpen(false);
          setRevealed(false);
        }}
        title="Back up your wallet"
      >
        <div className="space-y-4">
          <p className="text-[15px] leading-6 text-secondary">
            This key is your wallet. Save it somewhere private, like a password manager. Anyone who has it can spend
            your money, and without it you can&apos;t recover the wallet if this browser&apos;s data is cleared.
          </p>
          {revealed ? (
            <>
              <div className="break-all rounded-[16px] border border-dashed border-border bg-surface-2 p-4 font-mono text-[13px] leading-5">
                {pk}
              </div>
              <Button variant="secondary" onClick={() => copy(pk, "Backup key")}>
                <Copy className="size-5" strokeWidth={1.75} /> Copy key
              </Button>
              <Button
                onClick={() => {
                  markBackedUp();
                  setBackedUp(true);
                  setBackupOpen(false);
                  setRevealed(false);
                  toast("success", "Wallet backed up");
                }}
              >
                I saved it
              </Button>
            </>
          ) : (
            <Button onClick={() => setRevealed(true)}>
              <Eye className="size-5" strokeWidth={1.75} /> Show backup key
            </Button>
          )}
          <p className="text-center text-[13px] text-tertiary">
            Prefer not to? Use “Send or spend” to move everything to a wallet you already have.
          </p>
        </div>
      </Sheet>
    </div>
  );
}
