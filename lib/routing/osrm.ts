import type { Coordinate } from "@/lib/assignment/scorer";
import { haversineKm } from "@/lib/assignment/scorer";

const OSRM_BASE = "https://router.project-osrm.org";
const MIN_POLYLINE_POINTS = 8;

export interface Waypoint extends Coordinate {
  address: string;
}

export interface OptimizedRoute {
  waypoints: Waypoint[];
  optimizedOrder: number[];
  polyline: Coordinate[];
  totalDistanceM: number;
  totalDurationS: number;
}

function coordsToOsrmString(points: Coordinate[]): string {
  return points.map((p) => `${p.lng},${p.lat}`).join(";");
}

function parseGeoJsonLine(
  geometry: { type?: string; coordinates?: [number, number][] } | undefined
): Coordinate[] {
  if (!geometry?.coordinates?.length) return [];
  return geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
}

export function isSparsePolyline(polyline: Coordinate[]): boolean {
  return polyline.length < MIN_POLYLINE_POINTS;
}

/** Fetch real road-following geometry from OSRM Route API. */
export async function fetchDrivingRoute(
  waypoints: Coordinate[]
): Promise<Omit<OptimizedRoute, "waypoints" | "optimizedOrder"> & { waypoints: Coordinate[] }> {
  if (waypoints.length < 2) {
    return {
      waypoints,
      polyline: waypoints,
      totalDistanceM: 0,
      totalDurationS: 0,
    };
  }

  try {
    const coords = coordsToOsrmString(waypoints);
    const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false&continue_straight=false`;

    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error(`OSRM route failed: ${res.status}`);

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) {
      throw new Error(`OSRM error: ${data.code ?? "unknown"}`);
    }

    const route = data.routes[0];
    const polyline = parseGeoJsonLine(route.geometry);

    if (polyline.length === 0) throw new Error("Empty geometry");

    return {
      waypoints,
      polyline,
      totalDistanceM: route.distance ?? 0,
      totalDurationS: route.duration ?? 0,
    };
  } catch (err) {
    console.warn("[OSRM] Route fetch failed, using fallback:", err);
    return fallbackRoute(waypoints);
  }
}

export async function optimizeRoute(
  waypoints: Waypoint[]
): Promise<OptimizedRoute> {
  if (waypoints.length < 2) {
    return fallbackRouteWithMeta(waypoints);
  }

  if (waypoints.length === 2) {
    const driven = await fetchDrivingRoute(waypoints);
    return {
      waypoints,
      optimizedOrder: [0, 1],
      polyline: driven.polyline,
      totalDistanceM: driven.totalDistanceM,
      totalDurationS: driven.totalDurationS,
    };
  }

  try {
    const coords = coordsToOsrmString(waypoints);
    const tripUrl = `${OSRM_BASE}/trip/v1/driving/${coords}?source=first&destination=last&roundtrip=false&geometries=geojson`;

    const tripRes = await fetch(tripUrl, { cache: "no-store" });
    if (!tripRes.ok) return fallbackRouteWithMeta(waypoints);

    const tripData = await tripRes.json();
    if (tripData.code !== "Ok" || !tripData.trips?.[0]) {
      return fallbackRouteWithMeta(waypoints);
    }

    const trip = tripData.trips[0];
    const optimizedOrder: number[] = tripData.waypoints.map(
      (w: { waypoint_index: number }) => w.waypoint_index
    );
    const ordered = optimizedOrder.map((i) => waypoints[i]);

    let polyline = parseGeoJsonLine(trip.geometry);
    let totalDistanceM = trip.distance ?? 0;
    let totalDurationS = trip.duration ?? 0;

    if (isSparsePolyline(polyline)) {
      const driven = await fetchDrivingRoute(ordered);
      polyline = driven.polyline;
      totalDistanceM = driven.totalDistanceM;
      totalDurationS = driven.totalDurationS;
    }

    return {
      waypoints: ordered,
      optimizedOrder,
      polyline,
      totalDistanceM,
      totalDurationS,
    };
  } catch {
    return fallbackRouteWithMeta(waypoints);
  }
}

function fallbackRoute(points: Coordinate[]) {
  return {
    waypoints: points,
    polyline: densifyStraightLine(points),
    totalDistanceM: estimateDistance(points) * 1000,
    totalDurationS: estimateDuration(points),
  };
}

function fallbackRouteWithMeta(waypoints: Waypoint[]): OptimizedRoute {
  const pts = waypoints.map(({ lat, lng }) => ({ lat, lng }));
  const fb = fallbackRoute(pts);
  return {
    waypoints,
    optimizedOrder: waypoints.map((_, i) => i),
    polyline: fb.polyline,
    totalDistanceM: fb.totalDistanceM,
    totalDurationS: fb.totalDurationS,
  };
}

/** Insert intermediate points so straight-line fallback still animates smoothly. */
function densifyStraightLine(points: Coordinate[], segmentsPerLeg = 24): Coordinate[] {
  if (points.length < 2) return points;
  const dense: Coordinate[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    for (let s = 0; s < segmentsPerLeg; s++) {
      const t = s / segmentsPerLeg;
      dense.push({
        lat: from.lat + (to.lat - from.lat) * t,
        lng: from.lng + (to.lng - from.lng) * t,
      });
    }
  }
  dense.push(points[points.length - 1]);
  return dense;
}

function estimateDistance(points: Coordinate[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineKm(points[i - 1], points[i]);
  }
  return total;
}

function estimateDuration(points: Coordinate[]): number {
  const km = estimateDistance(points);
  return (km / 55) * 3600;
}

export function etaFromDuration(durationS: number): Date {
  return new Date(Date.now() + durationS * 1000);
}

export function splitPolylineByProgress(
  polyline: Coordinate[],
  progress: number
): { traveled: Coordinate[]; remaining: Coordinate[] } {
  if (polyline.length < 2 || progress <= 0) {
    return { traveled: polyline.slice(0, 1), remaining: polyline };
  }
  if (progress >= 1) {
    return { traveled: polyline, remaining: [polyline[polyline.length - 1]] };
  }

  const segmentLengths: number[] = [];
  let total = 0;
  for (let i = 1; i < polyline.length; i++) {
    const len = haversineKm(polyline[i - 1], polyline[i]);
    segmentLengths.push(len);
    total += len;
  }

  const target = progress * total;
  let acc = 0;
  let splitIndex = 0;
  let splitPoint = polyline[0];

  for (let i = 0; i < segmentLengths.length; i++) {
    if (acc + segmentLengths[i] >= target) {
      const ratio = (target - acc) / segmentLengths[i];
      const from = polyline[i];
      const to = polyline[i + 1];
      splitPoint = {
        lat: from.lat + (to.lat - from.lat) * ratio,
        lng: from.lng + (to.lng - from.lng) * ratio,
      };
      splitIndex = i;
      break;
    }
    acc += segmentLengths[i];
  }

  const traveled = [...polyline.slice(0, splitIndex + 1), splitPoint];
  const remaining = [splitPoint, ...polyline.slice(splitIndex + 1)];
  return { traveled, remaining };
}
