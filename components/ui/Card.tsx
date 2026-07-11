import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  glow,
  onClick,
}: {
  className?: string;
  children: React.ReactNode;
  glow?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "glass-panel rounded-2xl p-4",
        glow && "border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.1)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  subtitle,
}: {
  className?: string;
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className={cn("mb-3", className)}>
      <h3 className="text-base font-bold tracking-tight text-red-50">
        {children}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}
