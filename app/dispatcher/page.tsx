"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FleetMap, type FleetMarker } from "@/components/map/FleetMapClient";
import { JobCard } from "@/components/jobs/JobCard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { CALGARY_LOCATIONS } from "@/lib/constants";
import {
  useJobNavigation,
  navigationToMapProps,
} from "@/lib/hooks/useJobNavigation";
import type { JobStatus } from "@/lib/db/schema";
import { Plus, Sparkles, Truck, ClipboardList, Users } from "lucide-react";

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
  };
}

export default function DispatcherPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [fleet, setFleet] = useState<FleetMarker[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<RankedDriver[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;
  const { nav } = useJobNavigation(selectedJobId);

  const [form, setForm] = useState({
    customerId: "",
    pickupIdx: "0",
    dropoffIdx: "1",
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
          heading: number;
        }) => ({
          id: d.driverId,
          lat: d.lat,
          lng: d.lng,
          heading: d.heading,
          label: d.name,
          status: d.status,
          vehicleType: d.vehicleType,
          kind: "vehicle" as const,
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

  const mapProps = useMemo(() => {
    if (nav && selectedJob) {
      return navigationToMapProps(nav, selectedJob.driverName ?? "Driver");
    }
    return {
      markers: fleet,
      routes: [],
    };
  }, [nav, selectedJob, fleet]);

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
        notes: form.notes,
      }),
    });

    if (res.ok) {
      setShowForm(false);
      setForm({ customerId: "", pickupIdx: "0", dropoffIdx: "1", notes: "" });
      fetchData();
    }
  }

  async function suggestDrivers(job: Job) {
    setSelectedJobId(job.id);
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
    fetchData();
  }

  async function cancelJob(id: string) {
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    if (selectedJobId === id) setSelectedJobId(null);
    fetchData();
  }

  const stats = {
    active: jobs.filter((j) => !["completed", "cancelled"].includes(j.status)).length,
    enRoute: jobs.filter((j) => j.status === "en_route").length,
    available: fleet.filter((f) => f.status === "available").length,
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <DashboardShell
      title="Command Center"
      subtitle="Calgary & Alberta · Live fleet ops"
      badge="Dispatcher"
      actions={
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1.5 h-4 w-4" /> New Job
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="stat-chip flex items-center gap-1">
          <ClipboardList className="h-3 w-3" /> {stats.active} active jobs
        </span>
        <span className="stat-chip flex items-center gap-1">
          <Truck className="h-3 w-3" /> {stats.enRoute} en route
        </span>
        <span className="stat-chip flex items-center gap-1">
          <Users className="h-3 w-3" /> {stats.available} drivers free
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <FleetMap
            markers={mapProps.markers}
            routes={mapProps.routes}
            height="480px"
            fitRoute={!!selectedJobId}
          />

          {showForm && (
            <Card glow>
              <CardTitle subtitle="OSRM will compute road-following route">
                Create Dispatch Job
              </CardTitle>
              <form onSubmit={createJob} className="space-y-3">
                <select
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={form.pickupIdx}
                  onChange={(e) => setForm({ ...form, pickupIdx: e.target.value })}
                  className="input-field"
                >
                  {CALGARY_LOCATIONS.map((loc, i) => (
                    <option key={loc.label} value={i}>Pickup: {loc.label}</option>
                  ))}
                </select>
                <select
                  value={form.dropoffIdx}
                  onChange={(e) => setForm({ ...form, dropoffIdx: e.target.value })}
                  className="input-field"
                >
                  {CALGARY_LOCATIONS.map((loc, i) => (
                    <option key={loc.label} value={i}>Dropoff: {loc.label}</option>
                  ))}
                </select>
                <textarea
                  placeholder="Dispatch notes..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input-field"
                  rows={2}
                />
                <Button type="submit" className="w-full">Dispatch Job</Button>
              </form>
            </Card>
          )}

          {suggestions.length > 0 && selectedJob && (
            <Card glow>
              <CardTitle subtitle="Proximity + load scoring">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-red-400" /> Smart Assign
                </span>
              </CardTitle>
              <ul className="space-y-2">
                {suggestions.map((d, i) => (
                  <li
                    key={d.driverId}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-200">
                        #{i + 1} {d.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {d.plateNumber} · {d.breakdown.distanceKm.toFixed(1)} km · score{" "}
                        <span className="text-red-400">{d.breakdown.totalScore.toFixed(3)}</span>
                      </p>
                    </div>
                    <Button size="sm" onClick={() => assignDriver(d.driverId)}>
                      Assign
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-3 lg:col-span-2 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Job Queue · {jobs.length}
          </h2>
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              showTrackLink
              selected={selectedJobId === job.id}
              onSelect={() => setSelectedJobId(job.id)}
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
    </DashboardShell>
  );
}
