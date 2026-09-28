import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractionContract, feedItemExtractionInput, parseStrictExtraction } from '../src/extractors.ts';

const valid = {title:'Refund',summary:'Official refund',category:'refund',claimUrl:'https://agency.gov/refund',deadline:'2026-12-31',eligibilityText:'Purchased X',proofRequired:['receipt'],confidence:.9,warnings:[]};
test('strict extraction accepts only the review contract',()=>{ assert.deepEqual(parseStrictExtraction(JSON.stringify(valid)),valid); assert.match(extractionContract.instruction,/human review/i); });
test('strict extraction rejects prose, unknown fields and missing confidence',()=>{ assert.throws(()=>parseStrictExtraction('Refund available'),/JSON/i); assert.throws(()=>parseStrictExtraction(JSON.stringify({...valid,publish:true})),/Unknown/); const {confidence,...rest}=valid; assert.throws(()=>parseStrictExtraction(JSON.stringify(rest)),/confidence/i); });
test('feed facts are serialized without inventing fields',()=>{ assert.deepEqual(JSON.parse(feedItemExtractionInput({title:'Notice',link:'https://agency.gov/x'})),{title:'Notice',url:'https://agency.gov/x',description:null,publishedAt:null}); });
