import { requirePageUser } from "../../lib/auth";
import { getCostureiras, getInventory, getPayments } from "../../lib/data";
import InventoryClient from "./InventoryClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InventoryPage() {
  await requirePageUser("admin");
  const [initialItems, initialPayments, initialCostureiras] = await Promise.all([
    getInventory(),
    getPayments(),
    getCostureiras(),
  ]);

  return <InventoryClient initialItems={initialItems} initialPayments={initialPayments} initialCostureiras={initialCostureiras} />;
}
