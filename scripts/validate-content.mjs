import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {tokens} from '../src/core.js';
const root=path.resolve(import.meta.dirname,'..');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8'));
const article=read('content/c13-t3-p3/article.json'), vocabulary=read('content/c13-t3-p3/vocabulary.json'), questions=read('content/c13-t3-p3/questions.json'), analysis=read('content/c13-t3-p3/analysis.json'), source=read('verification/source-check.json');
assert.deepEqual(article.paragraphs.map(p=>p.id),[...'ABCDEFGH']);
assert.deepEqual(questions.questions.map(q=>q.id),Array.from({length:14},(_,i)=>27+i));
assert.deepEqual(questions.groups.flatMap(g=>g.questionIds),questions.questions.map(q=>q.id));
const sentences=new Map(article.paragraphs.flatMap(p=>p.sentences.map(s=>[s.id,s.text])));
assert.equal(sentences.size,article.paragraphs.flatMap(p=>p.sentences).length);
for(const p of article.paragraphs){
 const hash=crypto.createHash('sha256').update(p.sentences.map(s=>s.text).join(' ').match(/[A-Za-z0-9]+/g).join(' ')).digest('hex');
 assert.equal(hash,source.paragraphWordHashes[p.id],`source mismatch ${p.id}`);
}
let tokenCount=0;
for(const [sid,text] of [...sentences,['title',article.title],['subtitle',article.subtitle]]) for(const t of tokens(text)){
 tokenCount++;
 assert(vocabulary[t.form],`No card for ${sid}: ${t.form}`);
 const v=vocabulary[t.form];
 for(const key of ['lemma','pos','contextZh','commonZh','morphology']) assert(v[key]&&!/待补充|待核实/.test(v[key]),`Missing ${key}: ${t.form}`);
}
for(const [form,v] of Object.entries(vocabulary)){
 for(const o of v.occurrences){assert(sentences.has(o.sentenceId));const token=tokens(sentences.get(o.sentenceId))[o.tokenIndex];assert(token);assert.equal(vocabulary[token.form].lemma,v.lemma);assert.equal(token.text,o.form)}
 for(const [sid] of Object.entries(v.contexts)) assert(sentences.has(sid));
 for(const link of v.questionLinks){assert(questions.questions.some(q=>q.id===link.questionId));assert(sentences.has(link.sentenceId))}
}
for(const q of questions.questions){assert.equal(q.answer,source.officialAnswers[q.id]);const a=analysis.questions.find(a=>a.questionId===q.id);assert(a?.logic&&a.trap&&a.paraphrase);assert(a.evidence.length);for(const e of a.evidence)assert.equal(e.quote,sentences.get(e.sentenceId));if(q.id>=32&&q.id<=36)assert(article.paragraphs.some(p=>p.sentences.some(s=>tokens(s.text).some(t=>t.form===q.answer))))}
const summary=questions.groups[1].paragraphs.join(' ');
assert.deepEqual([...summary.matchAll(/\{\{(\d+)\}\}/g)].map(m=>Number(m[1])),[32,33,34,35,36]);
assert(summary.includes('extended period of drought.'));
assert(summary.includes('links between inhabitants of different parts of the region and whether these changed over time.'));
assert(questions.groups[0].instructions.at(-1).includes('more than once'));
assert(questions.groups[2].instructions.at(-1).includes('more than once'));
console.log(`PASS: A–H, 32 sentences, 14 official questions/answers, ${tokenCount} clickable tokens, ${Object.keys(vocabulary).length} complete word forms; all evidence and occurrence links resolve.`);
