import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tokens,grade,emptyState,validateState} from '../src/core.js';
const qs=[{id:27,answer:'C'},{id:32,answer:'shells'},{id:33,answer:'lake'},{id:34,answer:'rainfall'}];
test('scoring trims whitespace and ignores case, but rejects extra words and wrong plural',()=>{
 assert.equal(grade(qs,{27:' c ',32:'SHELLS',33:'lake',34:' Rainfall '}).score,4);
 assert.equal(grade(qs,{27:'C or H',32:'shell',33:'a lake',34:'rain'}).score,0);
 assert.equal(grade(qs,{}).score,0);
});
test('tokenization preserves possessives and hyphenated terms; indices are stable',()=>{
 const text='Singh’s glacier-fed rivers: well-argued speculation.';
 const ts=tokens(text);assert.deepEqual(ts.map(t=>t.form),['singh’s','glacier-fed','rivers','well-argued','speculation']);
 ts.forEach((t,i)=>{assert.equal(text.slice(t.start,t.start+t.text.length),t.text);assert.equal(t.index,i)});
});
const vocab={relevant:{lemma:'relevant'},flourished:{lemma:'flourish'}};
const sentences=new Set(['A1','H2']);
test('learning backup roundtrip retains bookmarks, answers, attempts and reading anchor',()=>{
 const s=emptyState();s.bookmarks.relevant={form:'relevant',mastered:true,reviewed:2,nextReview:123};s.answers[32]='shells';s.attempts=[{answers:{32:'shells'},timestamp:'2026-10-11'}];s.mistakes[27]={count:2,answer:'A',resolved:false};s.progress={sentenceId:'H2',offset:-112,percent:80};s.tab='vocab';
 const r=validateState(JSON.parse(JSON.stringify(s)),vocab,sentences);assert.equal(r.bookmarks.relevant.mastered,true);assert.equal(r.answers[32],'shells');assert.equal(r.attempts[0].answers[32],'shells');assert.equal(r.mistakes[27].count,2);assert.deepEqual(r.progress,s.progress);assert.equal(r.tab,'vocab');
});
test('import rejects wrong article, invalid words and malformed bookmarks',()=>{
 assert.throws(()=>validateState({version:2,articleId:'other'},vocab,sentences));
 const s=emptyState();s.bookmarks.bad={form:'bad'};assert.throws(()=>validateState(s,vocab,sentences));
 s.bookmarks=[];assert.throws(()=>validateState(s,vocab,sentences));
});
test('import sanitizes unknown fields, unsafe counts and invalid progress anchors',()=>{
 const s=emptyState();s.progress={sentenceId:'Z99',offset:Infinity};s.fontSize=1000;s.tab='bad';s.answers={32:'x'.repeat(200),99:'extra'};s.injected='<script>';
 const r=validateState(s,vocab,sentences);assert.equal(r.progress,null);assert.equal(r.fontSize,20);assert.equal(r.tab,'read');assert.equal(r.answers[32].length,100);assert.equal(r.answers[99],undefined);assert.equal(r.injected,undefined);
});
