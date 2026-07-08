import type { Coordinate } from "@/lib/assignment/scorer";
import { haversineKm } from "@/lib/assignment/scorer";

export interface InterpolatedPosition extends Coordinate {
  heading: number;
  progress: number;
  segmentIndex: number;
}

export function interpolateAlongPolyline(
  polyline: Coordinate[],
  elapsedSeconds: number,
  speedKmh = 45
): InterpolatedPosition {
  if (polyline.length === 0) {
    return { lat: 0, lng: 0, heading: 0, progress: 0, segmentIndex: 0 };
  }

  if (polyline.length === 1) {
    return {
      ...polyline[0],
      heading: 0,
      progress: 1,
      segmentIndex: 0,
    };
  }

  const segmentLengths: number[] = [];
  let totalKm = 0;
  for (let i = 1; i < polyline.length; i++) {
    const len = haversineKm(polyline[i - 1], polyline[i]);
    segmentLengths.push(len);
    totalKm += len;
  }

  const distanceTraveledKm = (speedKmh / 3600) * elapsedSeconds;
  const clampedDistance = Math.min(distanceTraveledKm, totalKm);
  const progress = totalKm > 0 ? clampedDistance / totalKm : 1;

  let remaining = clampedDistance;
  for (let i = 0; i < segmentLengths.length; i++) {
    if (remaining <= segmentLengths[i]) {
      const ratio = segmentLengths[i] > 0 ? remaining / segmentLengths[i] : 0;
      const from = polyline[i];
      const to = polyline[i + 1];
      const lat = from.lat + (to.lat - from.lat) * ratio;
      const lng = from.lng + (to.lng - from.lng) * ratio;
      const heading = bearing(from, to);
      return { lat, lng, heading, progress, segmentIndex: i };
    }
    remaining -= segmentLengths[i];
  }

  const last = polyline[polyline.length - 1];
  const prev = polyline[polyline.length - 2];
  return {
    ...last,
    heading: bearing(prev, last),
    progress: 1,
    segmentIndex: segmentLengths.length - 1,
  };
}

function bearing(from: Coordinate, to: Coordinate): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function decodePolyline(stored: unknown): Coordinate[] {
  if (!Array.isArray(stored)) return [];
  return stored.filter(
    (p): p is Coordinate =>
      typeof p === "object" &&
      p !== null &&
      "lat" in p &&
      "lng" in p &&
      typeof (p as Coordinate).lat === "number"
  );
}
