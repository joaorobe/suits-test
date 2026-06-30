import { NextResponse } from "next/server";
import { getDashboardMetrics } from "../../../lib/data";

export async function GET() {
  try {
    const data = await getDashboardMetrics();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ message: "Erro interno ao buscar métricas." }, { status: 500 });
  }
}
