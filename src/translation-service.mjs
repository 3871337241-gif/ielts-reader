export const MAX_SELECTION_LENGTH=3000;
export const normalizeSelection=text=>String(text||'').replace(/\s+/g,' ').trim();

// MyMemory accepts at most 500 UTF-8 bytes per request. Keep sentences or
// clauses together where possible, and never split a word or Unicode character.
export function translationChunks(text){
 const clean=normalizeSelection(text);
 if(!clean)throw Error('请先选择英文原文。');
 if(clean.length>MAX_SELECTION_LENGTH)throw Error('选择的内容较长，请分段翻译（每次最多 3000 个字符）。');
 const encoder=new TextEncoder(),chunks=[];let rest=clean;
 while(rest){
  let count=0,end=0;
  for(const char of rest){const bytes=encoder.encode(char).length;if(count+bytes>500)break;count+=bytes;end+=char.length;}
  if(end===rest.length){chunks.push(rest);break;}
  const slice=rest.slice(0,end);
  let split=-1;for(const match of slice.matchAll(/[.!?;:]\s+|,\s+/g))if(match.index>100)split=match.index+match[0].length;
  if(split<0)split=slice.lastIndexOf(' ');
  if(split<=0)throw Error('所选内容包含过长的连续词，请缩小选择范围。');
  chunks.push(rest.slice(0,split).trim());rest=rest.slice(split).trim();
 }
 return chunks;
}

export async function translateText(text,{signal,fetchImpl=fetch}={}){
 const translations=[];
 for(const chunk of translationChunks(text)){
  const url=new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q',chunk);url.searchParams.set('langpair','en|zh-CN');url.searchParams.set('mt','1');
  const response=await fetchImpl(url,{signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(response.status===429)throw Error('翻译服务的使用额度暂时用完，请稍后重试。');
  if(!response.ok)throw Error('翻译服务暂时不可用，请稍后重试。');
  const result=await response.json();
  if(result.quotaFinished||Number(result.responseStatus)===429)throw Error('翻译服务的使用额度暂时用完，请稍后重试。');
  if(Number(result.responseStatus)!==200||typeof result.responseData?.translatedText!=='string'||!result.responseData.translatedText.trim())throw Error('未取得译文，请稍后重试。');
  translations.push(result.responseData.translatedText.trim());
 }
 return translations.join('\n');
}
