"use client";

import { signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { FleetMap, type FleetMarker } from "@/components/map/FleetMapClient";
import { JobCard } from "@/components/jobs/JobCard";
import { Button } from "@/components/ui/Button";
import { CALGARY_LOCATIONS } from "@/lib/constants";
import type { JobStatus } from "@/lib/db/schema";
import { LogOut, Plus, Sparkles } from "lucide-react";

interface Job {
  id: string;
  status: JobStatus;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  customerName?: string | null;
  driverName?: string | null;
  plateNumber?: string | null;
  eta?: string | null;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface RankedDriver {
  driverId: string;
  name: string;
  status: string;
  plateNumber: string;
  vehicleType: string;
  breakdown: {
    totalScore: number;
    distanceKm: number;
    proximityScore: number;
    loadScore: number;
    availabilityScore: number;
  };
}

export default function DispatcherPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [fleet, setFleet] = useState<FleetMarker[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [suggestions, setSuggestions] = useState<RankedDriver[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    customerId: "",
    pickupIdx: "0",
    dropoffIdx: "1",
    priority: "1",
    notes: "",
  });

  const fetchData = useCallback(async () => {
    const [jobsRes, fleetRes, customersRes] = await Promise.all([
      fetch("/api/jobs"),
      fetch("/api/fleet/locations"),
      fetch("/api/customers"),
    ]);
    setJobs(await jobsRes.json());
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
    setCustomers(await customersRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function createJob(e: React.FormEvent) {
    e.preventDefault();
    const pickup = CALGARY_LOCATIONS[Number(form.pickupIdx)];
    const dropoff = CALGARY_LOCATIONS[Number(form.dropoffIdx)];

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: form.customerId,
        pickupAddress: pickup.address,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffAddress: dropoff.address,
        dropoffLat: dropoff.lat,
        dropoffLng: dropoff.lng,
        priority: Number(form.priority),
        notes: form.notes,
      }),
    });

    if (res.ok) {
      setShowForm(false);
      setForm({ customerId: "", pickupIdx: "0", dropoffIdx: "1", priority: "1", notes: "" });
      fetchData();
    }
  }

  async function suggestDrivers(job: Job) {
    setSelectedJob(job);
    const res = await fetch("/api/assignment/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickupLat: job.pickupLat, pickupLng: job.pickupLng }),
    });
    setSuggestions(await res.json());
  }

  async function assignDriver(driverId: string) {
    if (!selectedJob) return;
    await fetch(`/api/jobs/${selectedJob.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId }),
    });
    setSuggestions([]);
    setSelectedJob(null);
    fetchData();
  }

  async function cancelJob(id: string) {
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading dispatcher dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Dispatcher Dashboard</h1>
            <p className="text-xs text-slate-500">Calgary &amp; Alberta fleet ops</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="mr-1 h-4 w-4" /> New Job
            </Button>
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="mr-1 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-2">
        <div className="space-y-4">
          <FleetMap markers={fleet} height="420px" />

          {showForm && (
            <form onSubmit={createJob} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h2 className="font-semibold">Create Job</h2>
              <select
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={form.pickupIdx}
                onChange={(e) => setForm({ ...form, pickupIdx: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {CALGARY_LOCATIONS.map((loc, i) => (
                  <option key={loc.label} value={i}>
                    Pickup: {loc.label}
                  </option>
                ))}
              </select>
              <select
                value={form.dropoffIdx}
                onChange={(e) => setForm({ ...form, dropoffIdx: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {CALGARY_LOCATIONS.map((loc, i) => (
                  <option key={loc.label} value={i}>
                    Dropoff: {loc.label}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={2}
              />
              <Button type="submit">Create Job</Button>
            </form>
          )}

          {suggestions.length > 0 && selectedJob && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <h3 className="flex items-center gap-1 font-semibold text-blue-900">
                <Sparkles className="h-4 w-4" /> Suggested drivers
              </h3>
              <ul className="mt-2 space-y-2">
                {suggestions.map((d) => (
                  <li
                    key={d.driverId}
                    className="flex items-center justify-between rounded-lg bg-white p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-slate-500">
                        {d.plateNumber} · {d.breakdown.distanceKm.toFixed(1)} km · score{" "}
                        {d.breakdown.totalScore.toFixed(3)}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => assignDriver(d.driverId)}>
                      Assign
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-3 max-h-[calc(100vh-5rem)] overflow-y-auto">
          <h2 className="font-semibold">Jobs ({jobs.length})</h2>
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              showTrackLink
              actions={
                <div className="flex flex-wrap gap-2">
                  {job.status === "requested" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => suggestDrivers(job)}>
                        Suggest Driver
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => cancelJob(job.id)}>
                        Cancel
                      </Button>
                    </>
                  )}
                  {job.status === "assigned" && (
                    <Button size="sm" variant="danger" onClick={() => cancelJob(job.id)}>
                      Cancel
                    </Button>
                  )}
                </div>
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
