export interface Coordinate {
  lat: number;
  lng: number;
}

export function haversineKm(a: Coordinate, b: Coordinate): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export interface DriverCandidate {
  driverId: string;
  userId: string;
  name: string;
  status: "available" | "busy" | "offline";
  currentLat: number;
  currentLng: number;
  activeJobCount: number;
  vehicleType: string;
  plateNumber: string;
}

export interface ScoreBreakdown {
  proximityScore: number;
  loadScore: number;
  availabilityScore: number;
  totalScore: number;
  distanceKm: number;
}

export interface RankedDriver extends DriverCandidate {
  breakdown: ScoreBreakdown;
}

const WEIGHTS = {
  proximity: 0.5,
  load: 0.35,
  availability: 0.15,
} as const;

const MAX_LOAD = 2;

export function scoreDriver(
  driver: DriverCandidate,
  pickup: Coordinate
): ScoreBreakdown | null {
  if (driver.status === "offline") return null;
  if (driver.activeJobCount >= MAX_LOAD) return null;

  const distanceKm = haversineKm(
    { lat: driver.currentLat, lng: driver.currentLng },
    pickup
  );

  const proximityScore = 1 / (1 + distanceKm);
  const loadScore = 1 / (1 + driver.activeJobCount);
  const availabilityScore =
    driver.status === "available" ? 1 : driver.status === "busy" ? 0.3 : 0;

  const totalScore =
    WEIGHTS.proximity * proximityScore +
    WEIGHTS.load * loadScore +
    WEIGHTS.availability * availabilityScore;

  return {
    proximityScore,
    loadScore,
    availabilityScore,
    totalScore,
    distanceKm,
  };
}

export function rankDrivers(
  drivers: DriverCandidate[],
  pickup: Coordinate
): RankedDriver[] {
  return drivers
    .map((driver) => {
      const breakdown = scoreDriver(driver, pickup);
      if (!breakdown) return null;
      return { ...driver, breakdown };
    })
    .filter((d): d is RankedDriver => d !== null)
    .sort((a, b) => b.breakdown.totalScore - a.breakdown.totalScore);
}
