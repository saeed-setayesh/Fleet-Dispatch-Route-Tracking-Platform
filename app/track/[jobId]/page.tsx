"use client";

import { useCallback, useEffect, useState } from "react";
import { FleetMap, type FleetMarker, type RouteLine } from "@/components/map/FleetMapClient";
import { StatusTimeline } from "@/components/jobs/StatusTimeline";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface JobDetail {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  driverName?: string | null;
  plateNumber?: string | null;
  eta?: string | null;
  polyline: { lat: number; lng: number }[];
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
  const [jobId, setJobId] = useState<string>("");
  const [job, setJob] = useState<JobDetail | null>(null);
  const [driverMarker, setDriverMarker] = useState<FleetMarker | null>(null);

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

    const fleetRes = await fetch("/api/fleet/locations");
    const fleet = await fleetRes.json();
    if (data.driverName) {
      const driver = fleet.find(
        (d: { name: string }) => d.name === data.driverName
      );
      if (driver) {
        setDriverMarker({
          id: driver.driverId,
          lat: driver.lat,
          lng: driver.lng,
          label: driver.name,
          status: driver.status,
          vehicleType: driver.vehicleType,
        });
      }
    }
  }, [jobId]);

  useEffect(() => {
    fetchJob();
    const interval = setInterval(fetchJob, 3000);
    return () => clearInterval(interval);
  }, [fetchJob]);

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        {jobId ? "Loading tracking..." : "..."}
      </div>
    );
  }

  const markers: FleetMarker[] = [
    {
      id: "pickup",
      lat: job.polyline[0]?.lat ?? 51.0447,
      lng: job.polyline[0]?.lng ?? -114.0719,
      label: "Pickup",
    },
    ...(driverMarker ? [driverMarker] : []),
  ];

  const routes: RouteLine[] = job.polyline.length
    ? [{ id: job.id, points: job.polyline, color: "#2563eb" }]
    : [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href="/" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-bold">Live Tracking</h1>
            <p className="text-xs text-slate-500 font-mono">{job.id.slice(0, 8)}</p>
          </div>
          <Badge status={job.status} className="ml-auto" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <FleetMap markers={markers} routes={routes} height="320px" zoom={11} />

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-sm">
          <p>
            <span className="text-slate-500">From:</span> {job.pickupAddress}
          </p>
          <p>
            <span className="text-slate-500">To:</span> {job.dropoffAddress}
          </p>
          {job.driverName && (
            <p>
              <span className="text-slate-500">Driver:</span> {job.driverName}
              {job.plateNumber && ` · ${job.plateNumber}`}
            </p>
          )}
          {job.eta && (
            <p>
              <span className="text-slate-500">ETA:</span>{" "}
              {new Date(job.eta).toLocaleString()}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-4 font-semibold">Status Timeline</h2>
          <StatusTimeline events={job.events} />
        </div>
      </div>
    </div>
  );
}
