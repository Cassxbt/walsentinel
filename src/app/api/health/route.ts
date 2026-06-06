import { NextResponse } from "next/server";
import { buildHealthReport } from "@/lib/sentinel/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = buildHealthReport();
  return NextResponse.json(report, {
    status: report.status === "ready" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
