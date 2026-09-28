import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findLikelyDuplicate, lifecycleStatus, textSimilarity } from '../src/dedupe.ts';

test('canonical URL is a deterministic duplicate key', () => {
  const existing=[{id:'1',canonicalUrl:'https://agency.gov/a',title:'Refund notice',summary:'Product refund available',deadline:'2026-12-01'}];
  assert.equal(findLikelyDuplicate({...existing[0],id:undefined} as never, existing)?.id,'1');
});
test('same-deadline highly similar copy is caught before embeddings', () => {
  const existing=[{id:'1',canonicalUrl:'https://agency.gov/a',title:'Widget refund notice',summary:'Refund for qualifying widget purchases',deadline:'2026-12-01'}];
  const hit=findLikelyDuplicate({canonicalUrl:'https://admin.gov/b',title:'Widget refund notice',summary:'Refund for qualifying widget purchases now',deadline:'2026-12-01'},existing);
  assert.equal(hit?.id,'1');
  assert.ok(textSimilarity('refund qualifying widget','refund qualifying widget purchases')>0.7);
});
test('lifecycle distinguishes expiry dead links and transient failures', () => {
  const now=new Date('2026-09-28T12:00:00Z');
  assert.equal(lifecycleStatus('2026-09-27',200,now),'expired');
  assert.equal(lifecycleStatus('2026-12-01',404,now),'dead-link');
  assert.equal(lifecycleStatus('2026-12-01',503,now),'retry');
  assert.equal(lifecycleStatus('2026-12-01',200,now),'active');
});
