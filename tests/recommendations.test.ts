import test from 'node:test';
import assert from 'node:assert/strict';
import { rankRecommendations, recommendationWeights, scoreGarment } from '../lib/recommendations';
import type { CatalogItem } from '../lib/customer-types';
const item: CatalogItem = { id: 'a', title: 'Traje', description: '', image: '', category: '', color: 'Preto', size: 42, price: 100, estimate: 300, available: true };

test('weighted recommendations explain matches using full period budget and normalized metadata', () => {
  const result = scoreGarment(item, { events: ['Formatura'], styles: ['Clássico'] }, { event: 'formatura', color: 'preto', style: 'classico', budget: 300, size: 42 }, null);
  assert.equal(result.score, 100); assert.equal(result.reasons.length, 5);
  assert.equal(scoreGarment(item, {}, { budget: 200 }, null).score, 67);
  assert.equal(scoreGarment({ ...item, estimate: null }, {}, { budget: 400 }, null).score, null);
});
test('unknown event and style metadata does not zero the quiz score', () => {
  const result = scoreGarment(item, {}, { event: 'Casamento', style: 'Clássico', color: 'Preto', budget: 350 }, null);
  assert.equal(result.score, 100);
  assert.deepEqual(result.reasons, ['Cor da sua preferência', 'Estimativa do período dentro do orçamento']);
});
test('recommendations give partial budget compatibility instead of zero for near misses', () => {
  const result = scoreGarment(item, {}, { event: 'Formatura', style: 'Slim', color: 'Azul', budget: 200 }, null);
  assert.equal(result.score, 38);
  assert.deepEqual(result.reasons, ['Estimativa próxima ao orçamento escolhido']);
});
test('missing measurements are not inferred from clothing size or penalized', () => {
  assert.equal(scoreGarment(item, {}, {}, null).score, null);
  assert.equal(scoreGarment(item, {}, { size: 42 }, { chest: 100 }).score, 100);
  assert.equal(scoreGarment(item, { measurements: { chest: 106, waist: 85 } }, {}, { chest: 100, waist: 90 }).score, 50);
  assert.equal(scoreGarment(item, { measurements: { chest: 100 } }, {}, { chest: 100 }).score, 0);
});
test('unavailable garments cannot outrank reservable ones; scores and ordering are deterministic', () => {
  const low = { ...item, recommendation: { score: 10, reasons: [], comparedMeasurements: 0 } };
  const unavailable = { ...item, id: 'b', available: false, recommendation: { score: 100, reasons: [], comparedMeasurements: 0 } };
  assert.equal(rankRecommendations([unavailable, low])[0].id, 'a');
  assert.equal(scoreGarment(item, {}, { color: 'Preto', size: 44 }, null, { ...recommendationWeights, color: 30, size: 10 }).score, 75);
  assert.throws(() => scoreGarment(item, {}, { color: 'Preto' }, null, { ...recommendationWeights, color: -1 }));
});
