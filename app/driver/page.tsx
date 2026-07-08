"use client";

import { signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { FleetMap, type FleetMarker, type RouteLine } from "@/components/map/FleetMapClient";
import { JobCard } from "@/components/jobs/JobCard";
import { Button } from "@/components/ui/Button";
import { getDriverActionLabel } from "@/lib/jobs/state-machine";
import type { JobStatus } from "@/lib/db/schema";
import { LogOut, Navigation } from "lucide-react";

interface Job {
  id: string;
  status: JobStatus;
  pickupAddress: string;
  dropoffAddress: string;
  customerName?: string | null;
  eta?: string | null;
  polyline?: { lat: number; lng: number }[];
}

export default function DriverPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [fleet, setFleet] = useState<FleetMarker[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [jobsRes, fleetRes] = await Promise.all([
      fetch("/api/jobs"),
      fetch("/api/fleet/locations"),
    ]);
    const jobsData: Job[] = await jobsRes.json();

    for (const job of jobsData.filter((j) => ["en_route", "in_progress"].includes(j.status))) {
      await fetch("/api/fleet/locations/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
    }

    const detailed = await Promise.all(
      jobsData.map(async (j) => {
        const detail = await fetch(`/api/jobs/${j.id}`).then((r) => r.json());
        return { ...j, polyline: detail.polyline ?? [] };
      })
    );

    setJobs(detailed);
    const fleetData = await fleetRes.json();
    setFleet(
      fleetData.map(
        (d: {
          driverId: string;
          lat: number;
          lng: number;
          name: string;
          status: string;
          vehicleType: string;
        }) => ({
          id: d.driverId,
          lat: d.lat,
          lng: d.lng,
          label: d.name,
          status: d.status,
          vehicleType: d.vehicleType,
        })
      )
    );

    const active = detailed.find((j) =>
      ["assigned", "en_route", "in_progress"].includes(j.status)
    );
    setActiveJob(active ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function advanceStatus(jobId: string) {
    await fetch(`/api/jobs/${jobId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    fetchData();
  }

  const routes: RouteLine[] = activeJob?.polyline?.length
    ? [{ id: activeJob.id, points: activeJob.polyline, color: "#2563eb" }]
    : [];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading driver app...
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-600" /> Driver
            </h1>
            <p className="text-xs text-slate-500">Mobile dispatch view</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <FleetMap markers={fleet} routes={routes} height="280px" zoom={12} />

        {activeJob && getDriverActionLabel(activeJob.status) && (
          <Button
            className="w-full"
            size="lg"
            variant="success"
            onClick={() => advanceStatus(activeJob.id)}
          >
            Mark as {getDriverActionLabel(activeJob.status)}
          </Button>
        )}

        <div className="space-y-3">
          <h2 className="font-semibold">My Jobs</h2>
          {jobs.length === 0 && (
            <p className="text-sm text-slate-500">No jobs assigned yet.</p>
          )}
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              actions={
                getDriverActionLabel(job.status) ? (
                  <Button size="sm" onClick={() => advanceStatus(job.id)}>
                    {getDriverActionLabel(job.status)}
                  </Button>
                ) : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
