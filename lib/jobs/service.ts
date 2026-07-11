import { db } from "@/lib/db";
import {
  jobs,
  jobStatusEvents,
  drivers,
  routes,
  driverLocations,
  users,
  vehicles,
  type JobStatus,
} from "@/lib/db/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { canTransition } from "@/lib/jobs/state-machine";
import { notifyJobStatusChange } from "@/lib/notifications/service";
import type { Coordinate } from "@/lib/assignment/scorer";
import {
  optimizeRoute,
  fetchDrivingRoute,
  etaFromDuration,
  isSparsePolyline,
  splitPolylineByProgress,
  type Waypoint,
} from "@/lib/routing/osrm";
import {
  decodePolyline,
  interpolateAlongPolyline,
  nearestProgressOnPolyline,
} from "@/lib/simulation/interpolate";

export async function createJob(input: {
  customerId: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  priority?: number;
  notes?: string;
  actorId: string;
}) {
  const [job] = await db
    .insert(jobs)
    .values({
      customerId: input.customerId,
      pickupAddress: input.pickupAddress,
      pickupLat: input.pickupLat,
      pickupLng: input.pickupLng,
      dropoffAddress: input.dropoffAddress,
      dropoffLat: input.dropoffLat,
      dropoffLng: input.dropoffLng,
      priority: input.priority ?? 1,
      notes: input.notes,
      status: "requested",
    })
    .returning();

  await db.insert(jobStatusEvents).values({
    jobId: job.id,
    fromStatus: null,
    toStatus: "requested",
    actorId: input.actorId,
    note: "Job created",
  });

  const waypoints: Waypoint[] = [
    {
      address: input.pickupAddress,
      lat: input.pickupLat,
      lng: input.pickupLng,
    },
    {
      address: input.dropoffAddress,
      lat: input.dropoffLat,
      lng: input.dropoffLng,
    },
  ];

  const optimized = await optimizeRoute(waypoints);
  const eta = etaFromDuration(optimized.totalDurationS);

  await db.insert(routes).values({
    jobId: job.id,
    waypoints: optimized.waypoints,
    optimizedOrder: optimized.optimizedOrder,
    polyline: optimized.polyline,
    totalDistanceM: optimized.totalDistanceM,
    totalDurationS: optimized.totalDurationS,
    eta,
  });

  await db.update(jobs).set({ eta, updatedAt: new Date() }).where(eq(jobs.id, job.id));

  return job;
}

export async function assignJob(
  jobId: string,
  driverId: string,
  actorId: string
) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) throw new Error("Job not found");
  if (!canTransition(job.status, "assigned")) {
    throw new Error(`Cannot assign job in status ${job.status}`);
  }

  await db
    .update(jobs)
    .set({ driverId, status: "assigned", updatedAt: new Date() })
    .where(eq(jobs.id, jobId));

  await db.insert(jobStatusEvents).values({
    jobId,
    fromStatus: job.status,
    toStatus: "assigned",
    actorId,
    note: "Driver assigned",
  });

  await db
    .update(drivers)
    .set({ status: "busy", updatedAt: new Date() })
    .where(eq(drivers.id, driverId));

  await notifyJobStatusChange(jobId, "assigned");
  await refreshNavigationRoute(jobId);

  return getJobById(jobId);
}

export async function transitionJob(
  jobId: string,
  toStatus: JobStatus,
  actorId: string,
  note?: string
) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) throw new Error("Job not found");
  if (!canTransition(job.status, toStatus)) {
    throw new Error(`Invalid transition: ${job.status} → ${toStatus}`);
  }

  await db
    .update(jobs)
    .set({ status: toStatus, updatedAt: new Date() })
    .where(eq(jobs.id, jobId));

  await db.insert(jobStatusEvents).values({
    jobId,
    fromStatus: job.status,
    toStatus,
    actorId,
    note,
  });

  if (toStatus === "en_route" || toStatus === "in_progress") {
    await refreshNavigationRoute(jobId);
  }

  if (toStatus === "completed" && job.driverId) {
    const activeCount = await getActiveJobCount(job.driverId);
    if (activeCount === 0) {
      await db
        .update(drivers)
        .set({ status: "available", updatedAt: new Date() })
        .where(eq(drivers.id, job.driverId));
    }
  }

  await notifyJobStatusChange(jobId, toStatus);

  return getJobById(jobId);
}

async function refreshNavigationRoute(jobId: string) {
  const nav = await buildNavigationForJob(jobId);
  if (!nav) return;

  const eta = etaFromDuration(nav.totalDurationS);
  const [existing] = await db
    .select()
    .from(routes)
    .where(eq(routes.jobId, jobId))
    .limit(1);

  if (existing) {
    await db
      .update(routes)
      .set({
        polyline: nav.polyline,
        totalDistanceM: nav.totalDistanceM,
        totalDurationS: nav.totalDurationS,
        eta,
      })
      .where(eq(routes.jobId, jobId));
  } else {
    await db.insert(routes).values({
      jobId,
      waypoints: nav.waypoints,
      optimizedOrder: nav.waypoints.map((_, i) => i),
      polyline: nav.polyline,
      totalDistanceM: nav.totalDistanceM,
      totalDurationS: nav.totalDurationS,
      eta,
    });
  }

  await db.update(jobs).set({ eta, updatedAt: new Date() }).where(eq(jobs.id, jobId));
}

async function buildNavigationForJob(jobId: string) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return null;

  const pickup: Coordinate = { lat: job.pickupLat, lng: job.pickupLng };
  const dropoff: Coordinate = { lat: job.dropoffLat, lng: job.dropoffLng };

  const waypointsMeta: Waypoint[] = [
    { ...pickup, address: job.pickupAddress },
    { ...dropoff, address: job.dropoffAddress },
  ];

  let routePoints: Coordinate[] = [pickup, dropoff];

  if (job.driverId) {
    const [driver] = await db
      .select()
      .from(drivers)
      .where(eq(drivers.id, job.driverId))
      .limit(1);

    if (driver) {
      const driverPos = { lat: driver.currentLat, lng: driver.currentLng };
      if (job.status === "in_progress") {
        routePoints = [driverPos, dropoff];
        waypointsMeta.unshift({
          ...driverPos,
          address: "Driver location",
        });
      } else if (["assigned", "en_route"].includes(job.status)) {
        routePoints = [driverPos, pickup, dropoff];
        waypointsMeta.unshift({
          ...driverPos,
          address: "Driver location",
        });
      }
    }
  }

  const driven = await fetchDrivingRoute(routePoints);
  return {
    waypoints: waypointsMeta,
    polyline: driven.polyline,
    totalDistanceM: driven.totalDistanceM,
    totalDurationS: driven.totalDurationS,
    pickup,
    dropoff,
  };
}

export async function getJobNavigation(jobId: string) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return null;

  let nav = await buildNavigationForJob(jobId);
  if (!nav) return null;

  if (isSparsePolyline(nav.polyline)) {
    const fallback = await fetchDrivingRoute([
      { lat: job.pickupLat, lng: job.pickupLng },
      { lat: job.dropoffLat, lng: job.dropoffLng },
    ]);
    nav = {
      ...nav,
      polyline: fallback.polyline,
      totalDistanceM: fallback.totalDistanceM,
      totalDurationS: fallback.totalDurationS,
    };
  }

  let progress = 0;
  let driverPos: Coordinate | null = null;

  if (job.driverId) {
    const [driver] = await db
      .select()
      .from(drivers)
      .where(eq(drivers.id, job.driverId))
      .limit(1);
    if (driver) {
      driverPos = { lat: driver.currentLat, lng: driver.currentLng };
      progress = nearestProgressOnPolyline(nav.polyline, driverPos);
    }
  }

  const { traveled, remaining } = splitPolylineByProgress(nav.polyline, progress);

  return {
    jobId,
    status: job.status,
    polyline: nav.polyline,
    traveled,
    remaining,
    progress,
    pickup: nav.pickup,
    dropoff: nav.dropoff,
    driverPos,
    totalDistanceM: nav.totalDistanceM,
    totalDurationS: nav.totalDurationS,
    eta: job.eta,
  };
}

export async function cancelJob(jobId: string, actorId: string) {
  return transitionJob(jobId, "cancelled", actorId, "Job cancelled");
}

async function getActiveJobCount(driverId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(jobs)
    .where(
      and(
        eq(jobs.driverId, driverId),
        inArray(jobs.status, ["assigned", "en_route", "in_progress"])
      )
    );
  return result[0]?.count ?? 0;
}

export async function getJobById(jobId: string) {
  const [jobRow] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!jobRow) return null;

  const [customer] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, jobRow.customerId))
    .limit(1);

  let driverName: string | null = null;
  let plateNumber: string | null = null;
  let vehicleType: string | null = null;

  if (jobRow.driverId) {
    const [driverRow] = await db
      .select({
        userId: drivers.userId,
        vehicleId: drivers.vehicleId,
      })
      .from(drivers)
      .where(eq(drivers.id, jobRow.driverId))
      .limit(1);

    if (driverRow) {
      const [driverUser] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, driverRow.userId))
        .limit(1);
      driverName = driverUser?.name ?? null;

      const [vehicle] = await db
        .select({ plateNumber: vehicles.plateNumber, type: vehicles.type })
        .from(vehicles)
        .where(eq(vehicles.id, driverRow.vehicleId))
        .limit(1);
      plateNumber = vehicle?.plateNumber ?? null;
      vehicleType = vehicle?.type ?? null;
    }
  }

  let [route] = await db
    .select()
    .from(routes)
    .where(eq(routes.jobId, jobId))
    .limit(1);

  if (route && isSparsePolyline(decodePolyline(route.polyline))) {
    const refreshed = await fetchDrivingRoute([
      { lat: jobRow.pickupLat, lng: jobRow.pickupLng },
      { lat: jobRow.dropoffLat, lng: jobRow.dropoffLng },
    ]);
    await db
      .update(routes)
      .set({
        polyline: refreshed.polyline,
        totalDistanceM: refreshed.totalDistanceM,
        totalDurationS: refreshed.totalDurationS,
      })
      .where(eq(routes.jobId, jobId));
    route = {
      ...route,
      polyline: refreshed.polyline,
      totalDistanceM: refreshed.totalDistanceM,
      totalDurationS: refreshed.totalDurationS,
    };
  }

  const events = await db
    .select({
      id: jobStatusEvents.id,
      fromStatus: jobStatusEvents.fromStatus,
      toStatus: jobStatusEvents.toStatus,
      note: jobStatusEvents.note,
      createdAt: jobStatusEvents.createdAt,
      actorName: users.name,
    })
    .from(jobStatusEvents)
    .leftJoin(users, eq(jobStatusEvents.actorId, users.id))
    .where(eq(jobStatusEvents.jobId, jobId))
    .orderBy(jobStatusEvents.createdAt);

  return {
    ...jobRow,
    customerName: customer?.name ?? null,
    customerEmail: customer?.email ?? null,
    driverName,
    plateNumber,
    vehicleType,
    route: route ?? null,
    polyline: route ? decodePolyline(route.polyline) : [],
    events,
  };
}

export async function listJobs(filters?: {
  status?: JobStatus;
  customerId?: string;
  driverId?: string;
}) {
  const conditions = [];
  if (filters?.status) conditions.push(eq(jobs.status, filters.status));
  if (filters?.customerId) conditions.push(eq(jobs.customerId, filters.customerId));
  if (filters?.driverId) conditions.push(eq(jobs.driverId, filters.driverId));

  const jobRows =
    conditions.length > 0
      ? await db
          .select()
          .from(jobs)
          .where(and(...conditions))
          .orderBy(desc(jobs.createdAt))
      : await db.select().from(jobs).orderBy(desc(jobs.createdAt));

  return Promise.all(
    jobRows.map(async (job) => {
      const details = await getJobById(job.id);
      return {
        ...job,
        customerName: details?.customerName,
        driverName: details?.driverName,
        plateNumber: details?.plateNumber,
      };
    })
  );
}

export async function getDriverCandidates() {
  const rows = await db
    .select({
      driverId: drivers.id,
      userId: drivers.userId,
      name: users.name,
      status: drivers.status,
      currentLat: drivers.currentLat,
      currentLng: drivers.currentLng,
      vehicleType: vehicles.type,
      plateNumber: vehicles.plateNumber,
    })
    .from(drivers)
    .innerJoin(users, eq(drivers.userId, users.id))
    .innerJoin(vehicles, eq(drivers.vehicleId, vehicles.id));

  const withLoad = await Promise.all(
    rows.map(async (d) => ({
      ...d,
      activeJobCount: await getActiveJobCount(d.driverId),
    }))
  );

  return withLoad;
}

export async function getFleetLocations() {
  return db
    .select({
      driverId: drivers.id,
      name: users.name,
      status: drivers.status,
      lat: drivers.currentLat,
      lng: drivers.currentLng,
      heading: drivers.heading,
      plateNumber: vehicles.plateNumber,
      vehicleType: vehicles.type,
      updatedAt: drivers.updatedAt,
    })
    .from(drivers)
    .innerJoin(users, eq(drivers.userId, users.id))
    .innerJoin(vehicles, eq(drivers.vehicleId, vehicles.id));
}

export async function updateDriverLocation(
  driverId: string,
  lat: number,
  lng: number,
  heading = 0
) {
  await db
    .update(drivers)
    .set({ currentLat: lat, currentLng: lng, heading, updatedAt: new Date() })
    .where(eq(drivers.id, driverId));

  await db.insert(driverLocations).values({ driverId, lat, lng, heading });
}

export async function simulateDriverMovement(jobId: string) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job?.driverId || !["en_route", "in_progress"].includes(job.status)) {
    return null;
  }

  let nav = await buildNavigationForJob(jobId);
  if (!nav || nav.polyline.length === 0) return null;

  if (isSparsePolyline(nav.polyline)) {
    await refreshNavigationRoute(jobId);
    nav = await buildNavigationForJob(jobId);
    if (!nav) return null;
  }

  const polyline = nav.polyline;
  const enRouteEvent = await db
    .select()
    .from(jobStatusEvents)
    .where(
      and(eq(jobStatusEvents.jobId, jobId), eq(jobStatusEvents.toStatus, "en_route"))
    )
    .orderBy(jobStatusEvents.createdAt)
    .limit(1);

  const startTime = enRouteEvent[0]?.createdAt ?? new Date();
  const elapsedSeconds = (Date.now() - startTime.getTime()) / 1000;

  const durationS = nav.totalDurationS > 0 ? nav.totalDurationS : 600;
  const speedKmh =
    nav.totalDistanceM > 0
      ? (nav.totalDistanceM / 1000 / durationS) * 3600
      : 45;

  const pos = interpolateAlongPolyline(polyline, elapsedSeconds, speedKmh);

  await updateDriverLocation(job.driverId, pos.lat, pos.lng, pos.heading);

  return { ...pos, driverId: job.driverId, progress: pos.progress };
}

export async function getDriverByUserId(userId: string) {
  const [driver] = await db
    .select()
    .from(drivers)
    .where(eq(drivers.userId, userId))
    .limit(1);
  return driver ?? null;
}
