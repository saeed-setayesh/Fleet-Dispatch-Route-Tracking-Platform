import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rankDrivers } from "@/lib/assignment/scorer";
import { getDriverCandidates } from "@/lib/jobs/service";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "dispatcher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { pickupLat, pickupLng } = await req.json();
  if (pickupLat == null || pickupLng == null) {
    return NextResponse.json({ error: "Pickup coordinates required" }, { status: 400 });
  }

  const drivers = await getDriverCandidates();
  const ranked = rankDrivers(drivers, { lat: pickupLat, lng: pickupLng });

  return NextResponse.json(ranked);
}
