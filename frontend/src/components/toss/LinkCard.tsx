"use client";

import { motion } from "framer-motion";
import { Check, Copy, MessageCircle, MessageSquare, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatUsd } from "@/lib/format";
import { tick } from "@/lib/haptics";

/** Link preview that never shows the full key on screen (screenshots get shared too). */
function preview(link: string) {
  const url = new URL(link);
  const key = new URLSearchParams(url.hash.slice(1)).get("k") ?? "";
  return `${url.host}/c#${key.slice(2, 6)}…${key.slice(-4)}`;
}

export function LinkCard({ link, amount }: { link: string; amount: bigint }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator.share === "function"), []);

  const message = `I sent you ${formatUsd(amount)} with Toss. Tap to claim it: ${link}`;
  const enc = encodeURIComponent(message);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      tick();
      setCopied(true);
      toast("success", "Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("error", "Couldn't copy. Long-press the link to copy it.");
    }
  }

  async function share() {
    try {
      await navigator.share({ text: message });
    } catch {
      // dismissed
    }
  }

  const shareItems = [
    { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${enc}` },
    { label: "Messages", icon: MessageSquare, href: `sms:?&body=${enc}` },
    { label: "Copy", icon: copied ? Check : Copy, onClick: copy },
    ...(canShare ? [{ label: "More", icon: Share, onClick: share }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[16px] border border-dashed border-border bg-surface p-5">
        <p className="text-[13px] text-secondary">Your link</p>
        <p className="mt-1 truncate font-mono text-[15px] text-primary">{preview(link)}</p>
      </div>

      <Button onClick={copy}>
        {copied ? <Check className="size-5" strokeWidth={2} /> : <Copy className="size-5" strokeWidth={2} />}
        {copied ? "Copied" : "Copy link"}
      </Button>

      <div className={`grid gap-2 ${shareItems.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
        {shareItems.map(({ label, icon: Icon, href, onClick }) => {
          const inner = (
            <>
              <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-primary transition-colors group-hover:bg-border">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <span className="text-[12px] text-secondary">{label}</span>
            </>
          );
          const cls = "group flex flex-col items-center gap-2 py-1";
          return href ? (
            <motion.a key={label} whileTap={{ scale: 0.96 }} href={href} target="_blank" rel="noreferrer noopener" className={cls}>
              {inner}
            </motion.a>
          ) : (
            <motion.button key={label} whileTap={{ scale: 0.96 }} onClick={onClick} className={cls}>
              {inner}
            </motion.button>
          );
        })}
      </div>

      <p className="text-center text-[13px] leading-5 text-tertiary">
        Anyone with this link can claim it — like cash in an envelope.
        <br />
        Only send it to the person it&apos;s for.
      </p>
    </div>
  );
}
