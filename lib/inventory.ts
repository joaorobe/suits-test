import { allowedUpdates, money, requireValue, text } from './rules';

export function validateInventory(item: Record<string, unknown>) {
  allowedUpdates(item, ['title','subtitle','sku','status','size','color','location','stock','image','action','priceCategory','price']);
  for (const field of ['title','subtitle','sku','color','location','action']) if (field in item) text(item[field], field);
  if ('image' in item) requireValue(typeof item.image === 'string' && item.image.length <= 3000000, 'Imagem inválida.');
  if ('priceCategory' in item && item.priceCategory != null) text(item.priceCategory, 'Categoria');
  if ('price' in item && item.price != null) money(item.price, 'Preço', true);
  if ('size' in item) requireValue(Number.isInteger(item.size) && Number(item.size) > 0 && Number(item.size) <= 100, 'Tamanho inválido.');
  if ('stock' in item) requireValue(Number.isInteger(item.stock) && Number(item.stock) >= 0, 'Estoque inválido.');
  if ('status' in item) requireValue(['Disponível','Alugado','Costureira','Lavanderia','Reservado'].includes(String(item.status)), 'Status inválido.');
}
