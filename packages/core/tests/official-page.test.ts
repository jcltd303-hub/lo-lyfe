import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseOfficialPage } from '../src/official-page.ts';

test('official page connector extracts bounded visible links and facts',()=>{
 const items=parseOfficialPage('<html><head><title>FTC Refunds</title></head><body><h1>Refund programs</h1><p>Consumers may qualify.</p><a href="/refund/a">Program A</a><script>secret()</script></body></html>','https://www.ftc.gov/refunds');
 assert.equal(items[0].link,'https://www.ftc.gov/refund/a'); assert.equal(items[0].title,'Program A'); assert.match(items[0].description??'',/Consumers may qualify/); assert.doesNotMatch(items[0].description??'',/secret/);
});
test('official page connector requires https and bounds input',()=>{ assert.throws(()=>parseOfficialPage('<p>x</p>','http://agency.gov'),/HTTPS/); assert.throws(()=>parseOfficialPage('x'.repeat(3_000_001),'https://agency.gov'),/size/); });
test('directory page drops nav/footer/aside links and text-less share links',()=>{
 const items=parseOfficialPage('<html><head><title>Unclaimed Money</title></head><body><header><a href="https://www.usa.gov/">Home</a></header><nav><a href="https://www.usa.gov/about">About</a></nav><main><a href="https://www.irs.gov/refunds">Tax refunds</a><a href="https://www.facebook.com/sharer/sharer.php?u=x"></a></main><footer><a href="https://www.usa.gov/contact">Contact</a></footer><aside><a href="https://www.usa.gov/sidebar">Sidebar</a></aside></body></html>','https://www.usa.gov/unclaimed-money');
 assert.equal(items.length,1); assert.equal(items[0].link,'https://www.irs.gov/refunds'); assert.equal(items[0].title,'Tax refunds');
});
