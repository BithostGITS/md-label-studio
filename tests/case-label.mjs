import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initCaseUI} from '../case-ui.mjs';
import {validateV3} from '../project-v3.mjs';
import {presetManifest,defaultAssignments,CASE_PROFILE} from '../geometry.mjs';
import {emptyTrackList,manualRow,validateTrackList,capacity,parseDuration,editRow,moveRow,renumber,importTracks} from '../tracks.mjs';
import {trackSnapshot,Lookup,RateLimiter,metadataRecord} from '../online.mjs';
import {messages,LANGUAGES} from '../i18n.mjs';
import {graphemes} from '../render.mjs';
import {caseKeys} from '../case-i18n.mjs';
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++;},ok=v=>{assert.ok(v);checks++;},bad=f=>{assert.throws(f);checks++;};
const sets=Array.from({length:4},(_,i)=>({id:'set-'+'ABCD'[i],profile:'original',w:38,h:54,sw:58,sh:3.5,case:{profile:CASE_PROFILE.id,template:'tracks'}}));
const fixtures={
 'case-only':[[14.5,6,71,60],[14.5,68,71,60]],
 'mixed-compact':[[14.5,6,71,60],[9,68,38,54],[53,68,38,54],[21,124,58,3.5],[21,128.5,58,3.5],[21,133,58,3.5],[21,137.5,58,3.5]],
 'easier-cutting':[[14.5,6,71,60],[9,68,38,54],[53,68,38,54],[21,124,58,3.5],[21,129.5,58,3.5],[21,135,58,3.5]]};
const intersects=(a,b)=>a[0]<b[0]+b[2]&&b[0]<a[0]+a[2]&&a[1]<b[1]+b[3]&&b[1]<a[1]+a[3];
for(const [preset,expected] of Object.entries(fixtures)){const settings={paper:'selphy',calibrated:false,sheetPreset:preset,labelAssignments:defaultAssignments(sets,preset)},m=presetManifest(sets,settings);eq(m.schema,'md-studio/2');eq(m.labels.map(l=>Object.values(l.designMm)),expected);eq(m.labels.map(l=>l.kind),settings.labelAssignments.map(r=>r.kind));const pixels=expected.map(([x,y,w,h])=>[Math.round(x*300/25.4),Math.round(y*300/25.4),Math.round((x+w)*300/25.4)-Math.round(x*300/25.4),Math.round((y+h)*300/25.4)-Math.round(y*300/25.4)]);eq(m.labels.map(l=>Object.values(l.rectPx)),pixels);for(const r of expected)ok(r[0]>=6&&r[1]>=6&&r[0]+r[2]<=94&&r[1]+r[3]<=142);for(let i=0;i<expected.length;i++)for(let j=i+1;j<expected.length;j++){ok(!intersects(expected[i],expected[j]));ok(!intersects(pixels[i],pixels[j]));}
 bad(()=>presetManifest(sets,{...settings,labelAssignments:settings.labelAssignments.map((r,i)=>i===0?{...r,setId:'missing'}:r)}));bad(()=>presetManifest(sets,{...settings,labelAssignments:settings.labelAssignments.map((r,i)=>i===0?{...r,kind:'unknown'}:r)}));bad(()=>presetManifest(sets,{...settings,labelAssignments:settings.labelAssignments.map((r,i)=>i===0?{...r,copyIndex:NaN}:r)}));
 if(preset!=='case-only')for(const w of [NaN,Infinity,85,45])bad(()=>presetManifest(sets.map(s=>({...s,profile:'custom',w})),settings));
}
const boundaryCfg={paper:'selphy',calibrated:false,sheetPreset:'mixed-compact',labelAssignments:defaultAssignments(sets,'mixed-compact')};const boundarySets=sets.map(s=>({...s,profile:'custom',w:41,h:54,sh:4.5}));const boundary=presetManifest(boundarySets,boundaryCfg);eq(boundary.labels[2].renderedMm.x+boundary.labels[2].renderedMm.width,94);eq(boundary.labels.at(-1).renderedMm.y+boundary.labels.at(-1).renderedMm.height,142);bad(()=>presetManifest(boundarySets.map(s=>({...s,w:41.0001})),boundaryCfg));bad(()=>presetManifest(boundarySets.map(s=>({...s,sh:4.5001})),boundaryCfg));
 ok(2*(71*60+38*54+58*3.5)>88*136);ok(3*71*60>88*136);
const list=emptyTrackList();list.capacityMinutes=74;list.rows=[{...manualRow(),durationMs:4440000}];eq(capacity(list).overflowMs,0);list.rows[0].durationMs++;eq(capacity(list).overflowMs,1);list.rows.push(manualRow(2));eq(capacity(list).unknown,1);eq(list.rows.length,2);list.gapMs=1000;list.reserveMs=500;eq(capacity(list).knownMs,4441501);list.rows[0].included=false;eq(capacity(list).knownMs,500);eq(capacity(list).unknown,1);eq(parseDuration('74:00.001'),4440001);eq(parseDuration(''),null);eq(parseDuration('1440:00'),86400000);bad(()=>parseDuration('1440:00.001'));bad(()=>parseDuration('3:60'));moveRow(list,list.rows[1].id,-1);renumber(list);eq(list.rows.map(r=>r.no),['1','2']);eq(validateTrackList(list),list);bad(()=>validateTrackList({...list,rows:Array.from({length:201},()=>manualRow())}));bad(()=>validateTrackList({...list,rows:[{...manualRow(),title:'a'.repeat(2001)}]}));bad(()=>validateTrackList({...list,rows:[{...manualRow(),durationMs:86400001}]}));bad(()=>validateTrackList({...list,rows:[{...manualRow(),durationMs:1.1}]}));
const meta={source:'itunes',id:'123',country:'US',trackCount:3,album:'Album',artist:'Artist',year:'2026'};
const song=(id,disc,n,ms=1000)=>({wrapperType:'track',kind:'song',collectionId:123,trackId:id,discNumber:disc,trackNumber:n,trackName:'Song '+id,trackTimeMillis:ms});
const data={results:[{wrapperType:'collection',collectionId:123,trackCount:3},song(3,2,1,null),song(2,1,2),song(1,1,1),song(1,1,1)]};const fetched=trackSnapshot(data,meta,1234);eq(fetched.rows.map(r=>r.provenance.sourceTrackId),['1','2','3']);ok(fetched.complete);eq(fetched.rows[2].durationMs,null);eq(trackSnapshot({results:[data.results[0],song(1,1,1)]},meta).complete,false);bad(()=>trackSnapshot({results:[song(1,1,1),{...song(2,1,2),collectionId:999}]},meta));bad(()=>trackSnapshot({results:'bad'},meta));bad(()=>trackSnapshot({results:[{...song(1,1,1),trackTimeMillis:NaN}]},meta));
let imported=importTracks(emptyTrackList(),fetched,'replace');const originalTitle=imported.rows[0].provenance.title;editRow(imported.rows[0],'title','My edit');editRow(imported.rows[0],'durationMs',2345);editRow(imported.rows[0],'included',false);moveRow(imported,imported.rows[2].id,-2);const manual=manualRow();imported.rows.push(manual);const merged=importTracks(imported,fetched,'merge');eq(merged.rows.map(r=>r.id),imported.rows.map(r=>r.id));eq(merged.rows.find(r=>r.provenance?.sourceTrackId==='1').title,'My edit');eq(merged.rows.find(r=>r.provenance?.sourceTrackId==='1').provenance.title,originalTitle);eq(merged.rows.find(r=>r.provenance?.sourceTrackId==='1').durationMs,2345);eq(merged.rows.find(r=>r.provenance?.sourceTrackId==='1').included,false);eq(metadataRecord(meta).trackCount,3);
for(const lang of LANGUAGES)for(const key of caseKeys){ok(typeof messages[lang][key]==='string'&&messages[lang][key].length>0);eq([...messages[lang][key].matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),[...messages.en[key].matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort());}
let now=0,calls=0;const starts=[];const limiter=new RateLimiter('fixture',3100,{now:()=>now,wait:async ms=>now+=ms,storage:null,locks:null});const client=new Lookup({now:()=>now,cacheTTL:1000,itunesLimiter:limiter,fetcher:async(url)=>{calls++;starts.push(now);return new Response(JSON.stringify(url.includes('search?')?{results:[{collectionType:'Album',collectionId:123,collectionName:'Album',artistName:'Artist',releaseDate:'2026',trackCount:3}]}:data),{headers:{'Content-Type':'application/json'}});}});
await assert.rejects(()=>client.tracks(meta),e=>e.key==='offline');checks++;eq(calls,0);client.enable(true);eq((await client.itunes('Album','Artist','US'))[0].trackCount,3);const [one,two]=await Promise.all([client.tracks(meta),client.tracks(meta)]);eq(calls,2);eq(one,two);eq(starts,[0,3100]);const timestamp=one.source.fetchedAt;now+=500;eq((await client.tracks(meta)).source.fetchedAt,timestamp);eq(calls,2);now+=1001;await client.tracks(meta);eq(calls,3);await client.tracks({...meta,country:'JP'});eq(calls,4);client.enable(false);eq(client.cache.size,0);
const rate=new Lookup({itunesLimiter:{run:fn=>fn(),defer:ms=>eq(ms,2000)},fetcher:async()=>new Response('',{status:429,headers:{'Retry-After':'2'}})});rate.enable(true);await assert.rejects(()=>rate.tracks(meta),e=>e.key==='rate');checks++;
const cancelled=new Lookup({itunesLimiter:{run:fn=>fn()},fetcher:async(url,{signal})=>{cancelled.cancel();throw new DOMException('aborted','AbortError');}});cancelled.enable(true);await assert.rejects(()=>cancelled.tracks(meta),e=>e.key==='cancelled');checks++;
bad(()=>trackSnapshot({results:[{wrapperType:'collection',collectionId:123,collectionName:'Different deluxe edition'},song(1,1,1)]},meta));eq(trackSnapshot({results:[{wrapperType:'collection',collectionId:123,trackCount:20},song(1,1,1),song(2,1,2),song(3,2,1)]},meta).complete,false);list.capacityMinutes=80;list.gapMs=0;list.reserveMs=0;list.rows=[{...manualRow(),durationMs:4800000}];eq(capacity(list).overflowMs,0);list.rows[0].durationMs++;eq(capacity(list).overflowMs,1);list.rows=Array.from({length:14},()=>manualRow());eq(capacity(list).rowOverflow,1);eq(capacity(list).overflowMs,0);
const badPayload=new Lookup({itunesLimiter:{run:fn=>fn()},fetcher:async()=>new Response('{broken',{headers:{'Content-Type':'application/json'}})});badPayload.enable(true);await assert.rejects(()=>badPayload.tracks(meta),e=>e.key==='invalid');checks++;
const oversized=new Lookup({itunesLimiter:{run:fn=>fn()},fetcher:async()=>new Response('{}',{headers:{'Content-Length':'3000000'}})});oversized.enable(true);await assert.rejects(()=>oversized.tracks(meta),e=>e.key==='invalid');checks++;
const timed=new Lookup({itunesLimiter:{run:fn=>fn()},fetcher:async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('abort','AbortError'))))});timed.enable(true);await assert.rejects(()=>timed.tracks(meta),e=>e.key==='timeout');checks++;
eq(graphemes('é👩‍🎤'),['é','👩‍🎤']);const segmenter=Intl.Segmenter;try{Intl.Segmenter=undefined;bad(()=>graphemes('é'));}finally{Intl.Segmenter=segmenter;}
const bounds=emptyTrackList();bounds.rows=[{...manualRow(),title:'x'.repeat(2000),durationMs:86400000},{...manualRow(),durationMs:0},{...manualRow(),durationMs:null}];eq(validateTrackList(bounds),bounds);
// F2: the v3 boundary must reject coercible provenance atomically.
const project={schema:'md-studio-project/3',mode:'physical',settings:{calibrated:false,measuredX:50,measuredY:50,sheetPreset:'legacy-four',labelAssignments:[]},sets:sets.map(s=>({...s,uppercase:false,hideHeader:false,hiMD:false,trackList:structuredClone(imported)}))};
// Legacy fields are covered by unit/browser suites; isolate the v3 extension here.
const legacy=v=>structuredClone(v);
const restored=validateV3(project,legacy);
eq(restored.sets[0].trackList,imported);
const resynced=importTracks(restored.sets[0].trackList,fetched,'merge');
eq(resynced.rows,merged.rows); // modified fields, inclusion, duration, order, manual row
for(const [container,key,values] of [['provenance','sourceTrackId',[1,['1'],{id:'1'},null,true]],['source','collectionId',[123,['123'],{id:'123'},null,true]],['source','country',[1,['US'],{code:'US'},null,true]]]){
 for(const value of values){
  const malformed=structuredClone(project),l=malformed.sets[0].trackList;
  (container==='source'?l.source:l.rows.find(r=>r.provenance).provenance)[key]=value;
  const before=structuredClone(malformed);
  bad(()=>validateV3(malformed,legacy));eq(malformed,before);eq(restored.sets[0].trackList,imported);
 }
}
// Defensive re-sync of pre-fix in-memory rows preserves edits using stable local IDs.
for(const value of [1,['1'],{id:'1'}]){
 const malformed=structuredClone(imported);malformed.rows.find(r=>r.provenance?.sourceTrackId==='1').provenance.sourceTrackId=value;
 const before=structuredClone(malformed);
 eq(importTracks(malformed,fetched,'merge').rows,merged.rows);eq(malformed,before);
 const replacement=importTracks(malformed,fetched,'replace');
 eq(replacement.rows.map(r=>r.provenance.sourceTrackId),['1','2','3']);
 eq(replacement.rows[0].title,'My edit');eq(replacement.rows[0].durationMs,2345);eq(replacement.rows[0].included,false);
 ok(!replacement.rows.some(r=>r.id===manual.id)); // replace deliberately removes manual rows
}
for(const value of [1,['1'],{id:'1'}]){
 const malformed=structuredClone(fetched);malformed.rows[0].provenance.sourceTrackId=value;
 const before=structuredClone(imported);
 for(const mode of ['merge','replace']){bad(()=>importTracks(imported,malformed,mode));eq(imported,before);}
}
// F1: exercise real case-ui handlers with a minimal DOM, not a replacement undo model.
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.listeners={};}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 querySelector(selector){const id=selector.slice(1);for(const child of this.children){if(typeof child!=='object')continue;if(child.id===id)return child;const found=child.querySelector?.(selector);if(found)return found;}return null;}
}
const doc=globalThis.document,form=new Element('form'),load=new Element('input'),enabled=new Element('input'),tabs=sets.map(()=>new Element('button'));
globalThis.document={createElement:tag=>new Element(tag),querySelector:s=>s==='#editor-form'?form:form.querySelector(s),querySelectorAll:s=>s==='[data-set]'?tabs:[],getElementById:id=>id==='load-project'?load:enabled};
try{
 let currentSets=project.sets.map(s=>({...structuredClone(s),trackList:structuredClone(imported)})),active=0;
 const ui=initCaseUI({getSets:()=>currentSets,getSettings:()=>project.settings,getTarget:()=>currentSets[active],changed:()=>{},exportCase:()=>{},showCase:()=>{},online:{lookup:{enabled:false}}});
 const control=id=>form.querySelector('#'+id);
 const original=structuredClone(currentSets[0].trackList);
 control('track-add').onclick();ok(!control('track-undo').disabled);
 active=1;ui.invalidate();ok(control('track-undo').disabled);control('track-add').onclick();
 active=0;ui.invalidate();ok(!control('track-undo').disabled);control('track-undo').onclick();eq(currentSets[0].trackList,original);
 control('track-add').onclick();const edited=structuredClone(currentSets[0].trackList);
 // Import attempt invalidates preview, but failure must leave document and undo intact.
 load.listeners.change.forEach(fn=>fn());ok(!control('track-undo').disabled);eq(currentSets[0].trackList,edited);
 control('track-undo').onclick();eq(currentSets[0].trackList,original);control('track-add').onclick();
 currentSets=project.sets.map((s,i)=>({...structuredClone(s),case:{profile:CASE_PROFILE.id,template:'tracks'},trackList:{...emptyTrackList(),source:structuredClone(fetched.source),rows:[{...structuredClone(fetched.rows[0]),title:'Project B unique '+i,modified:['title']}]}}));
 const replacement=structuredClone(currentSets);ui.resetProject();ok(control('track-undo').disabled);
 // Even direct activation of the disabled handler cannot retrieve A data.
 control('track-undo').onclick();eq(currentSets,replacement);
 for(active=1;active<4;active++){ui.invalidate();ok(control('track-undo').disabled);control('track-undo').onclick();eq(currentSets,replacement);}
 // Integration wiring: reset only after validation/preparation and successful state commit.
 const source=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
 ok(/const data=validateProject\(raw\);await Promise\.all\(data\.sets\.map\(prepare\)\);uploads\.clear\(\);sets=data\.sets;settings=data\.settings;mode=data\.mode;active=0;caseUI\.resetProject\(\)/.test(source));
}finally{if(doc===undefined)delete globalThis.document;else globalThis.document=doc;}
console.log(JSON.stringify({status:'PASS',checks,scope:'Independent preset mm/px arithmetic, area regression, capacity/editing/bounds, mock tracks, shared limiter/TTL/dedup/429/cancel, six-language placeholders'}));
