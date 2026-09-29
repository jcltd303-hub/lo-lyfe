import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Vercel schedules one daily ingestion job', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../../../../vercel.json', import.meta.url), 'utf8'));
  assert.equal(config.framework, 'nextjs');
  assert.equal(config.buildCommand, 'pnpm --filter @lo-lyfe/web build');
  assert.equal(config.outputDirectory, 'apps/web/.next');
  assert.deepEqual(config.crons, [{ path: '/api/cron/ingestion', schedule: '0 13 * * *' }]);
});
