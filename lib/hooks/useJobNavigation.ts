"use client";

import { useCallback, useEffect, useState } from "react";
import type { FleetMarker, RouteLine } from "@/components/map/FleetMapClient";

export interface JobNavigation {
  jobId: string;
  status: string;
  polyline: { lat: number; lng: number }[];
  traveled: { lat: number; lng: number }[];
  remaining: { lat: number; lng: number }[];
  progress: number;
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  driverPos: { lat: number; lng: number } | null;
  totalDistanceM: number;
  totalDurationS: number;
  eta: string | null;
}

export function useJobNavigation(jobId: string | null, pollMs = 3000) {
  const [nav, setNav] = useState<JobNavigation | null>(null);

  const fetchNav = useCallback(async () => {
    if (!jobId) return;
    const res = await fetch(`/api/jobs/${jobId}/navigation`);
    if (res.ok) setNav(await res.json());
  }, [jobId]);

  useEffect(() => {
    fetchNav();
    if (!jobId) return;
    const interval = setInterval(fetchNav, pollMs);
    return () => clearInterval(interval);
  }, [fetchNav, jobId, pollMs]);

  return { nav, refresh: fetchNav };
}

export function navigationToMapProps(
  nav: JobNavigation,
  driverLabel = "Driver",
  vehicleType?: string
): { markers: FleetMarker[]; routes: RouteLine[] } {
  const markers: FleetMarker[] = [
    {
      id: "pickup",
      lat: nav.pickup.lat,
      lng: nav.pickup.lng,
      label: "Pickup",
      kind: "pickup",
    },
    {
      id: "dropoff",
      lat: nav.dropoff.lat,
      lng: nav.dropoff.lng,
      label: "Dropoff",
      kind: "dropoff",
    },
  ];

  if (nav.driverPos) {
    markers.push({
      id: "driver",
      lat: nav.driverPos.lat,
      lng: nav.driverPos.lng,
      label: driverLabel,
      kind: "vehicle",
      vehicleType,
      status: "busy",
    });
  }

  const routes: RouteLine[] = [];

  if (nav.traveled.length > 1) {
    routes.push({
      id: `${nav.jobId}-traveled`,
      points: nav.traveled,
      color: "#475569",
      weight: 4,
      opacity: 0.6,
    });
  }

  if (nav.remaining.length > 1) {
    routes.push({
      id: `${nav.jobId}-remaining`,
      points: nav.remaining,
      color: "#ef4444",
      weight: 6,
      opacity: 0.95,
    });
  } else if (nav.polyline.length > 1) {
    routes.push({
      id: `${nav.jobId}-route`,
      points: nav.polyline,
      color: "#ef4444",
      weight: 6,
      opacity: 0.95,
    });
  }

  return { markers, routes };
}
