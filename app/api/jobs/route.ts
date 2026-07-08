import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createJob, listJobs } from "@/lib/jobs/service";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import type { JobStatus } from "@/lib/db/schema";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status") as JobStatus | null;

  const filters: {
    status?: JobStatus;
    customerId?: string;
    driverId?: string;
  } = {};
  if (statusParam) filters.status = statusParam;

  if (session.user.role === "customer") {
    filters.customerId = session.user.id;
  } else if (session.user.role === "driver") {
    const { getDriverByUserId } = await import("@/lib/jobs/service");
    const driver = await getDriverByUserId(session.user.id);
    if (driver) filters.driverId = driver.id;
  }

  const jobs = await listJobs(filters);
  return NextResponse.json(jobs);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "dispatcher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    customerId,
    pickupAddress,
    pickupLat,
    pickupLng,
    dropoffAddress,
    dropoffLat,
    dropoffLng,
    priority,
    notes,
  } = body;

  if (
    !customerId ||
    !pickupAddress ||
    pickupLat == null ||
    pickupLng == null ||
    !dropoffAddress ||
    dropoffLat == null ||
    dropoffLng == null
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [customer] = await db
    .select()
    .from(users)
    .where(eq(users.id, customerId))
    .limit(1);

  if (!customer || customer.role !== "customer") {
    return NextResponse.json({ error: "Invalid customer" }, { status: 400 });
  }

  const job = await createJob({
    customerId,
    pickupAddress,
    pickupLat,
    pickupLng,
    dropoffAddress,
    dropoffLat,
    dropoffLng,
    priority,
    notes,
    actorId: session.user.id,
  });

  return NextResponse.json(job, { status: 201 });
}
