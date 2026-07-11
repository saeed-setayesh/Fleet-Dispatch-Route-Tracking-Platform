import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  requested: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  assigned: "bg-red-500/20 text-red-300 border-red-500/35",
  en_route: "bg-rose-500/20 text-rose-300 border-rose-500/35",
  in_progress: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-slate-600/20 text-slate-400 border-slate-600/30",
};

export function Badge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        STATUS_STYLES[status] ?? STATUS_STYLES.requested,
        className
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
