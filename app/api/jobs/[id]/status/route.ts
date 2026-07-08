import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  transitionJob,
  getJobById,
  getDriverByUserId,
  simulateDriverMovement,
} from "@/lib/jobs/service";
import type { JobStatus } from "@/lib/db/schema";
import { getDriverAction } from "@/lib/jobs/state-machine";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  let toStatus = body.status as JobStatus | undefined;

  const job = await getJobById(id);
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (session.user.role === "driver") {
    const driver = await getDriverByUserId(session.user.id);
    if (!driver || job.driverId !== driver.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const expected = getDriverAction(job.status);
    if (!expected) {
      return NextResponse.json({ error: "No action available" }, { status: 400 });
    }
    toStatus = expected;
  } else if (session.user.role !== "dispatcher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!toStatus) {
    return NextResponse.json({ error: "status required" }, { status: 400 });
  }

  try {
    const updated = await transitionJob(id, toStatus, session.user.id, body.note);
    if (toStatus === "en_route") {
      await simulateDriverMovement(id);
    }
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 }
    );
  }
}
