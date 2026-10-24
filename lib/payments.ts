import { withTransaction } from './db';
import { rowToPaymentRecord } from './data';
import { HttpError, money, text } from './rules';

export async function recordPayment(payload: Record<string, unknown>) {
  const id = text(payload.id, 'Pagamento');
  const received = money(payload.paidAmount, 'Valor recebido');
  const expected = money(payload.expectedPaidAmount, 'Valor anteriormente recebido', true);
  return withTransaction(async client => {
    const result = await client.query('SELECT * FROM payments WHERE id=$1 FOR UPDATE', [id]);
    const payment = result.rows[0];
    if (!payment) throw new HttpError(404, 'Pagamento não encontrado.');
    const before = Math.round(Number(payment.paid_amount ?? 0) * 100);
    if (before !== Math.round(expected * 100)) throw new HttpError(409, 'Este pagamento já foi atualizado. Recarregue a página antes de registrar outro recebimento.');
    const total = Math.round(Number(payment.amount) * 100);
    const paid = before + Math.round(received * 100);
    if (paid > total) throw new HttpError(409, 'O recebimento supera o saldo em aberto.');
    const changed = await client.query('UPDATE payments SET paid_amount=$1,status=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3 RETURNING *', [paid / 100, paid === total ? 'Pago' : 'Pendente', id]);
    if (payment.rental_id && payment.payment_type === 'Aluguel') await client.query('UPDATE return_orders SET amount_paid=$1 WHERE rental_id=$2', [paid / 100, payment.rental_id]);
    return rowToPaymentRecord(changed.rows[0]);
  });
}
