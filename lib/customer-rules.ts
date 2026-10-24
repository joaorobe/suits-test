import { isoDate, requireValue, text, today } from './rules';

export function validCpf(raw: string) {
  const cpf = raw.replace(/\D/g, '');
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false;
  for (let length = 9; length <= 10; length++) {
    const sum = [...cpf.slice(0, length)].reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const check = (sum * 10) % 11 % 10;
    if (check !== Number(cpf[length])) return false;
  }
  return true;
}

export function contacts(payload: Record<string, unknown>) {
  const name = text(payload.name, 'Nome completo', 200);
  requireValue(name.length >= 2, 'Informe seu nome completo.');
  const phone = text(payload.phone, 'Telefone', 30).replace(/\D/g, '');
  const email = text(payload.email, 'E-mail', 254).toLowerCase();
  requireValue(/^\d{10,13}$/.test(phone), 'Informe um telefone com DDD.');
  requireValue(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Informe um e-mail válido.');
  return { name, phone, email };
}

export function period(start: unknown, end: unknown, future = true) {
  const startsOn = isoDate(start);
  const endsOn = isoDate(end);
  requireValue(endsOn >= startsOn, 'A devolução deve ser no mesmo dia ou depois da retirada.');
  requireValue(!future || startsOn >= today(), 'Escolha uma retirada a partir de hoje.');
  const days = Math.max(1, Math.round((Date.parse(endsOn) - Date.parse(startsOn)) / 86400000));
  requireValue(days <= 30, 'Solicite períodos de até 30 dias. Para períodos maiores, fale com a alfaiataria.');
  return { startsOn, endsOn, days };
}

export function quote(price: number | null, days: number) {
  if (price == null || price <= 0) return null;
  return Math.round(price * (days === 7 ? 4.9 : days) * 100) / 100;
}

export const measurementLabels: Record<string, string> = {
  chest: 'Tórax', waist: 'Cintura', hips: 'Quadril', shoulder: 'Ombro', sleeve: 'Manga', inseam: 'Entreperna', length: 'Comprimento', height: 'Altura',
};
