import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseJsonFeed, parseSyndicationFeed } from '../src/connectors.ts';

test('RSS connector extracts raw official feed facts', () => {
  const [item] = parseSyndicationFeed(`<rss><channel><item><title>Refund &amp; notice</title><link>https://agency.gov/refund</link><description><![CDATA[Official <b>refund</b> notice]]></description><pubDate>Sun, 28 Sep 2026 00:00:00 GMT</pubDate></item></channel></rss>`);
  assert.equal(item.title, 'Refund & notice');
  assert.equal(item.link, 'https://agency.gov/refund');
  assert.match(item.description ?? '', /Official refund notice/);
});
test('Atom connector reads href links', () => {
  const [item] = parseSyndicationFeed(`<feed><entry><title>Grant</title><link href="https://agency.gov/grant"/><summary>Apply now</summary></entry></feed>`);
  assert.equal(item.link, 'https://agency.gov/grant');
});
test('JSON Feed connector accepts only bounded item fields', () => {
  const [item] = parseJsonFeed(JSON.stringify({items:[{title:' Notice ',external_url:'https://agency.gov/x',content_text:'Details'}]}));
  assert.deepEqual(item, {title:'Notice',link:'https://agency.gov/x',description:'Details',publishedAt:undefined});
});
test('feed parsers reject invalid or oversized input', () => {
  assert.throws(() => parseSyndicationFeed('<rss/>'), /entries/i);
  assert.throws(() => parseJsonFeed('{}'), /items/i);
  assert.throws(() => parseJsonFeed('x'.repeat(2_000_001)), /size/i);
});
