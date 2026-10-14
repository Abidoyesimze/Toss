"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Address, Hex } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { browserSigner, type ConnectorKind } from "@/lib/browserSigner";
import { friendlyError } from "@/lib/errors";
import { formatDate, formatUsd, parseUsdc, shortAddr } from "@/lib/format";
import { getOrCreateLocalKey, isBackedUp, loadLocalKey, localWalletClient } from "@/lib/localWallet";
import { hasInjectedWallet, wcProjectId } from "@/lib/wagmi";
import { createLink, GAS_RESERVE, minDeposit, usdcBalance, type Signer } from "@/lib/toss";
import { AddMoneySheet } from "./AddMoneySheet";
import { AmountChips, AmountInput } from "./AmountInput";
import { LinkCard } from "./LinkCard";
import { SuccessCheck } from "./SuccessState";

type ExpiryChoice = "1h" | "24h" | "7d" | "custom";
type Source = "toss" | ConnectorKind;

// The contract accepts 1 hour to 30 days; stay a few minutes inside both bounds for clock drift.
const EXPIRY_SECONDS: Record<Exclude<ExpiryChoice, "custom">, number> = {
  "1h": 3_600 + 300,
  "24h": 86_400,
  "7d": 7 * 86_400,
};
const MAX_CUSTOM_DAYS = 29;

const stepLabel = {
  approve: "Approve in your wallet",
  deposit: "Confirm in your wallet",
  confirming: "Creating link",
} as const;

export function CreateForm() {
  const toast = useToast();
  const [amountInput, setAmountInput] = useState("");
  const [expiry, setExpiry] = useState<ExpiryChoice>("24h");
  const [customDays, setCustomDays] = useState("3");
  const [customOpen, setCustomOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [source, setSource] = useState<Source>("toss");
  const [injectedAvailable, setInjectedAvailable] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [localKey, setLocalKey] = useState<Hex | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [minimum, setMinimum] = useState<bigint | null>(null);
  const [step, setStep] = useState<keyof typeof stepLabel | null>(null);
  const [created, setCreated] = useState<{ link: string; amount: bigint; expiry: bigint } | null>(null);

  const { address: browserAddress, isConnected } = useAccount();
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const k = loadLocalKey();
    setLocalKey(k);
    const injectedNow = hasInjectedWallet();
    setInjectedAvailable(injectedNow);
    // Phones rarely have a wallet extension: default to the Toss wallet unless one is present.
    const fromToss = new URLSearchParams(location.search).get("from") === "toss";
    setSource(fromToss || !injectedNow ? "toss" : "injected");
    minDeposit().then(setMinimum).catch(() => {});
  }, []);

  const senderAddress: Address | undefined =
    source === "toss" ? (localKey ? privateKeyToAddress(localKey) : undefined) : browserAddress;

  useEffect(() => {
    setBalance(null);
    if (senderAddress) usdcBalance(senderAddress).then(setBalance).catch(() => {});
  }, [senderAddress, created]);

  const amount = parseUsdc(amountInput);
  const error = useMemo(() => {
    if (!amount) return null;
    if (minimum !== null && amount < minimum) return `Minimum is ${formatUsd(minimum)}`;
    if (balance !== null && amount > balance) return "That's more than your balance";
    // On Arc, gas is paid in USDC from the same balance (approve + deposit), so keep a little back.
    if (balance !== null && amount + GAS_RESERVE > balance) {
      const max = balance > GAS_RESERVE ? balance - GAS_RESERVE : 0n;
      return `Leave about $0.01 for network fees (max ${formatUsd(max)})`;
    }
    return null;
  }, [amount, minimum, balance]);

  const days = Number(customDays);
  const customValid = Number.isInteger(days) && days >= 1 && days <= MAX_CUSTOM_DAYS;
  const expirySeconds = expiry === "custom" ? days * 86_400 : EXPIRY_SECONDS[expiry];

  async function connect() {
    setConnecting(true);
    try {
      await browserSigner({ via: source === "toss" ? "injected" : source });
    } catch (err) {
      toast("error", friendlyError(err));
    } finally {
      setConnecting(false);
    }
  }

  async function signer(): Promise<Signer> {
    if (source === "toss") {
      if (!localKey) throw new Error("No Toss wallet on this device.");
      return localWalletClient(localKey);
    }
    return browserSigner({ via: source });
  }

  async function onCreate() {
    if (!amount || error) return;
    try {
      const s = await signer();
      const exp = BigInt(Math.floor(Date.now() / 1000) + expirySeconds);
      const { link } = await createLink(s, amount, exp, setStep);
      setCreated({ link, amount, expiry: exp });
    } catch (err) {
      toast("error", friendlyError(err));
      // Gas may have been spent (e.g. on approve) even though the deposit failed.
      if (senderAddress) usdcBalance(senderAddress).then(setBalance).catch(() => {});
    } finally {
      setStep(null);
    }
  }

  if (created) {
    return (
      <motion.div
        key="created"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="space-y-6 pt-4"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <SuccessCheck />
          <h1 className="text-[24px]">Link ready</h1>
          <p className="tabular text-[40px] font-semibold tracking-[-0.03em]">{formatUsd(created.amount)}</p>
          <p className="text-[14px] text-secondary">Returns to you if unclaimed by {formatDate(created.expiry)}</p>
        </div>
        <LinkCard link={created.link} amount={created.amount} />
        <Button
          variant="text"
          onClick={() => {
            setCreated(null);
            setAmountInput("");
          }}
        >
          Send another
        </Button>
      </motion.div>
    );
  }

  const needsConnect = source !== "toss" && !isConnected;
  const needsTossWallet = source === "toss" && !localKey;
  const needsFunds = source === "toss" && !!localKey && balance === 0n;

  function setupTossWallet() {
    const k = getOrCreateLocalKey();
    if (!k) return toast("error", "This browser can't keep a wallet (private mode?)");
    setLocalKey(k);
    setAddOpen(true);
  }

  const sourceOptions: { id: Source; title: string; detail: string }[] = [
    {
      id: "toss",
      title: "Toss wallet",
      detail: localKey ? "Lives in this browser" : "Create one here — no app needed",
    },
    ...(injectedAvailable
      ? [{ id: "injected" as const, title: "Browser wallet", detail: browserAddress ? shortAddr(browserAddress) : "MetaMask, Rabby, Coinbase Wallet…" }]
      : []),
    ...(wcProjectId
      ? [{ id: "walletConnect" as const, title: "Wallet app", detail: "MetaMask, Rainbow, Trust & more" }]
      : []),
  ];

  return (
    <div className="screen flex flex-col pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="flex-1 space-y-6">
        <AmountInput value={amountInput} onChange={setAmountInput} />
        <AmountChips value={amountInput} onPick={setAmountInput} />
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-[14px] text-danger"
            >
              {error}
              {source === "toss" && localKey && balance !== null && amount !== null && amount + GAS_RESERVE > balance && (
                <>
                  {" · "}
                  <button onClick={() => setAddOpen(true)} className="font-medium text-accent hover:text-accent-hover">
                    Add money
                  </button>
                </>
              )}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="space-y-3 pt-2">
          <p className="text-[13px] font-medium text-secondary">Expires in</p>
          <Segmented
            label="Expires in"
            value={expiry}
            onChange={(v) => {
              setExpiry(v);
              if (v === "custom") setCustomOpen(true);
            }}
            options={[
              { value: "1h", label: "1h" },
              { value: "24h", label: "24h" },
              { value: "7d", label: "7d" },
              { value: "custom", label: expiry === "custom" && customValid ? `${days}d` : "Custom" },
            ]}
          />
          <p className="text-[13px] text-tertiary">Money returns to you if unclaimed. You can also take it back anytime.</p>
        </div>

        <button
          onClick={() => setSourceOpen(true)}
          className="flex h-14 w-full items-center gap-3 rounded-[16px] border border-border bg-surface px-4 text-left hover:bg-surface-2"
        >
          <Wallet className="size-5 text-secondary" strokeWidth={1.75} />
          <span className="flex-1 text-[15px]">
            {needsTossWallet ? (
              <span className="text-secondary">Toss wallet · not set up yet</span>
            ) : senderAddress ? (
              <>
                <span className="text-secondary">From </span>
                {source === "toss" ? "Toss wallet" : shortAddr(senderAddress)}
                {balance !== null && <span className="tabular text-secondary"> · {formatUsd(balance)}</span>}
              </>
            ) : (
              <span className="text-secondary">Choose a wallet</span>
            )}
          </span>
          <ChevronRight className="size-5 text-tertiary" strokeWidth={1.75} />
        </button>
      </div>

      <div className="space-y-1 pt-6">
        {needsTossWallet ? (
          <Button onClick={setupTossWallet}>Set up Toss wallet</Button>
        ) : needsFunds ? (
          <Button onClick={() => setAddOpen(true)}>Add money</Button>
        ) : needsConnect ? (
          <Button onClick={connect} loading={connecting}>
            Connect wallet
          </Button>
        ) : (
          <Button onClick={onCreate} disabled={!amount || !!error || !senderAddress} loading={!!step}>
            <motion.span
              key={step ?? "idle"}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: step ? [1, 0.6, 1] : 1 }}
              transition={step ? { duration: 1.4, repeat: Infinity } : { duration: 0.15 }}
            >
              {step ? stepLabel[step] : "Create link"}
            </motion.span>
          </Button>
        )}
        <Link href="/history" className="block py-3 text-center text-[14px] text-tertiary hover:text-secondary">
          View history
        </Link>
      </div>

      <Sheet open={customOpen} onClose={() => setCustomOpen(false)} title="Custom expiry">
        <div className="space-y-4">
          <Input
            name="days"
            label="Days until it returns to you"
            inputMode="numeric"
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value.replace(/\D/g, ""))}
            error={customDays && !customValid ? `Choose 1 to ${MAX_CUSTOM_DAYS} days` : null}
          />
          <Button onClick={() => setCustomOpen(false)} disabled={!customValid}>
            Done
          </Button>
        </div>
      </Sheet>

      <Sheet open={sourceOpen} onClose={() => setSourceOpen(false)} title="Pay from">
        <div className="space-y-2">
          {sourceOptions.map((o) => (
            <button
              key={o.id}
              onClick={() => {
                setSource(o.id);
                setSourceOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-[16px] border px-4 py-4 text-left transition-colors disabled:opacity-40 ${
                source === o.id ? "border-accent bg-accent-muted" : "border-border hover:bg-surface-2"
              }`}
            >
              <span>
                <span className="block text-[16px] font-medium">{o.title}</span>
                <span className="block text-[13px] text-secondary">{o.detail}</span>
              </span>
              {source === o.id && <span className="size-2.5 rounded-full bg-accent" aria-hidden />}
            </button>
          ))}
        </div>
      </Sheet>

      {localKey && (
        <AddMoneySheet
          open={addOpen}
          onClose={() => setAddOpen(false)}
          address={privateKeyToAddress(localKey)}
          backedUp={isBackedUp()}
          onBackup={() => (location.href = "/wallet")}
          onReceived={setBalance}
        />
      )}
    </div>
  );
}
