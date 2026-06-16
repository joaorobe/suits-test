import { NextResponse } from "next/server";
import { deleteInventory, getInventoryById, updateInventory } from "../../../../lib/data";
import type { InventoryItem } from "../../../../lib/types";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const item = await getInventoryById(id);
  if (!item) return NextResponse.json({ message: "Item não encontrado." }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const updates = (await request.json()) as Partial<InventoryItem>;
  const item = await updateInventory(id, updates);
  if (!item) return NextResponse.json({ message: "Item não encontrado." }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const removed = await deleteInventory(id);
  if (!removed) return NextResponse.json({ message: "Item não encontrado." }, { status: 404 });
  return NextResponse.json({ message: "Item removido." }, { status: 200 });
}
