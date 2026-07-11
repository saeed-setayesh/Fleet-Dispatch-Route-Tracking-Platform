"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FleetMap } from "@/components/map/FleetMapClient";
import { StatusTimeline } from "@/components/jobs/StatusTimeline";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import {
  useJobNavigation,
  navigationToMapProps,
} from "@/lib/hooks/useJobNavigation";
import Link from "next/link";
import { ArrowLeft, Radio, Clock } from "lucide-react";

interface JobDetail {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  driverName?: string | null;
  plateNumber?: string | null;
  eta?: string | null;
  events: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
    actorName: string | null;
  }[];
}

export default function TrackPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const [jobId, setJobId] = useState("");
  const [job, setJob] = useState<JobDetail | null>(null);
  const { nav } = useJobNavigation(jobId || null);

  useEffect(() => {
    params.then((p) => setJobId(p.jobId));
  }, [params]);

  const fetchJob = useCallback(async () => {
    if (!jobId) return;
    const res = await fetch(`/api/jobs/${jobId}`);
    if (!res.ok) return;
    const data: JobDetail = await res.json();
    setJob(data);

    if (["en_route", "in_progress"].includes(data.status)) {
      await fetch("/api/fleet/locations/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
    const interval = setInterval(fetchJob, 3000);
    return () => clearInterval(interval);
  }, [fetchJob]);

  const mapProps = useMemo(() => {
    if (nav) return navigationToMapProps(nav, job?.driverName ?? "Driver");
    return { markers: [], routes: [] };
  }, [nav, job?.driverName]);

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-20 border-b border-red-950/50 bg-[#0a0808]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-slate-500 hover:text-red-400">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 animate-pulse text-emerald-400" />
              <h1 className="font-bold">Live Tracking</h1>
            </div>
            <p className="font-mono text-[10px] text-slate-500">#{job.id.slice(0, 8)}</p>
          </div>
          <Badge status={job.status} />
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <FleetMap
          markers={mapProps.markers}
          routes={mapProps.routes}
          height="360px"
          fitRoute
        />

        {nav && (
          <div className="flex gap-2">
            <span className="stat-chip flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {Math.round(nav.totalDurationS / 60)} min · {(nav.totalDistanceM / 1000).toFixed(1)} km
            </span>
            <span className="stat-chip">
              {Math.round(nav.progress * 100)}% complete
            </span>
          </div>
        )}

        <Card>
          <div className="space-y-2 text-sm">
            <p><span className="text-slate-500">From · </span>{job.pickupAddress}</p>
            <p><span className="text-slate-500">To · </span>{job.dropoffAddress}</p>
            {job.driverName && (
              <p>
                <span className="text-slate-500">Driver · </span>
                {job.driverName}{job.plateNumber && ` · ${job.plateNumber}`}
              </p>
            )}
            {job.eta && (
              <p>
                <span className="text-slate-500">ETA · </span>
                <span className="text-red-300">{new Date(job.eta).toLocaleString()}</span>
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Status Timeline</CardTitle>
          <StatusTimeline events={job.events} />
        </Card>
      </div>
    </div>
  );
}
