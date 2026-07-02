import { getReturnOrders } from "../../lib/data";
import DevolucaoClient from "./DevolucaoClient";

export default async function DevolucaoPage() {
  const initialOrders = await getReturnOrders();
  return <DevolucaoClient initialOrders={initialOrders} />;
}
