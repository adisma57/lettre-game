import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  accent?: boolean;
  className?: string;
}

export function Card({ children, accent = false, className = "" }: CardProps) {
  const border = accent ? "border-primary" : "border-line";
  return (
    <div className={`rounded-xl border ${border} bg-surface p-6 ${className}`}>
      {children}
    </div>
  );
}
