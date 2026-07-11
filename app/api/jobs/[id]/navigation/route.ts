import { NextResponse } from "next/server";
import { getJobNavigation } from "@/lib/jobs/service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const nav = await getJobNavigation(id);
  if (!nav) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(nav);
}
