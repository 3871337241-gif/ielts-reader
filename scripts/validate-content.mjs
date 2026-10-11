import fs from 'node:fs';import assert from 'node:assert/strict';import {tokens} from '../src/core.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const library=read('content/library.json'),lexicon=read('content/lexicon.json');
assert.equal(library.articles.length,204);assert.equal(library.books.length,17);const ids=new Set();let count=0,lettered=0;
for(const b of library.books){assert(b.number>=4&&b.number<=20);assert.equal(b.count,12);const data=read(b.path);assert.equal(Object.keys(data.articles).length,12);for(const entry of library.articles.filter(a=>a.book===b.number)){
 assert(!ids.has(entry.id));ids.add(entry.id);const a=data.articles[entry.id];assert.equal(a.title,entry.title);assert.equal(a.book,b.number);assert(a.paragraphs.length);const labels=a.paragraphs.map(p=>p.label).filter(l=>/^[A-Z]$/.test(l));assert.deepEqual(labels,a.source.sectionLabels,entry.id+' printed section labels');if(labels.length){lettered++;assert.deepEqual(labels,Array.from({length:labels.length},(_,i)=>String.fromCharCode(65+i)),entry.id+' non-consecutive section labels')}const sentenceIds=new Set();
 assert(!/Write the correct|List of Headings|Questions\s+\d+\s*[-–]/i.test(a.title),entry.id+' question text in title');
 for(const p of a.paragraphs)for(const s of p.sentences){assert(!sentenceIds.has(s.id),entry.id+' duplicate sentence '+s.id);sentenceIds.add(s.id);assert(!/facebook\.com\/IELTSVN/i.test(s.text),entry.id+' scanned watermark in prose');assert(!/Write the correct|in boxes \d+|List of Headings/i.test(s.text),entry.id+' question text in article');for(const t of tokens(s.text)){assert(lexicon[t.form],entry.id+' missing '+t.form);count++}}
 assert(fs.existsSync(new URL('../'+a.source.image,import.meta.url)),entry.id+' source image missing');assert(a.source.filePages.length);assert(/^[a-f0-9]{64}$/.test(a.source.sha256));
}}
assert.deepEqual(library.books.find(b=>b.number===12).tests,[5,6,7,8]);
for(const [id,n] of [['c4-t1-p1',11],['c9-t1-p3',6],['c9-t4-p1',10],['c10-t4-p1',10]])assert.equal(read(`content/book-${id.match(/^c(\d+)/)[1]}.json`).articles[id].paragraphs.length,n,id+' indented paragraph boundaries');
assert.equal(lettered,87,'all source-lettered readings checked');
const get=id=>read(`content/book-${id.match(/^c(\d+)/)[1]}.json`).articles[id];
const para=(id,label)=>get(id).paragraphs.find(p=>p.label===label).sentences.map(s=>s.text).join(' ');
assert(para('c11-t3-p3','C').startsWith('I hope this book'),'sentence initial I retained');
assert(para('c11-t3-p3','G').includes('I hope you will share'),'later prose initial I retained');
assert(para('c11-t3-p3','G').startsWith('A physician wrote'),'scanned word boundary repaired');
assert(para('c14-t2-p3','H').startsWith('A word of warning'),'indefinite article retained');
assert(/call these ['‘"]junk trees['’"], and they/.test(para('c18-t1-p2','B')),'horizontal line fragments remain in reading order');
assert.equal(fs.readdirSync(new URL('../content/originals/',import.meta.url)).filter(n=>n.endsWith('.jpg')).length,204);
console.log(`PASS: 17 books, 204 readings, ${count} clickable body words, ${Object.keys(lexicon).length} dictionary forms; source images, hierarchy, unique anchors, 87 complete lettered section sequences and OCR regression cases checked.`);
