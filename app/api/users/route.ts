import { NextResponse } from "next/server";
import { getCostureiras } from "../../../lib/data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const role = url.searchParams.get("role");

  if (role === "costureira") {
    const users = await getCostureiras();
    return NextResponse.json(users);
  }

  return NextResponse.json({ message: "Role inválida." }, { status: 400 });
}
