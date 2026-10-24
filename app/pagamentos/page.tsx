import { requirePageUser } from "../../lib/auth";
import { getPayments } from "../../lib/data";
import PaymentsClient from "./PaymentsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PaymentsPage() {
  await requirePageUser("admin");
  const initialPayments = await getPayments();
  return <PaymentsClient initialPayments={initialPayments} />;
}
