import { cn } from "@/lib/utils";
import { JOB_STATUS_COLORS } from "@/lib/constants";

export function Badge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const color = JOB_STATUS_COLORS[status] ?? "bg-slate-400";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white capitalize",
        color,
        className
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
