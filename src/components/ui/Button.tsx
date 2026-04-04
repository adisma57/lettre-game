import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT_CLASS: Record<Variant, string> = {
  primary:   "rounded-lg bg-primary px-5 py-2 font-semibold text-white transition-colors hover:bg-primary-dim disabled:cursor-not-allowed disabled:opacity-40",
  secondary: "rounded-lg border border-line bg-elevated px-5 py-2 text-fg transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40",
  ghost:     "text-sm text-muted transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-40",
};

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
  className = "",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${VARIANT_CLASS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
