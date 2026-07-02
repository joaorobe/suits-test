import { getPayments } from "../../lib/data";
import PaymentsClient from "./PaymentsClient";

export default async function PaymentsPage() {
  const initialPayments = await getPayments();
  return <PaymentsClient initialPayments={initialPayments} />;
}
