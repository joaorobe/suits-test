import { NextResponse } from "next/server";
import { getTailorOrders, getTailorOrderById, createTailorOrder, updateTailorOrder, deleteTailorOrder } from "../../../lib/data";
import type { TailorOrder } from "../../../lib/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const assignedTo = url.searchParams.get("assignedTo") || undefined;
  const orderId = url.searchParams.get("id") || undefined;

  if (orderId) {
    const order = await getTailorOrderById(orderId);
    if (!order) return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
    return NextResponse.json(order);
  }

  const orders = await getTailorOrders(assignedTo);
  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<TailorOrder>;
  
  if (!payload.inventoryId || !payload.assignedTo || !payload.adjustmentType || !payload.description) {
    return NextResponse.json({ message: "Dados do pedido de costura incompletos." }, { status: 400 });
  }

  const order: Omit<TailorOrder, "id" | "createdAt" | "updatedAt"> = {
    inventoryId: payload.inventoryId,
    assignedTo: payload.assignedTo,
    adjustmentType: payload.adjustmentType,
    description: payload.description,
    measurements: payload.measurements,
    status: "Novo",
    notes: payload.notes,
    completedAt: undefined,
  };

  const created = await createTailorOrder(order);
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(request: Request) {
  const payload = await request.json();
  const { id, ...updates } = payload as { id?: string } & Partial<TailorOrder>;

  if (!id) {
    return NextResponse.json({ message: "ID do pedido é obrigatório." }, { status: 400 });
  }

  const updated = await updateTailorOrder(id, updates);
  if (!updated) return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
  
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ message: "ID do pedido é obrigatório." }, { status: 400 });
  }

  const deleted = await deleteTailorOrder(id);
  if (!deleted) return NextResponse.json({ message: "Pedido não encontrado." }, { status: 404 });

  return NextResponse.json({ message: "Pedido deletado com sucesso." });
}
