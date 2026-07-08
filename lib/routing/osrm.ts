import type { Coordinate } from "@/lib/assignment/scorer";
import { haversineKm } from "@/lib/assignment/scorer";

const OSRM_BASE = "https://router.project-osrm.org";

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

export async function optimizeRoute(
  waypoints: Waypoint[]
): Promise<OptimizedRoute> {
  if (waypoints.length < 2) {
    return fallbackRoute(waypoints);
  }

  try {
    const coords = coordsToOsrmString(waypoints);
    const tripUrl = `${OSRM_BASE}/trip/v1/driving/${coords}?source=first&destination=last&roundtrip=false&geometries=geojson`;

    const tripRes = await fetch(tripUrl, { next: { revalidate: 0 } });
    if (!tripRes.ok) return fallbackRoute(waypoints);

    const tripData = await tripRes.json();
    if (tripData.code !== "Ok" || !tripData.waypoints) {
      return fallbackRoute(waypoints);
    }

    const optimizedOrder: number[] = tripData.waypoints.map(
      (w: { waypoint_index: number }) => w.waypoint_index
    );

    const ordered = optimizedOrder.map((i) => waypoints[i]);
    const orderedCoords = coordsToOsrmString(ordered);

    const routeUrl = `${OSRM_BASE}/route/v1/driving/${orderedCoords}?overview=full&geometries=geojson`;
    const routeRes = await fetch(routeUrl, { next: { revalidate: 0 } });
    if (!routeRes.ok) {
      return {
        waypoints: ordered,
        optimizedOrder,
        polyline: ordered,
        totalDistanceM: estimateDistance(ordered),
        totalDurationS: estimateDuration(ordered),
      };
    }

    const routeData = await routeRes.json();
    const route = routeData.routes?.[0];
    const polyline: Coordinate[] =
      route?.geometry?.coordinates?.map(
        ([lng, lat]: [number, number]) => ({ lat, lng })
      ) ?? ordered;

    return {
      waypoints: ordered,
      optimizedOrder,
      polyline,
      totalDistanceM: route?.distance ?? estimateDistance(ordered),
      totalDurationS: route?.duration ?? estimateDuration(ordered),
    };
  } catch {
    return fallbackRoute(waypoints);
  }
}

function fallbackRoute(waypoints: Waypoint[]): OptimizedRoute {
  return {
    waypoints,
    optimizedOrder: waypoints.map((_, i) => i),
    polyline: waypoints,
    totalDistanceM: estimateDistance(waypoints) * 1000,
    totalDurationS: estimateDuration(waypoints),
  };
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
  const avgSpeedKmh = 50;
  return (km / avgSpeedKmh) * 3600;
}

export function etaFromDuration(durationS: number): Date {
  return new Date(Date.now() + durationS * 1000);
}
