import { forwardRef, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string | null };

export const Input = forwardRef<HTMLInputElement, Props>(function Input({ label, error, className = "", id, ...props }, ref) {
  const inputId = id ?? props.name;
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-[13px] font-medium text-secondary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`h-14 w-full rounded-[16px] border bg-surface-2 px-4 text-[16px] text-primary outline-none transition-colors placeholder:text-tertiary focus:border-accent ${error ? "border-danger" : "border-border"} ${className}`}
        aria-invalid={!!error || undefined}
        {...props}
      />
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
});
