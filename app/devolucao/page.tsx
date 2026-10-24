import { requirePageUser } from "../../lib/auth";
import { getReturnOrders } from "../../lib/data";
import DevolucaoClient from "./DevolucaoClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DevolucaoPage() {
  await requirePageUser("admin");
  const initialOrders = await getReturnOrders();
  return <DevolucaoClient initialOrders={initialOrders} />;
}
