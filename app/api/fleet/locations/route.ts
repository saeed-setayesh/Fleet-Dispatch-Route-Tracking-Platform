import { NextResponse } from "next/server";
import { getFleetLocations, simulateDriverMovement } from "@/lib/jobs/service";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export async function GET() {
  const activeJobs = await db
    .select({ id: jobs.id, driverId: jobs.driverId, status: jobs.status })
    .from(jobs)
    .where(inArray(jobs.status, ["en_route", "in_progress"]));

  for (const job of activeJobs) {
    await simulateDriverMovement(job.id);
  }

  const locations = await getFleetLocations();
  return NextResponse.json(locations);
}
