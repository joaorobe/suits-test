import { NextResponse } from "next/server";
import { getDashboardMetrics } from "../../../lib/data";

export async function GET() {
  const data = await getDashboardMetrics();
  return NextResponse.json(data);
}
