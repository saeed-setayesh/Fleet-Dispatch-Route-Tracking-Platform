"use client";

import { signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { JobCard } from "@/components/jobs/JobCard";
import { Button } from "@/components/ui/Button";
import { LogOut, Package } from "lucide-react";
import type { JobStatus } from "@/lib/db/schema";

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
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading your deliveries...
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-bold">My Deliveries</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 p-4">
        {jobs.length === 0 && (
          <p className="text-center text-sm text-slate-500">No active deliveries.</p>
        )}
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} showTrackLink />
        ))}
      </div>
    </div>
  );
}
