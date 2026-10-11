import fs from 'node:fs';import assert from 'node:assert/strict';import {tokens} from '../src/core.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const library=read('content/library.json'),lexicon=read('content/lexicon.json');
assert.equal(library.articles.length,204);assert.equal(library.books.length,17);const ids=new Set();let count=0;
for(const b of library.books){assert(b.number>=4&&b.number<=20);assert.equal(b.count,12);const data=read(b.path);assert.equal(Object.keys(data.articles).length,12);for(const entry of library.articles.filter(a=>a.book===b.number)){
 assert(!ids.has(entry.id));ids.add(entry.id);const a=data.articles[entry.id];assert.equal(a.title,entry.title);assert.equal(a.book,b.number);assert(a.paragraphs.length);const sentenceIds=new Set();
 assert(!/Write the correct|List of Headings|Questions\s+\d+\s*[-–]/i.test(a.title),entry.id+' question text in title');
 for(const p of a.paragraphs)for(const s of p.sentences){assert(!sentenceIds.has(s.id),entry.id+' duplicate sentence '+s.id);sentenceIds.add(s.id);assert(!/Write the correct|in boxes \d+|List of Headings/i.test(s.text),entry.id+' question text in article');for(const t of tokens(s.text)){assert(lexicon[t.form],entry.id+' missing '+t.form);count++}}
 assert(fs.existsSync(new URL('../'+a.source.image,import.meta.url)),entry.id+' source image missing');assert(a.source.filePages.length);assert(/^[a-f0-9]{64}$/.test(a.source.sha256));
}}
assert.deepEqual(library.books.find(b=>b.number===12).tests,[5,6,7,8]);
console.log(`PASS: 17 books, 204 readings, ${count} clickable body words, ${Object.keys(lexicon).length} dictionary forms; source images, hierarchy, unique anchors and paragraph boundaries checked.`);
