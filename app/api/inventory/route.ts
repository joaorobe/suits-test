import { api, readBody } from "../../../lib/api";
import { requireUser } from '../../../lib/auth';
import { query } from '../../../lib/db';
import { validateInventory } from '../../../lib/inventory';
import { randomUUID } from 'node:crypto';
import { NextResponse } from "next/server";
import { addInventory, getInventory } from "../../../lib/data";
import type { InventoryItem } from "../../../lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

async function handleGET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const items = await getInventory(search);
  const user = await requireUser();
  if (user.role === 'costureira') {
    const assigned = await query('SELECT DISTINCT inventory_id FROM tailor_orders WHERE assigned_to = $1', [user.id]);
    const ids = new Set(assigned.rows.map(row => row.inventory_id));
    return NextResponse.json(items.filter(item => ids.has(item.id)), { headers: NO_STORE_HEADERS });
  }
  return NextResponse.json(items, { headers: NO_STORE_HEADERS });
}

async function handlePOST(request: Request) {
  const payload = (await readBody(request)) as Partial<InventoryItem>;
  if (!payload.title || !payload.subtitle || !payload.size || !payload.color) {
    return NextResponse.json({ message: "Dados do inventário incompletos." }, { status: 400 });
  }

  const item: InventoryItem = {
    id: `INV-${randomUUID()}`,
    title: payload.title,
    subtitle: payload.subtitle,
    sku: payload.sku ?? `SKU-${Date.now()}`,
    status: payload.status ?? "Disponível",
    size: payload.size,
    color: payload.color,
    location: payload.location ?? "Estoque Central",
    stock: payload.stock ?? 1,
    image: payload.image ?? "/terno1.jpg",
    action: payload.action ?? "Reservar Traje",
    priceCategory: payload.priceCategory,
    price: payload.price,
  };

  validateInventory(Object.fromEntries(Object.entries(item).filter(([key]) => key !== "id")));
  const created = await addInventory(item);
  return NextResponse.json(created, { status: 201 });
}

export const GET = api(["admin", "costureira"], handleGET);

export const POST = api("admin", handlePOST);
