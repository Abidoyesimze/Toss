export type PillTone = "accent" | "neutral" | "warning" | "danger";

const tones: Record<PillTone, string> = {
  accent: "bg-accent-muted text-accent",
  neutral: "bg-surface-2 text-secondary",
  warning: "bg-warning-muted text-warning",
  danger: "bg-danger-muted text-danger",
};

export function StatusPill({ tone, children }: { tone: PillTone; children: string }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-md px-2 text-[12px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
