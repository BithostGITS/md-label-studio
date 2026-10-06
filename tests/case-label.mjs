import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initCaseUI} from '../case-ui.mjs';
import {validateV3} from '../project-v3.mjs';
import {presetManifest,defaultAssignments,CASE_PROFILE,JCARD_PROFILE,SHEET_PRESETS,sheetManifest,px} from '../geometry.mjs';
import {emptyTrackList,manualRow,validateTrackList,capacity,parseDuration,editRow,moveRow,renumber,importTracks} from '../tracks.mjs';
import {trackSnapshot,Lookup,RateLimiter,metadataRecord} from '../online.mjs';
import {messages,LANGUAGES} from '../i18n.mjs';
import {CASE_TYPOGRAPHY,JCARD_TYPOGRAPHY,caseTypography,graphemes} from '../render.mjs';
import {caseKeys} from '../case-i18n.mjs';
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++;},ok=v=>{assert.ok(v);checks++;},bad=f=>{assert.throws(f);checks++;};
const sets=Array.from({length:4},(_,i)=>({id:'set-'+'ABCD'[i],profile:'original',w:38,h:54,sw:58,sh:3.5,case:{profile:CASE_PROFILE.id,template:'tracks'}}));
eq(Object.keys(SHEET_PRESETS),['legacy-four','case-set']);
const frozen=(await import('../../artifacts/case-label/layout-v2-baseline-v091/geometry.mjs')).sheetManifest;
const baseCfg={paper:'selphy',calibrated:false,measuredX:50,measuredY:50};
for(const paper of ['selphy','inch'])for(const calibrated of [false,true]){const cfg={...baseCfg,paper,calibrated,measuredX:52,measuredY:51};eq(presetManifest(sets,{...cfg,sheetPreset:'legacy-four'}),frozen(sets,cfg));}
eq(sheetManifest(sets,baseCfg).sets.flatMap(s=>s.labels).map(l=>l.designMm),[
 {x:9,y:6,width:38,height:54},{x:21,y:118,width:58,height:3.5},
 {x:53,y:6,width:38,height:54},{x:21,y:123.5,width:58,height:3.5},
 {x:9,y:62,width:38,height:54},{x:21,y:129,width:58,height:3.5},
 {x:53,y:62,width:38,height:54},{x:21,y:134.5,width:58,height:3.5}]);
const fixtures=[
 [CASE_PROFILE.id,[[14.5,8.25,71,60],[31,75.25,38,54],[21,136.25,58,3.5]],[[171,97,839,709],[366,889,449,638],[248,1609,685,42]]],
 [JCARD_PROFILE.id,[[16,6.25,68,64],[31,77.25,38,54],[21,138.25,58,3.5]],[[189,74,803,756],[366,912,449,638],[248,1633,685,41]]]
];
for(const [profile,expected,pixels] of fixtures)for(const selected of sets){const saved=sets.map(s=>({...s,case:{profile,template:'tracks'}})),settings={...baseCfg,sheetPreset:'case-set',sheetSetId:selected.id},m=presetManifest(saved,settings);
 eq(m.labels.map(l=>Object.values(l.designMm)),expected);eq(m.labels.map(l=>Object.values(l.rectPx)),pixels);eq(m.labels.map(l=>[l.kind,l.setId,l.copyIndex]),['case','front','spine'].map(k=>[k,selected.id,0]));eq(m.labels.length,3);eq(m.labels[0].profile,profile);eq(m.labels[0].cutline.widthMm,.10);eq(m.labels[0].corners,'rectangular');
 for(const r of expected)ok(r[0]>=6&&r[1]>=6&&r[0]+r[2]<=94&&r[1]+r[3]<=142);
 eq(expected[1][1]-(expected[0][1]+expected[0][3]),7);eq(expected[2][1]-(expected[1][1]+expected[1][3]),7);
 for(const paper of ['inch']){const translated=presetManifest(saved,{...settings,paper});eq(translated.exportPx,{width:1200,height:1800});translated.labels.forEach((l,i)=>{ok(Math.abs(l.designMm.x-expected[i][0]-.8)<1e-12);ok(Math.abs(l.designMm.y-expected[i][1]-2.2)<1e-12);});}
 const refs=defaultAssignments(saved,'case-set',selected.id);eq(presetManifest(saved,{...settings,labelAssignments:refs}),m);
 for(const modify of [r=>r.push({...r[0]}),r=>r[1].setId='missing',r=>r[1].setId=saved.find(s=>s.id!==selected.id).id,r=>r[0].copyIndex=1,r=>r[0].copyIndex=NaN,r=>r[0].kind='unknown']){const invalid=structuredClone(refs);modify(invalid);bad(()=>presetManifest(saved,{...settings,labelAssignments:invalid}));}
 for(const change of [{profile:'vendor'},{profile:'custom',w:45},{profile:'custom',w:NaN},{sw:59},{sh:4}])bad(()=>presetManifest(saved.map(s=>s.id===selected.id?{...s,...change}:s),settings));
 bad(()=>presetManifest(saved,{...settings,sheetSetId:'missing'}));bad(()=>presetManifest(saved,{...settings,paper:'bad'}));for(const profile of ['invalid','__proto__','constructor','toString'])bad(()=>presetManifest(saved.map(s=>({...s,case:{profile,template:'tracks'}})),settings));
}
eq([px(JCARD_PROFILE.w),px(JCARD_PROFILE.h)],[803,756]);eq(caseTypography({...sets[0],case:{profile:JCARD_PROFILE.id,template:'tracks'}}),JCARD_TYPOGRAPHY);eq(CASE_TYPOGRAPHY.rows,13);eq(JCARD_TYPOGRAPHY.rows,15);eq(JCARD_TYPOGRAPHY.titleMm,46);eq(JCARD_TYPOGRAPHY.durationX,55);
const fifteen={...emptyTrackList(),rows:Array.from({length:15},(_,i)=>({...manualRow(i+1),title:'Track '+i}))};eq(capacity(fifteen,JCARD_PROFILE.id).rowOverflow,0);eq(capacity(fifteen,CASE_PROFILE.id).rowOverflow,2);eq(capacity({...fifteen,rows:[...fifteen.rows,manualRow(16)]},JCARD_PROFILE.id).rowOverflow,1);
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
const shapes={'legacy-four':[], 'legacy-two':[], 'case-only':['case','case'], 'mixed-compact':['case','front','front','spine','spine','spine','spine'], 'easier-cutting':['case','front','front','spine','spine','spine']};
for(const [old,kinds] of Object.entries(shapes)){
 const input=structuredClone(project);input.settings.setCount=old==='legacy-two'?2:4;input.settings.sheetPreset=old;input.settings.labelAssignments=kinds.map((kind,i)=>({setId:i===0?'set-C':'set-D',kind,copyIndex:i}));const before=structuredClone(input),migrated=validateV3(input,legacy);
 eq(input,before);eq(migrated.settings.sheetPreset,kinds.length?'case-set':'legacy-four');eq(migrated.settings.sheetSetId,kinds.length?'set-C':'set-A');eq(migrated.settings.setCount,4);eq(migrated.sets,input.sets);ok(!('labelAssignments' in migrated.settings));
 if(old==='legacy-four')ok(!migrated.settings.layoutMigration);else {eq(migrated.settings.layoutMigration.reviewed,false);eq(migrated.settings.layoutMigration.beforeCount,kinds.length||4);eq(migrated.settings.layoutMigration.afterCount,kinds.length?3:8);}
 const v4={...migrated,schema:'md-studio-project/4'};eq(validateV3(v4,legacy),v4);
 if(kinds.length){const malformed=structuredClone(input);malformed.settings.labelAssignments[0].kind='front';bad(()=>validateV3(malformed,legacy));}
}
for(const version of [1,2]){const input={...structuredClone(project),schema:'md-studio-project/'+version};input.settings.setCount=version===1?2:4;if(version===1)input.sets=input.sets.slice(0,2);const migrateLegacy=v=>{const out=structuredClone(v);if(version===1)out.sets.push(...structuredClone(project.sets.slice(2)));return out;};const m=validateV3(input,migrateLegacy);eq(m.settings.sheetPreset,'legacy-four');eq(m.sets.length,4);eq(m.sets[0].trackList,emptyTrackList());eq(m.settings.layoutMigration?.includesCD,version===1?true:undefined);}
const v4={schema:'md-studio-project/4',mode:'physical',sets:structuredClone(project.sets),settings:{...baseCfg,setCount:4,sheetPreset:'case-set',sheetSetId:'set-B'}};v4.sets[1].case.profile=JCARD_PROFILE.id;eq(validateV3(v4,legacy),v4);
for(const transform of [p=>p.schema='md-studio-project/5',p=>p.settings.sheetPreset='case-only',p=>p.settings.sheetSetId='missing',p=>p.settings.setCount=2,p=>p.settings.labelAssignments=[{setId:'set-B',kind:'case',copyIndex:0}],p=>p.sets[1].case.profile='invalid',p=>p.sets[1].case.profile='__proto__',p=>p.sets[1].case.profile='constructor',p=>p.settings.layoutMigration={reviewed:'yes'}]){const invalid=structuredClone(v4);transform(invalid);const before=structuredClone(invalid);bad(()=>validateV3(invalid,legacy));eq(invalid,before);}
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
 const uiSettings={sheetPreset:'legacy-four',sheetSetId:currentSets[2].id,setCount:4};
 const ui=initCaseUI({getSets:()=>currentSets,getSettings:()=>uiSettings,getTarget:()=>currentSets[active],changed:()=>{},exportCase:()=>{},showCase:()=>{},online:{lookup:{enabled:false}}});
 const control=id=>form.querySelector('#'+id);
 eq(control('sheet-preset').children.map(n=>n.value),['legacy-four','case-set']);
 const allBefore=structuredClone(currentSets);control('sheet-preset').value='case-set';control('sheet-preset').onchange();eq(uiSettings.sheetSetId,'set-C');eq(currentSets,allBefore);ok(!control('label-assignment-0'));ok(!control('set-count'));
 control('sheet-case-variant').value=JCARD_PROFILE.id;control('sheet-case-variant').onchange();eq(currentSets[2].case.profile,JCARD_PROFILE.id);eq(currentSets[0].case.profile,CASE_PROFILE.id);
 active=1;ui.invalidate();eq(uiSettings.sheetSetId,'set-C');control('sheet-set').value='set-D';control('sheet-set').onchange();eq(uiSettings.sheetSetId,'set-D');eq(active,1);
 currentSets[3].profile='custom';currentSets[3].w=45;const sizes=structuredClone(currentSets[3]);ui.display();eq(currentSets[3],sizes);ok(control('sheet-restore-original'));control('sheet-restore-original').onclick();eq([currentSets[3].profile,currentSets[3].w,currentSets[3].h,currentSets[3].sw,currentSets[3].sh],['original',38,54,58,3.5]);
 uiSettings.layoutMigration={beforeCount:7,afterCount:3,removedCount:4,changedSet:true,includesCD:false,reviewed:false};ui.display();ok(control('layout-migration-notice'));control('layout-migration-review').onclick();eq(uiSettings.layoutMigration.reviewed,true);ok(!control('layout-migration-notice'));
 const dataBeforeModeSwitch=structuredClone(currentSets);control('sheet-preset').value='legacy-four';control('sheet-preset').onchange();eq(currentSets,dataBeforeModeSwitch);active=0;ui.invalidate();
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
