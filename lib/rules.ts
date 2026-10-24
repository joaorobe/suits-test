export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new HttpError(400, message);
}

export function money(value: unknown, label: string, allowZero = false) {
  requireValue(typeof value === 'number' && Number.isFinite(value) && value >= (allowZero ? 0 : 0.01) && value <= 99999999, `${label} inválido.`);
  requireValue(Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, `${label} deve ter no máximo duas casas decimais.`);
  return value;
}

export function text(value: unknown, label: string, max = 500) {
  requireValue(typeof value === 'string' && value.trim().length > 0 && value.length <= max, `${label} inválido.`);
  return value.trim();
}

export function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function dueDate(plan: 'Diário' | 'Semanal', start = today()) {
  const date = new Date(`${start}T12:00:00Z`);
  if (plan === 'Semanal') date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString().slice(0, 10);
}

export function rentalPrice(price: number, plan: 'Diário' | 'Semanal') {
  return Math.round(price * (plan === 'Semanal' ? 4.9 : 1) * 100) / 100;
}

export function isoDate(value: unknown) {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'Data inválida.');
  const parsed = new Date(value + 'T12:00:00Z');
  requireValue(!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value, 'Data inválida.');
  return value;
}

export function allowedUpdates(updates: Record<string, unknown>, fields: readonly string[]) {
  requireValue(Object.keys(updates).every(key => fields.includes(key)), 'Campo de atualização inválido.');
  return updates;
}
