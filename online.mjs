import {localId,MAX_DURATION} from './tracks.mjs';
// Optional direct-browser lookup. No request is made until consent is enabled.
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const norm=s=>String(s||'').normalize('NFKC').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const escapeLucene=s=>String(s).replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g,'\\$1');
export function titleQuery(s){return String(s).normalize('NFKC').trim().split(/\s+/u).filter(Boolean).slice(0,12).map((v,i,a)=>{const escaped=escapeLucene(v);if(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(v))return '"'+escaped+'"';if(/^[\p{L}]+$/u.test(v)&&v.length>=3)return (i===a.length-1?'('+escaped+'* OR '+escaped+'~1)':escaped+'~1');return '"'+escaped+'"';}).join(' AND ');}
export function groupQuery(title,artistId){if(artistId&&!UUID.test(artistId))throw Error('invalid');return `${artistId?'arid:'+artistId+' AND ':''}releasegroup:(${titleQuery(title)}) AND primarytype:album`;}
// Album-family matching only: never rewrite the selected source metadata.
const editionCue=/^(?:(?:\d{4}|\d+(?:st|nd|rd|th))\s+)?(?:remaster(?:ed|ing)?|deluxe|anniversary|live)\b|^(?:再版|重制|重製|现场|現場|リマスター|ライブ)/i;
export function canonicalTitle(s){
 let title=String(s).replace(/^(?:K2HD|SACD)\s*:\s*/i,'').trim();
 // Balanced terminal decorations, including nested ()/[], bounded by input length.
 for(let pass=0;pass<32;pass++){
  const end=title.at(-1);if(![']',')'].includes(end))break;
  const stack=[];let start=-1,valid=true;
  for(let i=title.length-1;i>=0;i--){const c=title[i];if(c===')'||c===']')stack.push(c);else if(c==='('||c==='['){if(stack.pop()!==(c==='('?')':']')){valid=false;break;}if(!stack.length){start=i;break;}}}
  if(!valid||start<0||!editionCue.test(title.slice(start+1,-1).trim()))break;
  const base=title.slice(0,start).trim();if(!base)break;title=base;
 }
 return title;
}
// Normalize family-search text, not the metadata selected from the store.
export function matchTitle(title,artist=''){
 let value=canonicalTitle(title).normalize('NFKC').trim();
 const escaped=String(artist).normalize('NFKC').trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 if(escaped){const prefix=new RegExp('^'+escaped+'(?:\\s+|\\s*[:–—-]\\s*)','i'),suffix=new RegExp('\\s+(?:by\\s+)?'+escaped+'$','i');const next=value.replace(prefix,'').replace(suffix,'').trim();if(next)value=next;}
 const artistText=String(artist).normalize('NFKC').trim();if(artistText&&value.startsWith(artistText)&&selfTitle(value.slice(artistText.length).trim()))value=value.slice(artistText.length).trim();
 return value.replace(/(\d{4})\s*(?:[-‐‑‒–—−]|\s)\s*(\d{4})/g,'$1-$2');
}
export const selfTitle=title=>/^(?:同名專輯|同名专辑|self[ -]?titled(?: album)?|eponymous(?: album)?)$/i.test(String(title).trim());
export function relatedTitle(a,b){
 const x=matchTitle(a),y=matchTitle(b),ranges=v=>v.match(/\d{4}-\d{4}/g)||[];
 if(ranges(y).length&&JSON.stringify(ranges(x))!==JSON.stringify(ranges(y)))return false;
 return similarity(x,y)>=.65;
}
export class ConfirmedMappings{
 constructor(storage=safeStorage(),now=Date.now){this.storage=storage;this.now=now;this.key='md-confirmed-matches-v1';}
 fingerprint(v){return JSON.stringify([v.album,v.artist,v.year]);}
 entryKey(v){return JSON.stringify([v.source,v.country||'',v.id]);}
 read(){try{const v=JSON.parse(this.storage?.getItem(this.key)||'[]');return Array.isArray(v)?v.filter(e=>e&&typeof e.key==='string'&&UUID.test(e.mbid)&&Number.isFinite(e.time)&&this.now()-e.time>=0&&this.now()-e.time<30*86400000).slice(-100):[];}catch{return [];}}
 write(entries){try{this.storage?.setItem(this.key,JSON.stringify(entries.slice(-100)));}catch{}}
 get(v){const entries=this.read(),hit=entries.find(e=>e.key===this.entryKey(v));if(hit&&hit.fingerprint===this.fingerprint(v))return hit.mbid;if(hit)this.remove(v);return '';}
 set(v,mbid){if(v.source!=='itunes'||!UUID.test(mbid))return;const entries=this.read().filter(e=>e.key!==this.entryKey(v));entries.push({key:this.entryKey(v),fingerprint:this.fingerprint(v),mbid,time:this.now()});this.write(entries);}
 remove(v){this.write(this.read().filter(e=>e.key!==this.entryKey(v)));}
}
export function editionTypes(title,metadata=[]){const text=String(title).slice(0,500),types=new Set(metadata);for(const [type,re] of [['Live',/(?:^|[^\p{L}\p{N}])live(?:$|[^\p{L}\p{N}])|現場|现场|ライブ/iu],['Single',/(?:^|[^\p{L}\p{N}])single(?:$|[^\p{L}\p{N}])/iu],['Deluxe',/(?:^|[^\p{L}\p{N}])deluxe(?:$|[^\p{L}\p{N}])/iu]])if(re.test(text))types.add(type);return [...types];}
export function similarity(a,b){a=norm(a);b=norm(b);if(!a||!b)return 0;if(a===b)return 1;if(a.startsWith(b)||b.startsWith(a))return .85;const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const tmp=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=tmp;}}return 1-row[b.length]/Math.max(a.length,b.length);}
export function rank(items,title,artist){return [...items].sort((a,b)=>score(b)-score(a));function score(v){return 4*similarity(canonicalTitle(v.album),canonicalTitle(title))+2*similarity(v.artist,artist)+(v.year?.length===4?.1:0)-(editionTypes(v.album,v.secondary||[]).some(t=>['Compilation','Live','Remix','Single','Deluxe'].includes(t))?.75:0);}}
export class LookupError extends Error{constructor(key,status=0){super(key);this.key=key;this.status=status;}}
const safeStorage=()=>{try{return globalThis.localStorage;}catch{return null;}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export class RateLimiter{
 constructor(name,interval,{now=Date.now,wait=sleep,storage=safeStorage(),locks=globalThis.navigator?.locks}={}){this.name=name;this.interval=interval;this.now=now;this.wait=wait;this.storage=storage;this.locks=locks;this.next=0;this.tail=Promise.resolve();}
 defer(ms){this.next=Math.max(this.next,this.now()+ms);try{this.storage?.setItem('md-online-'+this.name,String(this.next));}catch{}}
 run(fn,signal){const job=async()=>{const work=async()=>{if(signal?.aborted)throw new LookupError('cancelled');let shared=0;try{shared=Number(this.storage?.getItem('md-online-'+this.name))||0;}catch{}let delay=Math.max(this.next,shared)-this.now();while(delay>0){await this.wait(delay);try{shared=Number(this.storage?.getItem('md-online-'+this.name))||0;}catch{}delay=Math.max(this.next,shared)-this.now();}if(signal?.aborted)throw new LookupError('cancelled');this.defer(this.interval);try{return await fn();}finally{this.defer(this.interval);}};return this.locks?this.locks.request('md-online-'+this.name,work):work();};const result=this.tail.then(job);this.tail=result.catch(()=>{});return result;}
}
export class Stages{
 constructor(onChange=()=>{}){this.onChange=onChange;this.states={};this.version=0;}
 reset(){this.version++;this.states={};this.onChange();}
 set(name,status,extra={}){this.states[name]={...this.states[name],status,...extra};this.onChange();}
 async run(name,fn){const previous=this.states[name],tries=(previous?.tries||0)+1,version=this.version;if(tries>3)return;this.set(name,'running',{tries,error:null,http:0,retry:null});try{const result=await fn();if(this.version===version)this.set(name,result?.awaitingChoice?'waiting':'done',{result});return result;}catch(e){if(this.version!==version)return;this.set(name,'error',{error:e.key||(name==='import'?'decode':'invalid'),http:e.status||0,retry:tries<3?()=>this.run(name,fn):null});return undefined;}}
}
export class Lookup{
 constructor({fetcher=(...args)=>globalThis.fetch(...args),mbLimiter=new RateLimiter('mb',1300),itunesLimiter=new RateLimiter('itunes',3100),now=Date.now,cacheTTL=86400000}={}){this.fetcher=fetcher;this.mbLimiter=mbLimiter;this.itunesLimiter=itunesLimiter;this.enabled=false;this.now=now;this.cacheTTL=cacheTTL;this.cache=new Map();this.inflight=new Map();this.controller=new AbortController();}
 cancel(){this.inflight.clear();this.controller.abort();this.controller=new AbortController();}
 enable(value){this.enabled=value;this.cancel();if(!value)this.cache.clear();}
 async request(url,{image=false,refresh=false}={}){if(!this.enabled)throw new LookupError('offline');let u;try{u=new URL(url);}catch{throw new LookupError('unsafe');}if(image&&u.protocol==='http:'&&u.hostname==='coverartarchive.org'&&!u.username&&!u.password&&!u.port){u.protocol='https:';url=u.href;}if(u.username||u.password||u.port||u.protocol!=='https:'||!(['musicbrainz.org','itunes.apple.com','coverartarchive.org','archive.org'].includes(u.hostname)||u.hostname.endsWith('.archive.org')))throw new LookupError('unsafe');const signal=this.controller.signal;const limiter=u.hostname==='musicbrainz.org'?this.mbLimiter:u.hostname==='itunes.apple.com'?this.itunesLimiter:null;
 const action=async()=>{if(signal.aborted||!this.enabled)throw new LookupError('cancelled');const timed=new AbortController(),abort=()=>timed.abort();signal.addEventListener('abort',abort,{once:true});const timeout=setTimeout(abort,20000);try{const res=await this.fetcher(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:timed.signal});if(res.url){const end=new URL(res.url);if(end.username||end.password||end.port||end.protocol!=='https:'||!(end.hostname===u.hostname||end.hostname==='archive.org'||end.hostname.endsWith('.archive.org')))throw new LookupError('unsafe');}if(!res.ok){const header=res.headers.get('Retry-After'),seconds=Number(header);if(limiter&&header)limiter.defer(Math.min(300000,Math.max(1000,Number.isFinite(seconds)?seconds*1000:Date.parse(header)-Date.now())));throw new LookupError(res.status===404?'missing':res.status===429?'rate':res.status===503?'busy':'http',res.status);}const limit=image?12*1024*1024:2*1024*1024;if(Number(res.headers.get('Content-Length'))>limit)throw new LookupError('invalid');const reader=res.body?.getReader();let blob;if(reader){let bytes=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>limit){await reader.cancel();throw new LookupError('invalid');}chunks.push(value);}blob=new Blob(chunks,{type:res.headers.get('Content-Type')||''});}else blob=await res.blob();if(blob.size>limit)throw new LookupError('invalid');if(image){if(!/^image\/(png|jpeg|webp)(?:;|$)/i.test(blob.type))throw new LookupError('invalid');return blob;}try{return JSON.parse(await blob.text());}catch{throw new LookupError('invalid');}}catch(e){if(e instanceof LookupError)throw e;throw new LookupError(signal.aborted?'cancelled':timed.signal.aborted?'timeout':'network');}finally{clearTimeout(timeout);signal.removeEventListener('abort',abort);}};
 const cached=this.cache.get(url);if(!image&&!refresh&&cached&&this.now()-cached.at>=0&&this.now()-cached.at<this.cacheTTL)return structuredClone(cached.value);if(!image&&this.inflight.has(url))return structuredClone(await this.inflight.get(url));
 const pending=(async()=>{const value=limiter?await limiter.run(action,signal):await action();if(signal.aborted||!this.enabled)throw new LookupError('cancelled');if(!image){if(this.cache.size>=40)this.cache.delete(this.cache.keys().next().value);this.cache.set(url,{at:this.now(),value});}return value;})();if(!image)this.inflight.set(url,pending);try{return structuredClone(await pending);}finally{if(this.inflight.get(url)===pending)this.inflight.delete(url);}}
 async artists(artist){const q=titleQuery(artist),data=await this.request('https://musicbrainz.org/ws/2/artist/?fmt=json&limit=8&query='+encodeURIComponent(q));return (data.artists||[]).filter(v=>UUID.test(v.id)).map(v=>({kind:'artist',id:v.id,artist:v.name,album:'',year:'',source:'musicbrainz',note:[v.disambiguation,v.country].filter(Boolean).join(' · ')})).sort((a,b)=>similarity(b.artist,artist)-similarity(a.artist,artist));}
 async groups(title,artist='',artistId='',{discovery=false}={}){if(discovery&&!UUID.test(artistId))throw new LookupError('invalid');const query=discovery?'arid:'+artistId+' AND primarytype:album':groupQuery(title,artistId);const data=await this.request('https://musicbrainz.org/ws/2/release-group/?fmt=json&limit='+(discovery?100:20)+'&query='+encodeURIComponent(query));const items=rank((data['release-groups']||[]).filter(v=>UUID.test(v.id)&&v['primary-type']==='Album'&&(!artistId||v['artist-credit']?.some(c=>c.artist?.id===artistId))).map(v=>({kind:'album',id:v.id,album:v.title,artist:(v['artist-credit']||[]).map(c=>(c.name||c.artist?.name||'')+(c.joinphrase||'')).join(''),year:(v['first-release-date']||'').slice(0,4),source:'musicbrainz',secondary:v['secondary-types']||[],note:[v.disambiguation,...(v['secondary-types']||[])].filter(Boolean).join(' · ')})),title,artist);items.truncated=Number(data.count)>items.length;return items;}
 async crossMatch(metadata,ok=()=>true){
 const ensure=()=>{if(!ok())throw new LookupError('cancelled');};
 const found=await this.artists(metadata.artist);ensure();const exact=found.filter(v=>norm(v.artist)===norm(metadata.artist)),artists=(exact.length?exact:found).slice(0,3);
 const title=matchTitle(metadata.album,metadata.artist),all=[];let fallback=false,truncated=false;
 for(const artist of artists){
  let groups=[];
  if(!selfTitle(title)){
   groups=await this.groups(canonicalTitle(metadata.album),artist.artist,artist.id);ensure();
   if(!groups.some(v=>relatedTitle(v.album,title))&&title!==canonicalTitle(metadata.album)){groups=await this.groups(title,artist.artist,artist.id);ensure();}
   groups=groups.filter(v=>relatedTitle(v.album,title));
  }
  if(!groups.length){fallback=true;groups=await this.groups(title,artist.artist,artist.id,{discovery:true});ensure();truncated=truncated||groups.truncated;groups.sort((a,b)=>(b.year===metadata.year)-(a.year===metadata.year));}
  for(const group of groups)if(!all.some(v=>v.id===group.id))all.push(group);
 }
 return {candidates:all,fallback,truncated};
 }
 async itunes(title,artist,country){const data=await this.request('https://itunes.apple.com/search?entity=album&limit=20&country='+encodeURIComponent(country)+'&term='+encodeURIComponent([artist,title].filter(Boolean).join(' ')));return rank((data.results||[]).filter(v=>v.collectionType==='Album').map(v=>({kind:'album',id:String(v.collectionId),album:v.collectionName,artist:v.artistName,year:(v.releaseDate||'').slice(0,4),source:'itunes',country,trackCount:Number.isInteger(v.trackCount)&&v.trackCount>=0?v.trackCount:null,secondary:editionTypes(v.collectionName,[v.collectionType,v.wrapperType].filter(Boolean)),note:editionTypes(v.collectionName).join(' · ')})),title,artist);}
 async tracks(metadata,{refresh=false}={}){if(metadata?.source!=='itunes'||!/^\d{1,20}$/.test(metadata.id)||! /^[A-Z]{2}$/.test(metadata.country))throw new LookupError('invalid');
 const url='https://itunes.apple.com/lookup?id='+metadata.id+'&entity=song&country='+metadata.country;
 const data=await this.request(url,{refresh});return trackSnapshot(data,metadata,this.cache.get(url)?.at??this.now());}
 async cover(id){if(!UUID.test(id))throw new LookupError('invalid');const data=await this.request('https://coverartarchive.org/release-group/'+id);const front=data.images?.find(v=>v.front);if(!front)throw new LookupError('noFront');const url=front.thumbnails?.['1200']||front.image;if(!url)throw new LookupError('noFront');return this.request(url,{image:true});}
}
export function meaningful(title,artist){return [...(title+artist).trim()].length>=3||/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]{2}/u.test(title+artist);}
export class Debouncer{constructor(fn,{delay=900,timer=(fn,ms)=>setTimeout(fn,ms),clear=id=>clearTimeout(id)}={}){Object.assign(this,{fn,delay,timer,clear});this.composing=false;}cancel(){this.clear(this.id);}input(){this.cancel();if(!this.composing)this.id=this.timer(()=>{if(!this.composing)this.fn();},this.delay);}composition(start){this.composing=start;this.cancel();if(!start)this.input();}}
export function metadataRecord(v){const result={};for(const key of ['source','id','album','artist','year','country'])if(typeof v?.[key]==='string'&&v[key].length<=2000)result[key]=v[key];if(!['musicbrainz','itunes'].includes(result.source)||!result.id||!['album','artist','year'].every(k=>typeof result[k]==='string'))throw new LookupError('invalid');if(v?.trackCount===null||Number.isInteger(v?.trackCount)&&v.trackCount>=0&&v.trackCount<=10000)result.trackCount=v.trackCount;if(UUID.test(v?.coverMbid||''))result.coverMbid=v.coverMbid;return result;}

export function trackSnapshot(data,metadata,now=Date.now()){
 if(!Array.isArray(data?.results)||data.results.length>10001)throw new LookupError('invalid');
 const wrappers=data.results.filter(r=>r.wrapperType==='collection');if(wrappers.some(r=>String(r.collectionId)!==metadata.id||typeof r.collectionName==='string'&&norm(r.collectionName)!==norm(metadata.album)))throw new LookupError('invalid');
 const songs=data.results.filter(r=>r.wrapperType==='track'&&r.kind==='song'),unique=new Map();
 for(const r of songs){if(String(r.collectionId)!==metadata.id||!/^\d{1,20}$/.test(String(r.trackId))||typeof r.trackName!=='string'||r.trackName.length>2000||![r.discNumber,r.trackNumber].every(n=>Number.isInteger(n)&&n>=0&&n<=10000))throw new LookupError('invalid');
 const ms=r.trackTimeMillis??null;if(ms!==null&&(!Number.isInteger(ms)||ms<0||ms>MAX_DURATION))throw new LookupError('invalid');const key=String(r.trackId);if(!unique.has(key))unique.set(key,{id:'itunes-'+metadata.country+'-'+metadata.id+'-'+key,no:'',title:r.trackName,durationMs:ms,included:true,provenance:{sourceTrackId:key,discNumber:r.discNumber,trackNumber:r.trackNumber,title:r.trackName,durationMs:ms},modified:[]});}
 const rows=[...unique.values()].sort((a,b)=>a.provenance.discNumber-b.provenance.discNumber||a.provenance.trackNumber-b.provenance.trackNumber||a.provenance.sourceTrackId.localeCompare(b.provenance.sourceTrackId));if(rows.length>200)throw new LookupError('invalid');rows.forEach((r,i)=>r.no=String(i+1));
 const count=metadata.trackCount??wrappers[0]?.trackCount??null;if(count!==null&&(!Number.isInteger(count)||count<0||count>10000))throw new LookupError('invalid');
 return {rows,source:{source:'itunes',collectionId:metadata.id,country:metadata.country,fetchedAt:now,expectedTrackCount:count,returnedCount:rows.length},complete:count!==null&&rows.length===count&&wrappers.length===1&&(wrappers[0].trackCount===undefined||wrappers[0].trackCount===count)&&(data.resultCount===undefined||data.resultCount===data.results.length)};
}
