type BadgeColor = "primary" | "success" | "error" | "info" | "muted";

const COLOR_CLASS: Record<BadgeColor, string> = {
  primary: "text-primary",
  success: "text-success",
  error:   "text-error",
  info:    "text-info",
  muted:   "text-muted",
};

interface BadgeProps {
  label: string;
  color?: BadgeColor;
  className?: string;
}

export function Badge({ label, color = "primary", className = "" }: BadgeProps) {
  return (
    <span
      className={`rounded bg-elevated px-2 py-0.5 text-center text-sm font-bold ${COLOR_CLASS[color]} ${className}`}
    >
      {label}
    </span>
  );
}
