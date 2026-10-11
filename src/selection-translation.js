import {normalizeSelection,translateText} from './translation-service.mjs?v=20261011-translation1';

export function initSelectionTranslation({readRoot,wordCard,closeWordCard,beforeOpen}){
 const tools=readRoot.querySelector('.reading-tools>div'),modeButton=document.createElement('button');
 modeButton.type='button';modeButton.className='tool-button';modeButton.id='selection-mode';modeButton.textContent='划词翻译';modeButton.setAttribute('aria-pressed','false');tools.append(modeButton);
 const hint=document.createElement('p');hint.className='selection-hint';hint.hidden=true;hint.textContent='长按或拖选英文，再点击「翻译所选」。结束后点「退出划词」，即可继续点击单词查词。';readRoot.querySelector('.reading-tools').after(hint);
 const ui=document.createElement('div');ui.innerHTML='<button id="translate-selection" class="primary selection-action" hidden>翻译所选</button><div id="translation-overlay" class="overlay" hidden></div><aside id="translation-panel" class="translation-panel" role="dialog" aria-modal="true" aria-labelledby="translation-title" hidden><div class="translation-top"><h2 id="translation-title">选文翻译</h2><button id="close-translation" class="icon-button" aria-label="关闭翻译">×</button></div><p id="translation-original" class="translation-original" lang="en-GB"></p><p id="translation-result" class="translation-result" role="status" aria-live="polite"></p><button id="retry-translation" class="secondary" hidden>重试翻译</button><p class="translation-source">在线机器翻译 · MyMemory · 仅供理解原文</p></aside>';
 document.body.append(ui);
 const $=s=>ui.querySelector(s),action=$('#translate-selection'),panel=$('#translation-panel'),overlay=$('#translation-overlay'),result=$('#translation-result'),retry=$('#retry-translation');
 let selected='',request=null,sequence=0,pointerStart=null,pointerMoved=false,selectionTimer,returnFocus=null;
 const cache=new Map();try{for(const entry of JSON.parse(localStorage.getItem('ielts-reader-translations-v1')||'[]'))if(Array.isArray(entry)&&typeof entry[0]==='string'&&typeof entry[1]==='string')cache.set(entry[0],entry[1]);}catch{}
 function cacheResult(text,translation){cache.delete(text);cache.set(text,translation);while(cache.size>100)cache.delete(cache.keys().next().value);try{localStorage.setItem('ielts-reader-translations-v1',JSON.stringify([...cache]));}catch{}}
 function selectionText(){
  if(readRoot.hidden||!wordCard.hidden||!panel.hidden)return '';
  const selection=window.getSelection();if(!selection||selection.isCollapsed||!selection.rangeCount)return '';
  const range=selection.getRangeAt(0),within=node=>(node.nodeType===Node.ELEMENT_NODE?node:node.parentElement)?.closest('#article,#title,#subtitle');
  if(!within(range.startContainer)||!within(range.endContainer))return '';
  const fragment=range.cloneContents();fragment.querySelectorAll('.paragraph-label,.reading-tools,.source-reference,.eyebrow,.reading-end').forEach(el=>el.remove());
  fragment.querySelectorAll('.paragraph').forEach(el=>el.after(document.createTextNode('\n')));
  const text=normalizeSelection(fragment.textContent);return /[A-Za-z]/.test(text)?text:'';
 }
 function refreshSelection(){if(!panel.hidden)return;selected=selectionText();action.hidden=!selected;}
 function setMode(enabled){readRoot.classList.toggle('selection-mode',enabled);modeButton.textContent=enabled?'退出划词':'划词翻译';modeButton.setAttribute('aria-pressed',String(enabled));hint.hidden=!enabled;}
 function close(clear=true){sequence++;request?.abort();request=null;panel.hidden=true;overlay.hidden=true;document.querySelector('#workspace').inert=false;document.querySelector('.header').inert=false;action.hidden=true;if(clear){window.getSelection()?.removeAllRanges();selected='';}returnFocus?.isConnected&&returnFocus.focus({preventScroll:true});returnFocus=null;}
 async function loadTranslation(){
  request?.abort();const controller=new AbortController(),current=++sequence;request=controller;const text=selected;
  result.classList.remove('translation-error');result.textContent='正在翻译…';retry.hidden=true;
  const timeout=setTimeout(()=>controller.abort(),45000);
  try{const translated=cache.get(text)||await translateText(text,{signal:controller.signal});if(current!==sequence)return;const decode=document.createElement('textarea');decode.innerHTML=translated;result.textContent=decode.value;cacheResult(text,translated);}
  catch(error){if(current!==sequence)return;result.classList.add('translation-error');result.textContent=error.name==='AbortError'?'翻译请求超时，请检查网络后重试。':error instanceof TypeError?'网络连接失败，请检查网络后重试。':error.message;retry.hidden=false;}
  finally{clearTimeout(timeout);if(current===sequence)request=null;}
 }
 function open(){if(!selected)return;beforeOpen();closeWordCard();returnFocus=document.activeElement;action.hidden=true;$('#translation-original').textContent=selected;panel.hidden=false;overlay.hidden=false;document.querySelector('#workspace').inert=true;document.querySelector('.header').inert=true;$('#close-translation').focus({preventScroll:true});loadTranslation();}
 modeButton.onclick=()=>{close();setMode(!readRoot.classList.contains('selection-mode'));};
 action.addEventListener('pointerdown',event=>event.preventDefault());action.onclick=open;$('#close-translation').onclick=()=>close();overlay.onclick=()=>close();retry.onclick=loadTranslation;
 document.addEventListener('selectionchange',()=>{clearTimeout(selectionTimer);selectionTimer=setTimeout(refreshSelection,100);});
 document.addEventListener('pointerdown',event=>{pointerStart={x:event.clientX,y:event.clientY,text:window.getSelection()?.toString()||''};pointerMoved=false;},true);
 document.addEventListener('pointermove',event=>{if(pointerStart&&Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>6)pointerMoved=true;},true);
 document.addEventListener('pointerup',refreshSelection);
 // A drag ending on a word must translate the selection, rather than opening
 // that word's card. Ordinary single taps retain the existing word-card flow.
 document.addEventListener('click',event=>{if(!event.target.closest('#read [data-word]'))return;const text=selectionText();if(text&&(pointerMoved||event.detail>1||(pointerStart&&pointerStart.text!==(window.getSelection()?.toString()||'')))){event.preventDefault();event.stopImmediatePropagation();refreshSelection();}else{action.hidden=true;window.getSelection()?.removeAllRanges();}},true);
 document.addEventListener('keydown',event=>{if(panel.hidden)return;if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){const nodes=[...panel.querySelectorAll('button')].filter(el=>!el.hidden),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
 overlay.addEventListener('wheel',event=>event.preventDefault(),{passive:false});overlay.addEventListener('touchmove',event=>event.preventDefault(),{passive:false});
 const reset=()=>{if(!panel.hidden)close();else{action.hidden=true;selected='';}setMode(false);};
 new MutationObserver(()=>{if(readRoot.hidden)reset();}).observe(readRoot,{attributes:true,attributeFilter:['hidden']});
 new MutationObserver(reset).observe(readRoot.querySelector('#article'),{childList:true});
}
