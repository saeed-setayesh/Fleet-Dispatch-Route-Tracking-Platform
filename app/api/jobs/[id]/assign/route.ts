import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assignJob } from "@/lib/jobs/service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "dispatcher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { driverId } = await req.json();

  if (!driverId) {
    return NextResponse.json({ error: "driverId required" }, { status: 400 });
  }

  try {
    const job = await assignJob(id, driverId, session.user.id);
    return NextResponse.json(job);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 }
    );
  }
}
