import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { optimizeRoute, type Waypoint } from "@/lib/routing/osrm";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { waypoints } = (await req.json()) as { waypoints: Waypoint[] };
  if (!waypoints || waypoints.length < 2) {
    return NextResponse.json(
      { error: "At least 2 waypoints required" },
      { status: 400 }
    );
  }

  const route = await optimizeRoute(waypoints);
  return NextResponse.json(route);
}
