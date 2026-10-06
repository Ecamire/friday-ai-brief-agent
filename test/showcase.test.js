import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderHtml } from '../src/render.js';
import { coveredBy, normalizeUrl } from '../src/coverage.js';
import { makeBudget } from '../src/cost.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/newsletter.json',import.meta.url),'utf8'));

test('the keyless fixture renders the newsletter, source links, and story navigation',()=>{
 const html=renderHtml(fixture,{}, {date:'2026-10-06'});
 for(const section of fixture.sections) assert.ok(html.includes(section.heading));
 assert.ok(html.includes('October 2026'));
 assert.ok(html.includes('href="#story-0"'));
 assert.ok(html.includes('https://example.com/'));
 assert.ok(html.includes('Local showcase'));
 assert.doesNotMatch(html,/<form\b|fetch\(|\/api\/newsletter|friday-ai-brief\.netlify|unsubscribe|track\.openhour/i);
});

test('headings and supplied image URLs cannot inject HTML attributes',()=>{
 const copy=structuredClone(fixture);copy.sections[0].heading='<script>bad()</script>';
 const html=renderHtml(copy,{}, {date:'2026-10-06',imageUrls:{'section-0':'https://example.com/photo.jpg" onerror="bad()'}});
 assert.ok(html.includes('&lt;script&gt;bad()&lt;/script&gt;'));
 assert.doesNotMatch(html,/<script>bad|src="[^"]*" onerror=/);
});

test('coverage recognizes an already covered URL despite tracking parameters',()=>{
 const url='https://www.example.com/launch/?utm_source=sample#update';
 const entry={slug:'sample-prior-issue',date:'2026-09-25',heading:'A prior launch'};
 const coverage={ok:true,urls:new Map([[normalizeUrl(url),entry]]),subjects:[]};
 assert.deepEqual(coveredBy(coverage,{link:'http://example.com/launch'}),{...entry,how:'url'});
 assert.equal(coveredBy(coverage,{link:'https://example.com/new-story'}),null);
});

test('a weak topic mention alone does not suppress a fresh story',()=>{
 const coverage={ok:true,urls:new Map(),subjects:[{slug:'prior',date:'2026-09-25',heading:'Sample launch',strong:['Harbor Tools'],weak:['draft','agent']}]};
 assert.equal(coveredBy(coverage,{title:'A new draft tool'}),null);
 assert.equal(coveredBy(coverage,{title:'The Harbor Tools update'}).how,'subject');
 assert.equal(coveredBy(coverage,{title:'A draft agent update'}).how,'mention');
 assert.equal(coveredBy({ok:false},{title:'The Harbor Tools update'}),null);
});

test('the budget helper reserves headroom before a further paid step',()=>{
 const budget=makeBudget(0.2);
 budget.add(0.1,'sample usage');
 assert.equal(budget.canAfford(0.08),true);
 assert.equal(budget.canAfford(0.09),false);
 budget.add(0.2,'sample overrun');
 assert.equal(budget.remaining(),0);
 assert.equal(budget.canAfford(0),false);
});
