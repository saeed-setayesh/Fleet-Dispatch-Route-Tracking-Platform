"use client";

import { useCallback, useEffect, useState } from "react";
import { JobCard } from "@/components/jobs/JobCard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardTitle } from "@/components/ui/Card";
import type { JobStatus } from "@/lib/db/schema";
import { Package } from "lucide-react";

interface Job {
  id: string;
  status: JobStatus;
  pickupAddress: string;
  dropoffAddress: string;
  driverName?: string | null;
  plateNumber?: string | null;
  eta?: string | null;
}

export default function CustomerPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    const res = await fetch("/api/jobs");
    setJobs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  const active = jobs.filter((j) => !["completed", "cancelled"].includes(j.status));

  return (
    <DashboardShell
      title="My Deliveries"
      subtitle="Track your tow & delivery in real time"
      badge="Customer"
    >
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex gap-2">
          <span className="stat-chip flex items-center gap-1">
            <Package className="h-3 w-3" /> {active.length} active
          </span>
          <span className="stat-chip">{jobs.length} total</span>
        </div>

        <Card>
          <CardTitle subtitle="Tap Track to see live map">Your Jobs</CardTitle>
          {jobs.length === 0 && (
            <p className="text-sm text-slate-500">No deliveries yet.</p>
          )}
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} showTrackLink />
            ))}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
