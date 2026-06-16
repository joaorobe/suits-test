import { NextResponse } from "next/server";
import { getReturnOrders, updateReturnOrder } from "../../../lib/data";

export async function GET() {
  return NextResponse.json(await getReturnOrders());
}

export async function PATCH(request: Request) {
  const payload = await request.json();
  const { order, status, returnedDate, penalty } = payload as {
    order?: string;
    status?: string;
    returnedDate?: string;
    penalty?: string;
  };

  if (!order || !status) {
    return NextResponse.json({ message: "Pedido e status são obrigatórios." }, { status: 400 });
  }

  const updated = await updateReturnOrder(order, { status: status as any, returnedDate, penalty });
  if (!updated) return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
  return NextResponse.json(updated);
}
