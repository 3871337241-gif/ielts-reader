import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSelection,translationChunks,translateText} from '../src/translation-service.mjs';

test('selection normalization preserves the original words, punctuation and accents',()=>{
 assert.equal(normalizeSelection('  The kākāpō\n  cannot fly.  '),'The kākāpō cannot fly.');
});
test('long selections split within 500 UTF-8 bytes without losing or splitting words',()=>{
 const text=('The kākāpō cannot fly, but it can climb trees. ').repeat(30).trim();
 const chunks=translationChunks(text);
 assert.ok(chunks.length>1);
 assert.ok(chunks.every(chunk=>new TextEncoder().encode(chunk).length<=500));
 assert.equal(chunks.join(' '),text);
 assert.throws(()=>translationChunks('x'.repeat(501)),/连续词/);
 assert.throws(()=>translationChunks('a '.repeat(2000)),/3000/);
});
test('translation requests only selected text, use Simplified Chinese, and omit credentials',async()=>{
 const calls=[];
 const translated=await translateText('The city was built on an artificial mound.',{fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>({responseStatus:200,quotaFinished:false,responseData:{translatedText:'这座城市建在一个人工土墩上。'}})};}});
 assert.equal(translated,'这座城市建在一个人工土墩上。');
 assert.equal(calls[0].url.origin,'https://api.mymemory.translated.net');
 assert.equal(calls[0].url.searchParams.get('q'),'The city was built on an artificial mound.');
 assert.equal(calls[0].url.searchParams.get('langpair'),'en|zh-CN');
 assert.equal(calls[0].options.credentials,'omit');
 assert.equal(calls[0].options.referrerPolicy,'no-referrer');
});
test('quota and service errors are not displayed as successful translations',async()=>{
 await assert.rejects(translateText('Test text',{fetchImpl:async()=>({ok:true,status:200,json:async()=>({responseStatus:200,quotaFinished:true,responseData:{translatedText:'LIMIT REACHED'}})})}),/额度/);
 await assert.rejects(translateText('Test text',{fetchImpl:async()=>({ok:false,status:429})}),/额度/);
 await assert.rejects(translateText('Test text',{fetchImpl:async()=>({ok:true,status:200,json:async()=>({responseStatus:400,responseData:{translatedText:'BAD REQUEST'}})})}),/未取得译文/);
});
test('abort signals cancel in-flight requests rather than returning a made-up translation',async()=>{
 const controller=new AbortController();controller.abort();
 await assert.rejects(translateText('Test text',{signal:controller.signal,fetchImpl:async(_url,{signal})=>{assert.equal(signal,controller.signal);signal.throwIfAborted();}}),{name:'AbortError'});
});
