import type { CatalogItem } from './customer-types';

export const recommendationWeights = { event: 20, color: 15, style: 15, budget: 20, size: 15, measurements: 15 };
export type RecommendationWeights = typeof recommendationWeights;
export type RecommendationPreferences = { event?: string; color?: string; style?: string; budget?: number; size?: number };
export type GarmentMetadata = { events?: string[]; styles?: string[]; measurements?: Record<string, number> };
export type Recommendation = { score: number | null; reasons: string[]; comparedMeasurements: number };
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export function scoreGarment(item: CatalogItem, metadata: GarmentMetadata, preferences: RecommendationPreferences, body: Record<string, number> | null, weights: RecommendationWeights = recommendationWeights): Recommendation {
  let earned = 0, possible = 0, comparedMeasurements = 0;
  const reasons: string[] = [];
  const add = (key: keyof RecommendationWeights, match: number, reason: string) => {
    const weight = weights[key];
    if (!Number.isFinite(weight) || weight < 0) throw new Error('Peso de recomendação inválido.');
    possible += weight; earned += weight * match;
    if (match > 0 && weight > 0) reasons.push(reason);
  };
  if (preferences.event) add('event', metadata.events?.some(value => normalized(value) === normalized(preferences.event!)) ? 1 : 0, 'Indicado pela alfaiataria para este evento');
  if (preferences.color) add('color', normalized(item.color) === normalized(preferences.color) ? 1 : 0, 'Cor da sua preferência');
  if (preferences.style) add('style', metadata.styles?.some(value => normalized(value) === normalized(preferences.style!)) ? 1 : 0, 'Estilo da sua preferência');
  if (preferences.budget != null) add('budget', item.estimate != null && item.estimate <= preferences.budget ? 1 : 0, 'Estimativa do período dentro do orçamento');
  if (preferences.size != null) add('size', item.size === preferences.size ? 1 : 0, 'Tamanho solicitado');
  if (body && metadata.measurements) {
    const comparisons = ['chest', 'waist', 'hips'].filter(key => Number.isFinite(body[key]) && Number.isFinite(metadata.measurements![key]));
    comparedMeasurements = comparisons.length;
    if (comparisons.length) {
      const matches = comparisons.filter(key => { const ease = metadata.measurements![key] - body[key]; return ease >= 2 && ease <= 12; }).length;
      add('measurements', matches / comparisons.length, `${matches} de ${comparisons.length} medidas com folga de referência`);
    }
  }
  return { score: possible > 0 ? Math.round(earned / possible * 100) : null, reasons, comparedMeasurements };
}

export function rankRecommendations<T extends CatalogItem & { recommendation?: Recommendation }>(items: T[]): T[] {
  return [...items].sort((a, b) => Number(b.available) - Number(a.available) || (b.recommendation?.score ?? -1) - (a.recommendation?.score ?? -1) || a.title.localeCompare(b.title, 'pt-BR'));
}
