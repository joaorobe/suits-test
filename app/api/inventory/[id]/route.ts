import { api, readBody } from "../../../../lib/api";
import { NextResponse } from "next/server";
import { deleteInventory, getInventoryById } from "../../../../lib/data";
import type { InventoryItem } from "../../../../lib/types";
import { validateInventory } from '../../../../lib/inventory';
import { withTransaction } from '../../../../lib/db';
import { HttpError } from '../../../../lib/rules';
import { rowToInventoryItem } from '../../../../lib/data';

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

async function handleGET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const item = await getInventoryById(id);
  if (!item) return NextResponse.json({ message: "Item não encontrado." }, { status: 404 });
  return NextResponse.json(item, { headers: NO_STORE_HEADERS });
}

async function handlePUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const updates = (await readBody(request)) as Partial<InventoryItem>;
  validateInventory(updates);
  const item = await withTransaction(async client => {
    const current = await client.query('SELECT * FROM inventory WHERE id=$1 FOR UPDATE', [id]);
    if (!current.rowCount) throw new HttpError(404, 'Item não encontrado.');
    if (['status','stock','location','action'].some(field => field in updates)) {
      const active = await client.query("SELECT 1 FROM return_orders WHERE item_id=$1 AND status != 'Devolvido'", [id]);
      if (active.rowCount) throw new HttpError(409, 'Atualize o traje pelo fluxo de aluguel, costura ou devolução.');
    }
    const columns: Record<string, string> = { priceCategory: 'price_category' };
    const keys = Object.keys(updates);
    if (!keys.length) return rowToInventoryItem(current.rows[0]);
    const changed = await client.query(`UPDATE inventory SET ${keys.map((key, i) => `${columns[key] ?? key}=$${i+1}`).join(',')} WHERE id=$${keys.length+1} RETURNING *`, [...Object.values(updates), id]);
    return rowToInventoryItem(changed.rows[0]);
  });
  if (!item) return NextResponse.json({ message: "Item não encontrado." }, { status: 404 });
  return NextResponse.json(item);
}

async function handleDELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const removed = await deleteInventory(id);
  if (!removed) return NextResponse.json({ message: "Item não encontrado." }, { status: 404 });
  return NextResponse.json({ message: "Item removido." }, { status: 200 });
}

export const GET = api("admin", handleGET);

export const PUT = api("admin", handlePUT);

export const DELETE = api("admin", handleDELETE);
