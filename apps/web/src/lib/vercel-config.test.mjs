import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Vercel schedules ingestion daily alongside maintenance jobs', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../../../../vercel.json', import.meta.url), 'utf8'));
  assert.equal(config.framework, 'nextjs');
  assert.equal(config.buildCommand, 'pnpm --filter @lo-lyfe/web build');
  assert.equal(config.outputDirectory, 'apps/web/.next');
  assert.deepEqual(config.crons, [
    { path: '/api/cron/ingestion', schedule: '0 13 * * *' },
    { path: '/api/cron/expire', schedule: '23 3 * * *' },
    { path: '/api/cron/dead-links', schedule: '41 4 * * *' },
    { path: '/api/cron/reminders', schedule: '7 14 * * *' },
  ]);
});
