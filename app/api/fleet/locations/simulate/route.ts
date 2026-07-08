import { NextResponse } from "next/server";
import { simulateDriverMovement } from "@/lib/jobs/service";

export async function POST(req: Request) {
  const { jobId } = await req.json();
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  const result = await simulateDriverMovement(jobId);
  if (!result) {
    return NextResponse.json({ error: "Simulation not active" }, { status: 400 });
  }

  return NextResponse.json(result);
}
