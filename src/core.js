export const ARTICLE_ID = 'c13-t3-p3';
export const STORAGE_KEY = 'ielts-reader-study-v2';
export const WORD_RE = /[A-Za-z]+(?:[-’'][A-Za-z]+)*/g;
export const formKey = word => word.toLowerCase().replaceAll("'", '’');
export function tokens(text) {
  return [...text.matchAll(WORD_RE)].map((m, index) => ({text:m[0], form:formKey(m[0]), index, start:m.index}));
}
export function grade(questions, answers) {
  const results = questions.map(q => {
    const answer = typeof answers[q.id] === 'string' ? answers[q.id].trim() : '';
    return {id:q.id, answer, correct:answer.toLowerCase() === q.answer.toLowerCase()};
  });
  return {score:results.filter(r=>r.correct).length, total:questions.length, results};
}
export function emptyState() {
  return {version:2, articleId:ARTICLE_ID, bookmarks:{}, answers:{}, attempts:[], mistakes:{}, progress:null, tab:'read', showAll:false, annotation:false, fontSize:20, completed:false};
}
export function validateState(input, vocabulary, sentenceIds) {
  if (!input || input.version !== 2 || input.articleId !== ARTICLE_ID || typeof input !== 'object' || Array.isArray(input)) throw new Error('不是本篇阅读器的有效学习备份');
  const state = emptyState();
  const validLemmas = new Set(Object.values(vocabulary).map(v=>v.lemma));
  if (!input.bookmarks || Array.isArray(input.bookmarks) || typeof input.bookmarks !== 'object') throw new Error('生词记录格式错误');
  for (const [word, entry] of Object.entries(input.bookmarks)) {
    if (!validLemmas.has(word) || !entry || typeof entry !== 'object') throw new Error('备份包含无效生词');
    state.bookmarks[word] = {form:Object.hasOwn(vocabulary,entry.form)?entry.form:Object.keys(vocabulary).find(w=>vocabulary[w].lemma===word), mastered:entry.mastered===true, reviewed:Number.isSafeInteger(entry.reviewed)?Math.max(0,entry.reviewed):0, savedAt:typeof entry.savedAt==='string'?entry.savedAt.slice(0,50):'', nextReview:Number.isFinite(entry.nextReview)?entry.nextReview:0};
  }
  const readAnswers = obj => {
    const out = {};
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;
    for (let n=27;n<=40;n++) if (typeof obj[n]==='string') out[n]=obj[n].slice(0,100);
    return out;
  };
  state.answers=readAnswers(input.answers);
  if (Array.isArray(input.attempts)) state.attempts=input.attempts.slice(-20).filter(a=>a&&typeof a==='object').map(a=>({answers:readAnswers(a.answers), timestamp:typeof a.timestamp==='string'?a.timestamp.slice(0,50):''}));
  if(input.mistakes&&typeof input.mistakes==='object') for(let n=27;n<=40;n++) if(input.mistakes[n]&&Number.isSafeInteger(input.mistakes[n].count)) state.mistakes[n]={count:Math.max(1,input.mistakes[n].count),answer:typeof input.mistakes[n].answer==='string'?input.mistakes[n].answer.slice(0,100):'',resolved:input.mistakes[n].resolved===true};
  if(input.progress&&sentenceIds.has(input.progress.sentenceId)) state.progress={sentenceId:input.progress.sentenceId,offset:Number.isFinite(input.progress.offset)?Math.max(-1000,Math.min(10000,input.progress.offset)):0,percent:Number.isFinite(input.progress.percent)?Math.max(0,Math.min(100,input.progress.percent)):0};
  state.tab=['read','quiz','vocab','wrong'].includes(input.tab)?input.tab:'read';
  state.showAll=input.showAll===true; state.annotation=input.annotation===true;
  state.completed=input.completed===true; state.fontSize=[18,20,22,24].includes(input.fontSize)?input.fontSize:20;
  return state;
}
