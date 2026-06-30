import { NextResponse } from "next/server";
import { getReturnOrders, updateReturnOrder } from "../../../lib/data";

export async function GET() {
  try {
    const orders = await getReturnOrders();
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Devolucao GET error:", error);
    return NextResponse.json({ message: "Erro interno ao carregar devoluções." }, { status: 500 });
  }
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

  try {
    const updated = await updateReturnOrder(order, { status: status as any, returnedDate, penalty });
    if (!updated) return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Devolucao PATCH error:", error);
    return NextResponse.json({ message: "Erro interno ao atualizar pedido." }, { status: 500 });
  }
}
