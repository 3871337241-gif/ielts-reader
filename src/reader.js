import {STORAGE_KEY,LEGACY_KEY,tokens,emptyState,validateState,migrateLegacy} from './core.js?v=20261011-library3.1';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let library,lexicon,legacyVocab,legacyAnalysis,state,article,sentenceMap={},occurrences=Object.create(null),trigger,selectedNote,selectedForm,selectedContext,toastTimer,scrollTimer,restoring=false,requestId=0,reviewList=[],reviewIndex=0,reveal=false,annotation=false;
const books=new Map(),scrolls={library:0,vocab:0};
const posLabels={n:'名词',a:'形容词',adj:'形容词',ad:'副词',adv:'副词',r:'副词',v:'动词',vi:'不及物动词',vt:'及物动词',prep:'介词',pron:'代词',conj:'连词',art:'冠词',int:'感叹词',det:'限定词',aux:'助动词',num:'数词'};
const articleLabel=id=>{const a=library.articles.find(a=>a.id===id);return a?`剑雅 ${a.book} · Test ${a.test} · Passage ${a.passage}`:''};
const reading=()=>state.readings[article?.id]??={progress:null,completed:false};
function toast(t){$('#toast').textContent=t;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,3000)}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));$('#save-status').textContent='✓ 已保存到当前浏览器'}catch{$('#save-status').textContent='请导出备份保存';toast('浏览器存储空间不足或不可用，请导出学习记录')}}
function hash(h){if(location.hash!==h)history.pushState(null,'',h)}
async function fetchJSON(path){const r=await fetch(path,{cache:'no-cache'});if(!r.ok)throw Error('无法载入 '+path);return r.json()}
function noteFor(form,sid){
 const v=article?.id==='c13-t3-p3'?legacyVocab[form]:null;
 if(v)return {...v,contextZh:v.contexts[sid]||v.contextZh,verified:true};
 const n=lexicon[form]||{lemma:form,pos:'未核实',commonZh:'词库未收录此词形，请在词典核对。',verified:false};
 const basic=n.basic?legacyVocab[form]:null;
 return {...n,lemma:basic?.lemma||n.lemma,pos:basic?.pos||n.pos.split(/\s*\/\s*/).map(p=>posLabels[p.replace('.','')]||p).join(' / '),commonZh:basic?.commonZh||n.commonZh,contextZh:'',morphology:n.lemma!==form?`词典记录的词形还原：${form} → ${n.lemma}。这不是词源说明。`:'没有已核实的词根词缀拆解；不强行拆分。'};
}
function textHTML(text,sid){let start=0,out='';for(const t of tokens(text)){const n=noteFor(t.form,sid);out+=esc(text.slice(start,t.start));out+=`<button type="button" class="word ${n.basic?'basic':'learn'} ${Object.hasOwn(state.bookmarks,n.lemma)?'saved':''}" data-word="${esc(t.form)}" data-sentence="${esc(sid)}" data-token="${t.index}" aria-label="查看 ${esc(t.text)} 词卡">${esc(t.text)}</button>`;start=t.start+t.text.length}return out+esc(text.slice(start))}
function settings(){
 $('#read').classList.toggle('all-words',state.showAll);$('#read').style.setProperty('--reader-size',state.fontSize+'px');$('#font').textContent='Aa '+state.fontSize;
 $('#all-words').setAttribute('aria-pressed',String(state.showAll));$('#all-words').textContent=state.showAll?'全部词已突出':'突出全部词';
 $('#annotation').hidden=article?.id!=='c13-t3-p3';$('#annotation').setAttribute('aria-pressed',String(annotation));$('#annotation').textContent=annotation?'关闭长句精读':'长句精读';
 document.querySelectorAll('.long-sentence').forEach(e=>e.remove());
 if(annotation&&article?.id==='c13-t3-p3')for(const n of legacyAnalysis.sentences){const el=document.createElement('details');el.className='long-sentence';el.innerHTML=`<summary>${n.id} 句 · 主干与断句</summary><p lang="en">${esc(n.main)}</p>${n.parts.map(p=>`<p>${esc(p)}</p>`).join('')}`;$('#sentence-'+n.id)?.closest('.paragraph').after(el)}
}
function counts(){
 $('#vocab-count').textContent=Object.keys(state.bookmarks).length;
 const r=article?reading():null,p=r?.completed?100:Math.round(r?.progress?.percent||0);
 $('#progress-label').textContent=p+'%';$('#progress-fill').style.width=state.tab==='read'?p+'%':'0';$('#rail-fill').style.width=p+'%';$('#complete').textContent=r?.completed?'✓ 已完成阅读':'○ 标记阅读完成';
 document.querySelectorAll('.word').forEach(w=>w.classList.toggle('saved',Object.hasOwn(state.bookmarks,noteFor(w.dataset.word,w.dataset.sentence).lemma)));
}
function passageHTML(a){const r=state.readings[a.id],p=r?.completed?'✓ 已读完':r?.progress?`已读 ${Math.round(r.progress.percent)}%`:'开始阅读';return `<button class="passage-card" data-article="${a.id}"><span class="passage-number">PASSAGE ${a.passage}</span><strong lang="en">${esc(a.title)}</strong><span>${a.wordCount} 词 <i>·</i> ${p} <b>→</b></span></button>`}
function renderLibrary(){
 const term=$('#search').value.trim().toLowerCase();let html='';
 $('#library-description').textContent=`17 册 · ${library.articles.length} 篇 Academic 阅读。按册数 → Test → Passage 选择文章。`;
 if(term){const matches=library.articles.filter(a=>a.title.toLowerCase().includes(term)||String(a.book)===term);html=`<div class="catalog-heading"><h2>搜索结果 · ${matches.length} 篇</h2></div><div class="passage-grid">${matches.map(a=>`<div class="search-result"><small>${articleLabel(a.id)}</small>${passageHTML(a)}</div>`).join('')}</div>`}
 else if(state.libraryBook){const b=library.books.find(b=>b.number===state.libraryBook);html=`<div class="catalog-heading"><button class="secondary" data-catalog-root>← 全部册数</button><h2>剑雅 ${b.number}</h2><span>${b.count} 篇阅读</span></div>`+b.tests.map(t=>`<details class="test-group" ${state.libraryTest===t?'open':''}><summary>Test ${t}<span>3 篇阅读</span></summary><div class="passage-grid">${library.articles.filter(a=>a.book===b.number&&a.test===t).map(passageHTML).join('')}</div></details>`).join('')}
 else html=`${state.selectedArticleId?`<button class="continue-card" data-article="${state.selectedArticleId}"><small>继续上次阅读</small><strong>${articleLabel(state.selectedArticleId)}</strong><span>→</span></button>`:''}<div class="book-grid">${library.books.map(b=>{const done=library.articles.filter(a=>a.book===b.number&&state.readings[a.id]?.completed).length;return `<button class="book-card" data-book="${b.number}"><small>CAMBRIDGE IELTS</small><strong>${b.number}</strong><span>剑雅 ${b.number}</span><p>${b.count} 篇 · ${done} 篇已读完</p><b>打开目录 →</b></button>`}).join('')}</div>`;
 $('#library-content').innerHTML=html;
}
function breadcrumb(){if(state.tab==='read'&&article)$('#breadcrumb').innerHTML=`<button data-book="${article.book}">剑雅 ${article.book}</button><i>/</i><button data-book="${article.book}" data-test="${article.test}">TEST ${article.test}</button><i>/</i>READING PASSAGE ${article.passage}`;else $('#breadcrumb').textContent=state.tab==='vocab'?'YOUR WORD COLLECTION · 全书库生词本':'CAMBRIDGE IELTS · READING LIBRARY'}
function changeTab(tab,{capture=true,restore=true,route=true}={}){
 if(tab==='read'&&!article){toast('请先从目录选择一篇文章');tab='library'}
 if(capture&&state.tab==='read')captureProgress();else scrolls[state.tab]=window.scrollY;
 state.tab=tab;for(const v of document.querySelectorAll('.view'))v.hidden=v.id!==tab;
 $('.study-rail').hidden=tab!=='read';$('.layout').classList.toggle('catalog-mode',tab!=='read');
 document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.toggleAttribute('aria-current',b.dataset.tab===tab)});
 if(tab==='library')renderLibrary();if(tab==='vocab')renderVocab();breadcrumb();counts();save();
 if(route)hash(tab==='read'?`#article=${article.id}`:tab==='vocab'?'#vocab':state.libraryBook?`#book=${state.libraryBook}${state.libraryTest?'&test='+state.libraryTest:''}`:'#');
 if(restore){restoring=true;if(tab==='read')restoreRead();else window.scrollTo({top:scrolls[tab]||0,behavior:'instant'});requestAnimationFrame(()=>restoring=false)}
}
async function openArticle(id,{route=true,anchor=null}={}){
 const entry=library.articles.find(a=>a.id===id);if(!entry)return;
 closeCard();if(state.tab==='read')captureProgress();const request=++requestId;
 $('#save-status').textContent='正在载入文章…';
 try{if(!books.has(entry.book))books.set(entry.book,await fetchJSON(`content/book-${entry.book}.json`));if(request!==requestId)return;
  article=books.get(entry.book).articles[id];if(!article)throw Error('文章数据缺失');state.selectedArticleId=id;state.libraryBook=article.book;state.libraryTest=article.test;annotation=false;
  sentenceMap=Object.fromEntries(article.paragraphs.flatMap(p=>p.sentences).map(s=>[s.id,s]));sentenceMap.title={id:'title',text:article.title};sentenceMap.subtitle={id:'subtitle',text:article.subtitle};occurrences=Object.create(null);
  for(const p of article.paragraphs)for(const s of p.sentences)for(const t of tokens(s.text)){const n=noteFor(t.form,s.id);(occurrences[n.lemma]??=[]).push({sentenceId:s.id,form:t.text,tokenIndex:t.index,label:p.label||p.id})}
  $('#title').innerHTML=textHTML(article.title,'title');$('#title').setAttribute('aria-label',article.title);$('#subtitle').innerHTML=textHTML(article.subtitle,'subtitle');$('#subtitle').hidden=!article.subtitle;
  $('#article').innerHTML=article.paragraphs.map(p=>`<p class="paragraph" id="paragraph-${p.id}"><span class="paragraph-label">${esc(p.label||p.id)}</span>${p.sentences.map(s=>`<span class="sentence" id="sentence-${s.id}" data-sentence-id="${s.id}">${textHTML(s.text,s.id)}</span>`).join(' ')}</p>`).join('');
  $('#paragraph-nav').innerHTML=article.paragraphs.map(p=>`<button data-jump="${p.sentences[0].id}" aria-label="跳到 ${esc(p.label||p.id)} 段">${esc(p.label||p.id)}</button>`).join('');
  $('#article-meta').textContent=`${article.wordCount} 词 · 约 20 分钟`;
  $('#rail-source').textContent=`剑雅 ${article.book} · Test ${article.test}\nPassage ${article.passage}\nPDF 第 ${article.source.filePages.join('、')} 页`;
  $('#original').open=false;const sourceNotes=[...(article.source.method==='逐句核对'?[]:['扫描整理文本，尚未逐字人工审校；可对照原书核对。']),...(article.notes||[])];$('#source-notes').textContent=sourceNotes.join(' ');$('#source-notes').hidden=!sourceNotes.length;$('#original-content').innerHTML=`<a href="${article.source.image}" target="_blank" rel="noopener"><img loading="lazy" src="${article.source.image}" alt="${esc(articleLabel(id))} 原书对照"></a>`;
  const index=library.articles.findIndex(a=>a.id===id);$('#previous').disabled=index===0;$('#next').disabled=index===library.articles.length-1;
  settings();changeTab('read',{capture:false,route});if(anchor)jump(anchor);document.title=`剑雅 ${article.book} · Test ${article.test} · Passage ${article.passage} | IELTS Reader`;
 }catch(e){toast(e.message);$('#save-status').textContent='载入失败，可再次打开重试'}
}
function captureProgress(){if(!article||state.tab!=='read'||restoring)return;const header=$('.header').getBoundingClientRect().height+12;const ss=[...document.querySelectorAll('#article .sentence')];const chosen=ss.find(s=>s.getBoundingClientRect().bottom>header)||ss.at(-1);if(!chosen)return;const start=$('#article').getBoundingClientRect().top+scrollY,end=$('#article').getBoundingClientRect().bottom+scrollY-innerHeight;reading().progress={sentenceId:chosen.dataset.sentenceId,offset:scrollY-(chosen.getBoundingClientRect().top+scrollY),percent:Math.max(0,Math.min(100,(scrollY-start)/Math.max(1,end-start)*100))};save();counts()}
function restoreRead(){const p=reading().progress,el=p?$('#sentence-'+p.sentenceId):null;restoring=true;window.scrollTo({top:el?el.getBoundingClientRect().top+scrollY+p.offset:0,behavior:'instant'});requestAnimationFrame(()=>restoring=false)}
function jump(sid){closeCard();const el=$('#sentence-'+sid);if(!el){toast('此原句位置无法恢复，请从文章继续阅读');return}changeTab('read',{capture:false,restore:false});document.querySelectorAll('.evidence-highlight').forEach(e=>e.classList.remove('evidence-highlight'));el.classList.add('evidence-highlight');el.scrollIntoView({block:'center',behavior:'instant'});captureProgress()}
function closeCard(){if($('#word-card').hidden)return;$('#word-card').hidden=true;$('#overlay').hidden=true;$('#workspace').inert=false;$('.header').inert=false;trigger?.isConnected&&trigger.focus({preventScroll:true});if('speechSynthesis'in window)speechSynthesis.cancel()}
function showCard(note,form,context,el){
 captureProgress();
 selectedNote=note;selectedForm=form;selectedContext=context;trigger=el;
 const saved=Object.hasOwn(state.bookmarks,note.lemma),others=context.articleId===article?.id?(occurrences[note.lemma]||[]).filter(o=>o.sentenceId!==context.sentenceId||String(o.tokenIndex)!==el?.dataset.token):[];
 const stored=state.bookmarks[note.lemma]?.contexts||[];
 $('#card-content').innerHTML=`<h2 id="card-title" lang="en">${esc(form)}</h2><div class="word-meta">原形 <b lang="en">${esc(note.lemma)}</b> · ${esc(note.pos)}<br>${esc(articleLabel(context.articleId))}</div><div class="word-actions"><button class="secondary" id="pronounce">▶ 英式发音</button><button class="primary" id="bookmark">${saved?'★ 已收藏 · 取消':'☆ 收藏'}</button></div><h3 class="word-meta">${note.contextZh?'本句中的意思':'词典释义 · 请结合原句'}</h3><p class="context-meaning">${esc(note.contextZh||note.commonZh)}</p><div class="card-section"><h3>本文例句</h3><div class="card-example" lang="en">${esc(context.text)}</div></div><div class="card-section"><h3>常见义（其他语境）</h3><p class="dictionary-meaning">${esc(note.commonZh)}</p></div><div class="card-section"><h3>构词 / 词根词缀</h3><p>${esc(note.morphology)}</p></div>${note.definition?`<div class="card-section"><h3>词典英文释义</h3><p class="dictionary-meaning" lang="en">${esc(note.definition)}</p></div>`:''}<div class="card-section"><h3>本篇其他出现位置 · 按原形合并</h3>${others.length?others.map(o=>`<button class="pill" data-jump="${o.sentenceId}" title="${esc(sentenceMap[o.sentenceId].text)}">${esc(o.label)} 段 · ${esc(o.form)}</button>`).join(''):'<p class="quiet">本篇没有其他已记录位置。</p>'}</div><div class="card-section"><h3>收藏出处</h3>${[context,...stored.filter(c=>c.articleId!==context.articleId||c.sentenceId!==context.sentenceId)].map(c=>`<button class="pill" data-context-article="${c.articleId}" data-context-sentence="${esc(c.sentenceId)}">${esc(articleLabel(c.articleId))} · 回到原句 ↗</button>`).join('')}</div><a class="dictionary-link" href="https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(note.lemma)}" target="_blank" rel="noopener">在 Cambridge Dictionary 核对词典 →</a><div class="source-note">${note.contextZh?'语境义为已有学习注释。':'常见义来自 ECDICT 词库，未把多义词自动判定为单一语境义。'} 未收录的词形和未核实的词根不作推测。</div>`;
 document.querySelectorAll('.word.selected').forEach(w=>w.classList.remove('selected'));el?.classList.add('selected');$('#word-card').hidden=false;$('#overlay').hidden=false;$('#word-card').scrollTop=0;$('#workspace').inert=true;$('.header').inert=true;$('#close-card').focus({preventScroll:true});
 if(saved&&context.text){const prior=stored.find(c=>c.articleId===context.articleId&&c.sentenceId===context.sentenceId);if(!prior){state.bookmarks[note.lemma].contexts=[...stored,context].slice(-12);save()}else if(!prior.text){prior.text=context.text;save()}}
}
function speak(){if(!('speechSynthesis'in window)){toast('请打开词典听发音');return}const u=new SpeechSynthesisUtterance(selectedNote.lemma);u.lang='en-GB';u.rate=.85;const v=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase()==='en-gb');if(v)u.voice=v;else toast('已请求英国英语；实际声音取决于设备语音');u.onerror=()=>toast('发音不可用，请打开词典听发音');speechSynthesis.cancel();speechSynthesis.speak(u)}
function renderVocab(){const entries=Object.entries(state.bookmarks);$('#vocab-content').innerHTML=entries.length?`<div class="book-tools"><span>${entries.length} 个原形 · ${entries.filter(([,b])=>b.mastered).length} 个已掌握</span><button class="primary" id="start-review">开始生词复习</button></div><div id="review"></div>${entries.map(([lemma,b])=>`<div class="vocab-row"><div><button class="word-link" data-saved-word="${esc(lemma)}">${esc(lemma)}</button><p>${esc(b.note.contextZh||b.note.commonZh.split('\n')[0])} · ${b.mastered?'✓ 已掌握':'待复习'}</p><small>${esc(articleLabel(b.contexts[0]?.articleId))}</small></div><button class="secondary" data-master="${esc(lemma)}">${b.mastered?'再复习':'标记掌握'}</button><button class="icon-button" data-remove="${esc(lemma)}" aria-label="取消收藏 ${esc(lemma)}">×</button></div>`).join('')}`:'<div class="empty"><span class="empty-symbol">☆</span>收藏从一个好奇的单词开始。<br>在原文词卡中点击「收藏」。</div>'}
function renderReview(){const box=$('#review');if(reviewIndex>=reviewList.length){box.innerHTML='<div class="review-box">✓ 本轮复习完成。</div>';return}const lemma=reviewList[reviewIndex],n=state.bookmarks[lemma].note;box.innerHTML=`<div class="review-box"><div class="rail-kicker">${reviewIndex+1} / ${reviewList.length} · 回忆词义</div><h2>${esc(lemma)}</h2>${reveal?`<p class="dictionary-meaning">${esc(n.contextZh||n.commonZh)}</p><div class="review-controls"><button class="secondary" data-rate="again">还不熟悉</button><button class="primary" data-rate="good">已经记住</button></div>`:'<button id="flip-review" class="secondary">翻卡查看释义</button>'}</div>`}
function exportState(){captureProgress();const data=JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2);$('#backup-json').value=data;$('#backup-fallback').hidden=false;const url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='ielts-reader-library-backup.json';a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出全书库学习记录')}
async function importState(file){if(!file)return;try{if(file.size>10*1024*1024)throw Error('备份文件超过 10 MB');const input=JSON.parse(await file.text()),ids=new Set(library.articles.map(a=>a.id));state=input.version===2?migrateLegacy(input,legacyVocab,ids):validateState(input,ids);closeCard();save();if(state.tab==='read'&&state.selectedArticleId)await openArticle(state.selectedArticleId);else changeTab(state.tab,{capture:false});toast('已恢复生词与各篇阅读进度')}catch(e){toast('导入失败：'+e.message)}finally{$('#import').value=''}}
document.addEventListener('click',async e=>{
 const word=e.target.closest('[data-word]');if(word){const sid=word.dataset.sentence;showCard(noteFor(word.dataset.word,sid),word.textContent,{articleId:article.id,sentenceId:sid,text:sentenceMap[sid].text,form:word.dataset.word},word);return}
 const tab=e.target.closest('[data-tab]');if(tab){closeCard();if(tab.dataset.tab==='read'&&!article&&state.selectedArticleId)await openArticle(state.selectedArticleId);else changeTab(tab.dataset.tab);return}
 const book=e.target.closest('[data-book]');if(book){state.libraryBook=Number(book.dataset.book);state.libraryTest=Number(book.dataset.test)||null;$('#search').value='';changeTab('library');window.scrollTo({top:0,behavior:'instant'});return}
 if(e.target.closest('[data-catalog-root]')){state.libraryBook=null;state.libraryTest=null;changeTab('library');return}
 const a=e.target.closest('[data-article]');if(a){await openArticle(a.dataset.article);return}
 const j=e.target.closest('[data-jump]');if(j){jump(j.dataset.jump);return}
 const c=e.target.closest('[data-context-article]');if(c){await openArticle(c.dataset.contextArticle,{anchor:c.dataset.contextSentence});return}
 const w=e.target.closest('[data-saved-word]');if(w){const b=state.bookmarks[w.dataset.savedWord],c=b.contexts[0]||{articleId:state.selectedArticleId,sentenceId:'title',text:''};if(!c.text){const a=library.articles.find(a=>a.id===c.articleId);if(a){try{if(!books.has(a.book))books.set(a.book,await fetchJSON(`content/book-${a.book}.json`));const original=books.get(a.book).articles[a.id];c.text=original.paragraphs.flatMap(p=>p.sentences).find(s=>s.id===c.sentenceId)?.text||original.title;save()}catch{toast('原句暂未载入，可稍后再次打开')}}}showCard(b.note,b.form,c,w);return}
 const m=e.target.closest('[data-master]');if(m){state.bookmarks[m.dataset.master].mastered=!state.bookmarks[m.dataset.master].mastered;save();renderVocab();return}
 const rm=e.target.closest('[data-remove]');if(rm){delete state.bookmarks[rm.dataset.remove];save();renderVocab();counts();return}
 if(e.target.closest('#bookmark')){const lemma=selectedNote.lemma;if(Object.hasOwn(state.bookmarks,lemma))delete state.bookmarks[lemma];else state.bookmarks[lemma]={form:selectedForm,note:selectedNote,mastered:false,reviewed:0,nextReview:0,savedAt:new Date().toISOString(),contexts:[{...selectedContext,contextZh:selectedNote.contextZh}]};save();counts();$('#bookmark').textContent=Object.hasOwn(state.bookmarks,lemma)?'★ 已收藏 · 取消':'☆ 收藏';return}
 if(e.target.closest('#pronounce')){speak();return}
 if(e.target.closest('#start-review')){reviewList=Object.keys(state.bookmarks).sort((a,b)=>state.bookmarks[a].nextReview-state.bookmarks[b].nextReview);reviewIndex=0;reveal=false;renderReview();return}
 if(e.target.closest('#flip-review')){reveal=true;renderReview();return}
 const rate=e.target.closest('[data-rate]');if(rate){const b=state.bookmarks[reviewList[reviewIndex]],good=rate.dataset.rate==='good';b.mastered=good;b.reviewed++;b.nextReview=Date.now()+(good?3*86400000:600000);save();reviewIndex++;reveal=false;renderReview()}
});
$('#search').oninput=renderLibrary;$('#close-card').onclick=closeCard;$('#overlay').onclick=closeCard;$('#resume').onclick=()=>{changeTab('read',{capture:false});restoreRead()};$('#complete').onclick=()=>{reading().completed=!reading().completed;save();counts()};
$('#all-words').onclick=()=>{state.showAll=!state.showAll;settings();save()};$('#font').onclick=()=>{const sizes=[18,20,22,24];state.fontSize=sizes[(sizes.indexOf(state.fontSize)+1)%4];settings();save()};$('#annotation').onclick=()=>{annotation=!annotation;settings()};
for(const [id,delta] of [['previous',-1],['next',1]])$('#'+id).onclick=()=>{const i=library.articles.findIndex(a=>a.id===article.id);const a=library.articles[i+delta];if(a)openArticle(a.id)};
$('#export').onclick=exportState;$('#import').onchange=e=>importState(e.target.files[0]);
$('.brand').onclick=e=>{e.preventDefault();state.libraryBook=null;state.libraryTest=null;closeCard();changeTab('library')};
document.addEventListener('keydown',e=>{if($('#word-card').hidden)return;if(e.key==='Escape'){e.preventDefault();closeCard()}if(e.key==='Tab'){const nodes=[...$('#word-card').querySelectorAll('button,a[href]')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault()}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault()}}});
$('#overlay').addEventListener('wheel',e=>e.preventDefault(),{passive:false});$('#overlay').addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
window.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(captureProgress,180)},{passive:true});window.addEventListener('pagehide',captureProgress);
document.addEventListener('visibilitychange',()=>{if(document.hidden)captureProgress()});
async function route(){const p=new URLSearchParams(location.hash.slice(1));if(p.has('article'))await openArticle(p.get('article'),{route:false});else if(location.hash==='#vocab')changeTab('vocab',{route:false});else{state.libraryBook=Number(p.get('book'))||null;state.libraryTest=Number(p.get('test'))||null;changeTab('library',{route:false})}}
window.addEventListener('hashchange',()=>{if(library)route()});
async function start(){try{
 [library,lexicon,legacyVocab,legacyAnalysis]=await Promise.all(['content/library.json','content/lexicon.json','content/c13-t3-p3/vocabulary.json','content/c13-t3-p3/analysis.json'].map(fetchJSON));
 const ids=new Set(library.articles.map(a=>a.id));state=emptyState();
 try{const raw=localStorage.getItem(STORAGE_KEY);if(raw)state=validateState(JSON.parse(raw),ids);else{const old=localStorage.getItem(LEGACY_KEY);if(old)state=migrateLegacy(JSON.parse(old),legacyVocab,ids)}}catch{toast('旧记录无法解析，原始记录仍保留，可导入备份恢复')}
 const tab=state.tab;renderLibrary();counts();if(location.hash&&location.hash!=='#')await route();else if(tab==='read'&&state.selectedArticleId)await openArticle(state.selectedArticleId);else changeTab(tab,{capture:false});
 if('speechSynthesis'in window)speechSynthesis.getVoices();
 }catch(e){$('#library-content').innerHTML=`<div class="error">${esc(e.message)}<br>请刷新重试，已保存的学习记录仍在当前浏览器。</div>`}}
start();
