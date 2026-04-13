import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-lg border bg-[var(--bg-input)] px-3 py-2 text-sm",
            "text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]",
            "border-[var(--border-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]",
            "transition-colors duration-150",
            error && "border-[var(--risk-critical)] focus:border-[var(--risk-critical)] focus:ring-[var(--risk-critical)]",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs" style={{ color: "var(--risk-critical)" }}>{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
