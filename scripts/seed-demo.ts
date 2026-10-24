import { randomUUID } from 'node:crypto';
import { closeDatabase, withTransaction } from '../lib/db';
import { hashPassword } from '../lib/passwords.mjs';
import { createRental } from '../lib/rentals';
import { requestEvent } from '../lib/notifications';
import { today } from '../lib/rules';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, demoEnvironment } from './demo-config.mjs';

function day(offset: number) {
  const value = new Date(today() + 'T12:00:00Z');
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

async function seed() {
  if (process.env.SUITS_DEMO !== '1' || process.env.NODE_ENV === 'production') {
    throw new Error('Execute este script somente pelo comando npm run dev:demo.');
  }
  demoEnvironment(process.env.DATABASE_URL ?? '');
  const password = await hashPassword(DEMO_PASSWORD);
  await withTransaction(async client => {
    await client.query('CREATE TABLE IF NOT EXISTS demo_seed_versions(version text PRIMARY KEY)');
    await client.query('SELECT pg_advisory_xact_lock(73194022)');
    if ((await client.query("SELECT 1 FROM demo_seed_versions WHERE version='v1'")).rowCount) {
      console.log('Dados demo existentes preservados.');
      return;
    }
    for (const account of DEMO_ACCOUNTS) {
      await client.query('INSERT INTO users(id,cpf,password,name,role,email,phone) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [account.id, account.cpf, password, account.name, account.role, account.id + '@suits.invalid', '11999999999']);
    }
    const person = { id: 'demo-person', name: 'Cliente Demo', phone: '11999999999', email: 'demo-client@suits.invalid' };
    await client.query('INSERT INTO clients(id,name,phone,email,user_id) VALUES ($1,$2,$3,$4,$5)',
      [person.id, person.name, person.phone, person.email, 'demo-client']);
    const garments = [
      ['demo-black', 'Terno preto clássico', 'Paletó e calça para ocasiões especiais', 42, 'Preto', 'Terno clássico', 290],
      ['demo-navy', 'Terno azul-marinho', 'Conjunto de corte moderno', 40, 'Azul-marinho', 'Terno moderno', 320],
      ['demo-grey', 'Terno cinza', 'Conjunto para eventos durante o dia', 44, 'Cinza', 'Terno clássico', 280],
      ['demo-green', 'Terno verde', 'Paletó e calça com acabamento especial', 38, 'Verde', 'Terno moderno', 350],
      ['demo-upcoming', 'Traje para próximo evento', 'Exemplo de reserva futura confirmada', 42, 'Azul', 'Terno moderno', 290],
      ['demo-adjustment', 'Traje em ajuste', 'Exemplo de atendimento em preparação', 42, 'Preto', 'Terno clássico', 290],
      ['demo-history', 'Traje do último evento', 'Exemplo de aluguel já devolvido', 40, 'Cinza', 'Terno clássico', 290],
      ['demo-pending', 'Traje solicitado online', 'Exemplo de solicitação aguardando análise', 44, 'Preto', 'Terno clássico', 290],
    ];
    for (const [id, title, subtitle, size, color, category, price] of garments) {
      await client.query(`INSERT INTO inventory(id,title,subtitle,sku,status,size,color,location,stock,image,action,price_category,price)
        VALUES ($1,$2,$3,$1,'Disponível',$4,$5,'Estoque Central',1,'/terno1.jpg','Reservar Traje',$6,$7)`,
      [id, title, subtitle, size, color, category, price]);
    }
    const upcomingItem = (await client.query("SELECT * FROM inventory WHERE id='demo-upcoming'")).rows[0];
    const upcoming = await createRental(client, upcomingItem, person,
      { plan: 'Diário', amount: 290, entry: 0, start: day(2), end: day(3), scheduled: true });
    await client.query(`INSERT INTO reservation_requests(id,client_id,inventory_id,starts_on,ends_on,status,rental_id,quoted_amount)
      VALUES ('demo-upcoming-request',$1,$2,$3,$4,'confirmed',$5,290)`, [person.id, upcomingItem.id, day(2), day(3), upcoming.rentalId]);
    await requestEvent(client, 'demo-upcoming-request', 'pending', 'Solicitação de demonstração enviada.');
    await requestEvent(client, 'demo-upcoming-request', 'scheduled', 'Reserva de demonstração confirmada pela alfaiataria.');

    const adjustmentItem = (await client.query("SELECT * FROM inventory WHERE id='demo-adjustment'")).rows[0];
    const adjustment = await createRental(client, adjustmentItem, person,
      { plan: 'Diário', amount: 290, entry: 50, start: day(0), end: day(3), tailorId: 'demo-tailor', adjustment: 'Ajuste de barra', description: 'Ajuste demonstrativo de 2 cm.', measurements: 'Cintura: 82 cm; entreperna: 78 cm.' });
    await client.query(`INSERT INTO reservation_requests(id,client_id,inventory_id,starts_on,ends_on,status,rental_id,quoted_amount)
      VALUES ('demo-adjustment-request',$1,$2,$3,$4,'confirmed',$5,290)`, [person.id, adjustmentItem.id, day(0), day(3), adjustment.rentalId]);
    await requestEvent(client, 'demo-adjustment-request', 'scheduled', 'Reserva de demonstração confirmada.');
    await requestEvent(client, 'demo-adjustment-request', 'preparing', 'A costureira está preparando o traje de demonstração.');

    const historyItem = (await client.query("SELECT * FROM inventory WHERE id='demo-history'")).rows[0];
    const history = await createRental(client, historyItem, person,
      { plan: 'Diário', amount: 290, entry: 50, start: day(-10), end: day(-9), scheduled: true });
    await client.query("UPDATE rentals SET stage='returned',created_at=$1,picked_up_at=$1,returned_at=$2 WHERE id=$3", [day(-10) + 'T12:00:00Z', day(-9) + 'T12:00:00Z', history.rentalId]);
    await client.query("UPDATE payments SET paid_amount=amount,status='Pago' WHERE rental_id=$1", [history.rentalId]);
    await client.query("UPDATE return_orders SET status='Devolvido',returned_date=$1,amount_paid=290,laundry_status='Concluído',action='Entregue' WHERE rental_id=$2", [day(-9) + 'T12:00:00Z', history.rentalId]);
    await client.query(`INSERT INTO reservation_requests(id,client_id,inventory_id,starts_on,ends_on,quoted_amount)
      VALUES ('demo-pending-request',$1,'demo-pending',$2,$3,290)`, [person.id, day(1), day(2)]);
    await requestEvent(client, 'demo-pending-request', 'pending', 'Solicitação de demonstração aguardando aprovação.');
    await client.query('INSERT INTO client_measurements(id,client_id,taken_by,measurements) VALUES ($1,$2,$3,$4)',
      [randomUUID(), person.id, 'demo-admin', JSON.stringify({ chest: 98, waist: 82, shoulder: 46, sleeve: 62, inseam: 78, height: 178 })]);
    await client.query("INSERT INTO demo_seed_versions(version) VALUES ('v1')");
    console.log('Contas, catálogo, reservas, medidas e histórico demonstrativos criados.');
  });
}

seed().catch(error => { console.error(error); process.exitCode = 1; }).finally(closeDatabase);
