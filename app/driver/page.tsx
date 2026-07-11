"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FleetMap } from "@/components/map/FleetMapClient";
import { JobCard } from "@/components/jobs/JobCard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { getDriverActionLabel } from "@/lib/jobs/state-machine";
import {
  useJobNavigation,
  navigationToMapProps,
} from "@/lib/hooks/useJobNavigation";
import type { JobStatus } from "@/lib/db/schema";
import { Navigation, Clock, Route } from "lucide-react";

interface Job {
  id: string;
  status: JobStatus;
  pickupAddress: string;
  dropoffAddress: string;
  customerName?: string | null;
  eta?: string | null;
}

export default function DriverPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activeJob = jobs.find((j) => j.id === activeJobId) ?? null;
  const { nav, refresh } = useJobNavigation(activeJobId);

  const fetchData = useCallback(async () => {
    const jobsRes = await fetch("/api/jobs");
    const jobsData: Job[] = await jobsRes.json();

    for (const job of jobsData.filter((j) =>
      ["en_route", "in_progress"].includes(j.status)
    )) {
      await fetch("/api/fleet/locations/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
    }

    setJobs(jobsData);
    const active = jobsData.find((j) =>
      ["assigned", "en_route", "in_progress"].includes(j.status)
    );
    setActiveJobId(active?.id ?? null);
    setLoading(false);
    if (active) refresh();
  }, [refresh]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const mapProps = useMemo(() => {
    if (nav) return navigationToMapProps(nav, "You");
    return { markers: [], routes: [] };
  }, [nav]);

  async function advanceStatus(jobId: string) {
    await fetch(`/api/jobs/${jobId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <DashboardShell
      title="Driver Nav"
      subtitle="Turn-by-turn fleet navigation"
      badge="Driver"
    >
      <div className="mx-auto max-w-lg space-y-4">
        {activeJob && nav && (
          <div className="grid grid-cols-3 gap-2">
            <Card className="!p-3 text-center">
              <Route className="mx-auto h-4 w-4 text-red-400" />
              <p className="mt-1 text-lg font-bold text-red-300">
                {(nav.totalDistanceM / 1000).toFixed(1)}
              </p>
              <p className="text-[10px] text-slate-500">km</p>
            </Card>
            <Card className="!p-3 text-center">
              <Clock className="mx-auto h-4 w-4 text-rose-400" />
              <p className="mt-1 text-lg font-bold text-rose-300">
                {Math.round(nav.totalDurationS / 60)}
              </p>
              <p className="text-[10px] text-slate-500">min ETA</p>
            </Card>
            <Card className="!p-3 text-center">
              <Navigation className="mx-auto h-4 w-4 text-emerald-400" />
              <p className="mt-1 text-lg font-bold text-emerald-300">
                {Math.round(nav.progress * 100)}%
              </p>
              <p className="text-[10px] text-slate-500">progress</p>
            </Card>
          </div>
        )}

        <FleetMap
          markers={mapProps.markers}
          routes={mapProps.routes}
          height="340px"
          fitRoute
        />

        {activeJob && getDriverActionLabel(activeJob.status) && (
          <Button
            className="w-full"
            size="lg"
            variant="success"
            onClick={() => advanceStatus(activeJob.id)}
          >
            <Navigation className="mr-2 h-5 w-5" />
            Mark as {getDriverActionLabel(activeJob.status)}
          </Button>
        )}

        <Card>
          <CardTitle subtitle="Assigned dispatches">My Jobs</CardTitle>
          {jobs.length === 0 && (
            <p className="text-sm text-slate-500">No jobs assigned yet.</p>
          )}
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                selected={activeJobId === job.id}
                onSelect={() => setActiveJobId(job.id)}
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
        </Card>
      </div>
    </DashboardShell>
  );
}
