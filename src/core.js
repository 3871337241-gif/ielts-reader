export const STORAGE_KEY='ielts-reader-library-v3';
export const LEGACY_KEY='ielts-reader-study-v2';
export const WORD_RE=/\p{Script=Latin}+(?:[-’']\p{Script=Latin}+)*/gu;
export const formKey=word=>word.toLowerCase().replaceAll("'",'’').normalize('NFKD').replace(/\p{M}/gu,'');
export const tokens=text=>[...text.matchAll(WORD_RE)].map((m,index)=>({text:m[0],form:formKey(m[0]),index,start:m.index}));
export const emptyState=()=>({version:3,bookmarks:{},readings:{},selectedArticleId:null,tab:'library',libraryBook:null,libraryTest:null,fontSize:20,showAll:false});
const str=(x,max=2000)=>typeof x==='string'?x.slice(0,max):'';
const safeKey=x=>typeof x==='string'&&/^[a-z]+(?:[-’][a-z]+)*$/.test(x);
const count=x=>Number.isSafeInteger(x)?Math.max(0,Math.min(x,1000000)):0;
export function validateState(input,articleIds){
 if(!input||input.version!==3||Array.isArray(input)||typeof input!=='object')throw Error('不是有效的阅读书库备份');
 const s=emptyState();
 if(!input.bookmarks||typeof input.bookmarks!=='object'||Array.isArray(input.bookmarks))throw Error('生词记录格式错误');
 for(const [lemma,b] of Object.entries(input.bookmarks)){
  if(!safeKey(lemma)||!b||typeof b!=='object'||!b.note)throw Error('备份包含无效生词');
  const n=b.note;
  s.bookmarks[lemma]={form:str(b.form,120),mastered:b.mastered===true,reviewed:count(b.reviewed),nextReview:Number.isFinite(b.nextReview)?Math.max(0,b.nextReview):0,savedAt:str(b.savedAt,50),note:{lemma,pos:str(n.pos,200),commonZh:str(n.commonZh),contextZh:str(n.contextZh),morphology:str(n.morphology),definition:str(n.definition),basic:n.basic===true,verified:n.verified===true},contexts:[]};
  if(Array.isArray(b.contexts))for(const c of b.contexts.slice(-12))if(c&&articleIds.has(c.articleId))s.bookmarks[lemma].contexts.push({articleId:c.articleId,sentenceId:str(c.sentenceId,80),text:str(c.text,5000),form:str(c.form,120),contextZh:str(c.contextZh)});
 }
 if(input.readings&&typeof input.readings==='object')for(const [id,r] of Object.entries(input.readings))if(articleIds.has(id)&&r&&typeof r==='object'){
  s.readings[id]={completed:r.completed===true,progress:null};
  const p=r.progress;if(p&&typeof p.sentenceId==='string')s.readings[id].progress={sentenceId:str(p.sentenceId,80),offset:Number.isFinite(p.offset)?Math.max(-1000,Math.min(p.offset,20000)):0,percent:Number.isFinite(p.percent)?Math.max(0,Math.min(p.percent,100)):0};
 }
 s.selectedArticleId=articleIds.has(input.selectedArticleId)?input.selectedArticleId:null;
 s.tab=['library','read','vocab'].includes(input.tab)?input.tab:'library';
 s.libraryBook=Number.isInteger(input.libraryBook)&&input.libraryBook>=4&&input.libraryBook<=20?input.libraryBook:null;
 s.libraryTest=Number.isInteger(input.libraryTest)&&input.libraryTest>=1&&input.libraryTest<=8?input.libraryTest:null;
 s.fontSize=[18,20,22,24].includes(input.fontSize)?input.fontSize:20;s.showAll=input.showAll===true;
 return s;
}
export function migrateLegacy(old,vocabulary,articleIds){
 const s=emptyState();if(!old||old.version!==2||old.articleId!=='c13-t3-p3'||!articleIds.has(old.articleId))return s;
 s.selectedArticleId=old.articleId;s.fontSize=[18,20,22,24].includes(old.fontSize)?old.fontSize:20;s.showAll=old.showAll===true;
 s.readings[old.articleId]={completed:old.completed===true,progress:old.progress};
 for(const [lemma,b] of Object.entries(old.bookmarks||{})){
  const v=vocabulary[b.form];if(!safeKey(lemma)||!v)continue;
  s.bookmarks[lemma]={...b,note:{lemma:v.lemma,pos:v.pos,commonZh:v.commonZh,contextZh:v.contextZh,morphology:v.morphology,definition:'',basic:v.basic,verified:true},contexts:[{articleId:old.articleId,sentenceId:v.occurrences?.[0]?.sentenceId||'H2',text:'',form:b.form,contextZh:v.contextZh}]};
 }
 return validateState(s,articleIds);
}
