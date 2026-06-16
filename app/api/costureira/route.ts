import { NextResponse } from "next/server";
import { getTailorTasks, updateTailorTask } from "../../../lib/data";

export async function GET() {
  return NextResponse.json(await getTailorTasks());
}

export async function PATCH(request: Request) {
  const payload = await request.json();
  const { id, status } = payload as { id?: string; status?: string };
  if (!id || !status) {
    return NextResponse.json({ message: "ID e status são obrigatórios." }, { status: 400 });
  }

  const updated = await updateTailorTask(id, status as Parameters<typeof updateTailorTask>[1]);
  if (!updated) return NextResponse.json({ message: "Tarefa não encontrada." }, { status: 404 });
  return NextResponse.json(updated);
}
