import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
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
  actions?: React.ReactNode;
}

export function JobCard({ job, showTrackLink, actions }: JobCardProps) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-mono text-slate-400">{job.id.slice(0, 8)}</p>
          <Badge status={job.status} className="mt-1" />
        </div>
        {showTrackLink && (
          <Link
            href={`/track/${job.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            Track
          </Link>
        )}
      </div>
      <div className="space-y-1 text-sm">
        <p>
          <span className="text-slate-500">From:</span> {job.pickupAddress}
        </p>
        <p>
          <span className="text-slate-500">To:</span> {job.dropoffAddress}
        </p>
        {job.customerName && (
          <p>
            <span className="text-slate-500">Customer:</span> {job.customerName}
          </p>
        )}
        {job.driverName && (
          <p>
            <span className="text-slate-500">Driver:</span> {job.driverName}
            {job.plateNumber && ` (${job.plateNumber})`}
          </p>
        )}
        {job.eta && (
          <p>
            <span className="text-slate-500">ETA:</span>{" "}
            {new Date(job.eta).toLocaleString()}
          </p>
        )}
      </div>
      {actions && <div className="pt-2 border-t border-slate-100">{actions}</div>}
    </Card>
  );
}
