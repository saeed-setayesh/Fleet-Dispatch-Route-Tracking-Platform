import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { MapPin, ArrowRight, ExternalLink } from "lucide-react";
import type { JobStatus } from "@/lib/db/schema";

interface JobCardProps {
  job: {
    id: string;
    status: JobStatus;
    pickupAddress: string;
    dropoffAddress: string;
    customerName?: string | null;
    driverName?: string | null;
    plateNumber?: string | null;
    eta?: Date | string | null;
    createdAt?: Date | string;
  };
  showTrackLink?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  actions?: React.ReactNode;
}

export function JobCard({
  job,
  showTrackLink,
  selected,
  onSelect,
  actions,
}: JobCardProps) {
  return (
    <Card
      glow={selected}
      onClick={onSelect}
      className={`space-y-3 transition-all ${onSelect ? "cursor-pointer hover:border-red-500/30" : ""} ${selected ? "ring-1 ring-red-500/50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            #{job.id.slice(0, 8)}
          </p>
          <Badge status={job.status} className="mt-1.5" />
        </div>
        {showTrackLink && (
          <Link
            href={`/track/${job.id}`}
            className="flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-300"
            onClick={(e) => e.stopPropagation()}
          >
            Track <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2 rounded-lg bg-slate-900/50 p-2.5">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span className="text-slate-300">{job.pickupAddress}</span>
        </div>
        <div className="flex justify-center">
          <ArrowRight className="h-4 w-4 text-slate-600" />
        </div>
        <div className="flex items-start gap-2 rounded-lg bg-slate-900/50 p-2.5">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <span className="text-slate-300">{job.dropoffAddress}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
        {job.customerName && (
          <div>
            <span className="text-slate-600">Customer</span>
            <p className="font-medium text-slate-300">{job.customerName}</p>
          </div>
        )}
        {job.driverName && (
          <div>
            <span className="text-slate-600">Driver</span>
            <p className="font-medium text-slate-300">
              {job.driverName}
              {job.plateNumber && (
                <span className="text-slate-500"> · {job.plateNumber}</span>
              )}
            </p>
          </div>
        )}
        {job.eta && (
          <div className="col-span-2">
            <span className="text-slate-600">ETA </span>
            <span className="font-medium text-red-300">
              {new Date(job.eta).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {actions && (
        <div className="border-t border-slate-800/80 pt-3">{actions}</div>
      )}
    </Card>
  );
}
