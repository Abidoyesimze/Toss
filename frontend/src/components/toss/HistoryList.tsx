"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { privateKeyToAddress } from "viem/accounts";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { StatusPill, type PillTone } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { browserSigner } from "@/lib/browserSigner";
import { friendlyError } from "@/lib/errors";
import { formatDate, formatUsd, relativeTime, shortAddr } from "@/lib/format";
import { buildClaimLink } from "@/lib/link";
import { loadLocalKey, localWalletClient } from "@/lib/localWallet";
import { loadRefunded, loadSentLinks, markRefunded, type SentLink } from "@/lib/sentLinks";
import { getDeposit, refundLink, type Signer } from "@/lib/toss";

type Status = "Pending" | "Expired" | "Claimed" | "Reclaimed" | "Unfunded" | "…";

const tone: Record<Status, PillTone> = {
  Pending: "accent",
  Expired: "warning",
  Claimed: "neutral",
  Reclaimed: "neutral",
  Unfunded: "danger",
  "…": "neutral",
};

export function HistoryList() {
  const toast = useToast();
  const [links, setLinks] = useState<SentLink[] | null>(null);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [selected, setSelected] = useState<SentLink | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (list: SentLink[]) => {
    const refunded = loadRefunded();
    const entries = await Promise.all(
      list.map(async (l): Promise<[string, Status]> => {
        try {
          const d = await getDeposit(l.claimKey);
          if (d.kind === "pending") return [l.claimKey, "Pending"];
          if (d.kind === "expired") return [l.claimKey, "Expired"];
          if (d.kind === "unfunded") return [l.claimKey, "Unfunded"];
          return [l.claimKey, refunded.has(l.claimKey.toLowerCase()) ? "Reclaimed" : "Claimed"];
        } catch {
          return [l.claimKey, "…"];
        }
      }),
    );
    setStatus(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    const list = loadSentLinks();
    setLinks(list);
    refresh(list);
  }, [refresh]);

  async function signerFor(l: SentLink): Promise<Signer> {
    const local = loadLocalKey();
    if (local && privateKeyToAddress(local) === l.sender) return localWalletClient(local);
    return browserSigner({ expected: l.sender });
  }

  async function reclaim(l: SentLink) {
    setBusy(true);
    try {
      await refundLink(await signerFor(l), l.claimKey);
      markRefunded(l.claimKey);
      toast("success", `${formatUsd(BigInt(l.amount))} is back in your wallet`);
      setSelected(null);
      if (links) await refresh(links);
    } catch (err) {
      toast("error", friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function copy(l: SentLink) {
    try {
      await navigator.clipboard.writeText(buildClaimLink(location.origin, l.privateKey));
      toast("success", "Link copied");
    } catch {
      toast("error", "Couldn't copy the link");
    }
  }

  if (links === null) return null;

  const visible = links.filter((l) => status[l.claimKey] !== "Unfunded");

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 pt-24 text-center">
        <h2 className="text-[20px]">No Tosses yet</h2>
        <p className="text-[15px] text-secondary">Links you create on this device show up here.</p>
        <Link href="/" className="pt-2 text-[15px] font-medium text-accent hover:text-accent-hover">
          Create a link
        </Link>
      </div>
    );
  }

  const s = selected ? (status[selected.claimKey] ?? "…") : null;

  return (
    <>
      <ul className="divide-y divide-border overflow-hidden rounded-[16px] border border-border bg-surface">
        {visible.map((l, i) => {
          const st = status[l.claimKey] ?? "…";
          return (
            <motion.li
              key={l.claimKey}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.03, ease: "easeOut" }}
            >
              <button
                onClick={() => setSelected(l)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-2"
              >
                <span className="flex-1">
                  <span className="tabular block text-[17px] font-semibold">{formatUsd(BigInt(l.amount))}</span>
                  <span className="block text-[13px] text-tertiary">{relativeTime(l.createdAt)}</span>
                </span>
                <StatusPill tone={tone[st]}>{st}</StatusPill>
                <ChevronRight className="size-5 text-tertiary" strokeWidth={1.75} />
              </button>
            </motion.li>
          );
        })}
      </ul>

      <Sheet open={!!selected} onClose={() => setSelected(null)} title="Toss details">
        {selected && s && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="tabular text-[32px] font-semibold tracking-[-0.03em]">
                {formatUsd(BigInt(selected.amount))}
              </span>
              <StatusPill tone={tone[s]}>{s}</StatusPill>
            </div>
            <dl className="space-y-2 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-secondary">Created</dt>
                <dd>{new Date(selected.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary">{s === "Expired" ? "Expired" : "Expires"}</dt>
                <dd>{formatDate(BigInt(selected.expiry))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary">From</dt>
                <dd className="font-mono">{shortAddr(selected.sender)}</dd>
              </div>
            </dl>
            {(s === "Pending" || s === "Expired") && (
              <div className="space-y-2">
                <Button onClick={() => reclaim(selected)} loading={busy}>
                  Take it back
                </Button>
                {s === "Pending" && (
                  <Button variant="text" onClick={() => copy(selected)}>
                    Copy link again
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
