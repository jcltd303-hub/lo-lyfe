import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('ingestion does not parse raw official-page prose as strict extraction JSON',()=>{const src=fs.readFileSync(new URL('./ingestion-worker.ts',import.meta.url),'utf8');assert.doesNotMatch(src,/parseStrictExtraction\(item\.description\)/);assert.match(src,/extractCandidate/)});
