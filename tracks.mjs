import {localeError} from './i18n.mjs';
export const TRACK_LIMIT=200,TITLE_LIMIT=2000,MAX_DURATION=86400000,PRINT_ROWS=13;
export const localId=()=>globalThis.crypto?.randomUUID?.()||'local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const invalid=()=>{throw localeError('caseInvalid');};
const text=(v,max=2000)=>{if(typeof v!=='string'||v.length>max)invalid();return v;};
const duration=v=>{if(v!==null&&(!Number.isInteger(v)||v<0||v>MAX_DURATION))invalid();return v;};
const id=v=>{if(typeof v!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(v))invalid();return v;};
export function emptyTrackList(){return {capacityMinutes:80,gapMs:0,reserveMs:0,rows:[]};}
export function manualRow(no=1){return {id:localId(),no:String(no),title:'',durationMs:null,included:true};}
export function validateTrackList(v){
 if(!v||![74,80].includes(v.capacityMinutes)||!Array.isArray(v.rows)||v.rows.length>TRACK_LIMIT)invalid();
 const result={capacityMinutes:v.capacityMinutes,gapMs:duration(v.gapMs??0),reserveMs:duration(v.reserveMs??0),rows:v.rows.map(r=>{if(!r||typeof r.included!=='boolean')invalid();const out={id:id(r.id),no:text(r.no,20),title:text(r.title),durationMs:duration(r.durationMs),included:r.included};if(r.provenance!==undefined){const p=r.provenance;if(!p||typeof p.sourceTrackId!=='string'||!/^\d{1,20}$/.test(p.sourceTrackId)||![p.discNumber,p.trackNumber].every(n=>Number.isInteger(n)&&n>=0&&n<=10000))invalid();out.provenance={sourceTrackId:p.sourceTrackId,discNumber:p.discNumber,trackNumber:p.trackNumber,title:text(p.title),durationMs:duration(p.durationMs)};if(r.modified!==undefined){if(!Array.isArray(r.modified)||r.modified.some(k=>!['no','title','durationMs','included'].includes(k)))invalid();out.modified=[...new Set(r.modified)];}}return out;})};
 if(result.gapMs===null||result.reserveMs===null||new Set(result.rows.map(r=>r.id)).size!==result.rows.length)invalid();
 if(v.source!==undefined){const s=v.source;if(s?.source!=='itunes'||typeof s.collectionId!=='string'||!/^\d{1,20}$/.test(s.collectionId)||typeof s.country!=='string'||! /^[A-Z]{2}$/.test(s.country)||!Number.isFinite(s.fetchedAt)||s.fetchedAt<0||![s.expectedTrackCount,s.returnedCount].every(n=>n===null||Number.isInteger(n)&&n>=0&&n<=10000))invalid();result.source={source:'itunes',collectionId:s.collectionId,country:s.country,fetchedAt:s.fetchedAt,expectedTrackCount:s.expectedTrackCount,returnedCount:s.returnedCount};}
 return result;
}
export function capacity(list){const rows=list.rows.filter(r=>r.included),knownMs=rows.reduce((n,r)=>n+(r.durationMs??0),0)+Math.max(0,rows.length-1)*(list.gapMs||0)+(list.reserveMs||0),capacityMs=list.capacityMinutes*60000;return {selected:rows.length,knownMs,capacityMs,remainingMs:capacityMs-knownMs,overflowMs:Math.max(0,knownMs-capacityMs),unknown:rows.filter(r=>r.durationMs===null).length,rowOverflow:Math.max(0,rows.length-PRINT_ROWS)};}
export function formatDuration(ms){if(ms===null)return '—';const secs=Math.floor(ms/1000);return Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0');}
export function parseDuration(value){if(value.trim()===''||value.trim()==='—')return null;const m=/^(\d{1,4}):([0-5]\d)(?:\.(\d{1,3}))?$/.exec(value.trim());if(!m)throw localeError('caseDuration');const ms=Number(m[1])*60000+Number(m[2])*1000+Number((m[3]||'').padEnd(3,'0'));if(ms>MAX_DURATION)throw localeError('caseDuration');return ms;}
export function editRow(row,key,value){if(!['no','title','durationMs','included'].includes(key))invalid();row[key]=value;if(row.provenance)row.modified=[...new Set([...(row.modified||[]),key])];}
export function moveRow(list,id,delta){const i=list.rows.findIndex(r=>r.id===id),j=i+delta;if(i>=0&&j>=0&&j<list.rows.length){const [r]=list.rows.splice(i,1);list.rows.splice(j,0,r);}}
export function renumber(list){list.rows.forEach((r,i)=>editRow(r,'no',String(i+1)));}
export function importTracks(list,snapshot,mode){if(!['replace','merge'].includes(mode))invalid();const validSnapshot=validateTrackList({...emptyTrackList(),rows:snapshot.rows,source:snapshot.source});const current=new Map(list.rows.filter(r=>typeof r.provenance?.sourceTrackId==='string').map(r=>[r.provenance.sourceTrackId,r]));const incoming=validSnapshot.rows.map(r=>{const old=current.get(r.provenance.sourceTrackId)||list.rows.find(old=>old.id===r.id&&old.provenance&&typeof old.provenance.sourceTrackId!=='string');if(!old)return structuredClone(r);const out=structuredClone(r);out.id=old.id;out.modified=old.modified||[];for(const k of out.modified)out[k]=old[k];return out;});const rows=mode==='merge'?list.rows.map(old=>{const match=incoming.find(r=>r.id===old.id);return match||old;}).concat(incoming.filter(r=>!list.rows.some(old=>old.id===r.id))):incoming;
 return validateTrackList({...list,rows,source:snapshot.source});}
