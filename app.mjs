import {initCaseUI} from './case-ui.mjs';
import {validateV3} from './project-v3.mjs';
import {emptyTrackList} from './tracks.mjs';
import {initOnline} from './online-ui.mjs';
import {metadataRecord,LookupError} from './online.mjs';
import {t,localeError,errorText,initI18n,onLanguageChange,getLanguage,FONT_OPTIONS,LANGUAGE_NAMES,fontChoices,fontName} from './i18n.mjs';
import {dimensions,PROFILES,PAPERS,calibration,sheetManifest,safeFilename,frontRaster} from './geometry.mjs';
import {initFonts,fontDiagnostics,frontCanvas,spineCanvas,caseCanvas,sheetCanvas,calibrationCanvas,getArtwork,prepare} from './render.mjs';
import {pngBlob} from './png.mjs';
const $=id=>document.getElementById(id);
initI18n();
let lastError=null,lastResult=null,startupFailure=false;const fontResults=new Map();
// Four ASCII data URLs at 24 Mi characters each, plus bounded UTF-8 JSON metadata.
const MAX_ART_DATA_CHARS=24*1024*1024,MAX_PROJECT_BYTES=100*1024*1024;
function checkProjectSize(size){if(size>MAX_PROJECT_BYTES)throw localeError('projectTooLarge');}
const examples=[{album:'海岸来信 / Coastal Letters',artist:'慢频电台',year:'2026'},{album:'深夜轨道 / Midnight Orbit',artist:'月台合成器',year:'2025'},{album:'留声花园 / Sound Garden',artist:'星期日的风',year:'2026'},{album:'蓝色时刻 / Blue Hour',artist:'远方回声',year:'2024'}];
function makeSet(seed){return {id:'set-'+'ABCD'[seed],trackList:emptyTrackList(),...examples[seed],latin:'atkinson',cjk:'noto-sans',theme:'dark',uppercase:true,hideHeader:false,hiMD:false,profile:'original',w:38,h:54,sw:58,sh:3.5,art:{type:'sample',seed}};}
let sets=examples.map((_,i)=>makeSet(i)),settings={setCount:4,paper:'selphy',calibrated:false,measuredX:50,measuredY:50,sheetPreset:'legacy-four',labelAssignments:[]},active=0,view='label',mode='compat',ready=false,revision=0,timer,jobCount=0;const uploads=new Map();
const exportIds=['export-front','export-spine','export-sheet','export-manifest','export-calibration','export-case'];
function error(e){lastError=e;$('error').hidden=!e;$('error').textContent=e?(typeof e==='string'?e:errorText(e)):'';}
function controlsEnabled(value){for(const id of exportIds)if($(id))$(id).disabled=!value;}
const fields={album:'album',artist:'artist',year:'year',latin:'latin',cjk:'cjk',uppercase:'uppercase','hide-header':'hideHeader','hi-md':'hiMD',profile:'profile','front-w':'w','front-h':'h','spine-w':'sw','spine-h':'sh'};
function syncFontOptions(set=sets[active]){for(const role of ['latin','cjk']){const select=$(role),options=fontChoices(role,set[role]).map(({key,info,retained})=>{const option=document.createElement('option');option.value=key;const name=fontName(key);option.textContent=retained?t('fontRetained',{name,languages:info.languages.map(k=>LANGUAGE_NAMES[k]).join(' / ')}):name;option.dataset.retained=String(retained);return option;});select.replaceChildren(...options);select.value=set[role];}$('font-locale-note').textContent=t('fontLocaleNote',{language:LANGUAGE_NAMES[getLanguage()]});}
function sheetTitle(cfg=settings){return t(({'case-only':'caseOnly','mixed-compact':'caseCompact','easier-cutting':'caseEasy'})[cfg.sheetPreset]||(cfg.setCount===4?'fourLayout':'twoLayout'));}
function syncForm(){const s=sets[active];syncFontOptions(s);for(const [id,key] of Object.entries(fields)){const el=$(id);if(el.type==='checkbox')el.checked=s[key];else el.value=s[key];}document.querySelectorAll('[name=theme]').forEach(el=>el.checked=el.value===s.theme);document.querySelectorAll('[data-set]').forEach(el=>{const chosen=Number(el.dataset.set)===active;el.setAttribute('aria-selected',String(chosen));el.tabIndex=chosen?0:-1;});$('set-count').value=settings.setCount;document.querySelector('[data-view=sheet]').textContent=sheetTitle();$('paper').value=settings.paper;$('calibrated').checked=settings.calibrated;$('measured-x').value=settings.measuredX;$('measured-y').value=settings.measuredY;$('export-mode').value=mode;syncNotes();caseUI?.display();}
function syncNotes(){document.querySelector('[data-view=sheet]').textContent=sheetTitle();const s=sets[active];$('custom-size').hidden=s.profile!=='custom';$('profile-note').textContent=t(({original:'profileOriginal',vendor:'profileVendor',sony:'profileSony',custom:'profileCustom'})[s.profile]);$('art-info').textContent=s.art.type==='upload'?t('coverMemory',{name:s.art.name||t('localCover')}):t(s.art.type==='none'?'noCover':'sampleCover');
 const compat=$('export-mode').querySelector('[value=compat]');compat.disabled=s.profile!=='original';if(compat.disabled&&mode==='compat'){mode='physical';$('export-mode').value=mode;}
 try{const d=dimensions(s),r=frontRaster(s,mode);$('export-note').textContent=mode==='compat'?t('compatNote'):t('physicalNote',{...d,...r});}catch(e){$('export-note').textContent=errorText(e);}
 $('export-sheet').textContent=settings.sheetPreset&&!settings.sheetPreset.startsWith('legacy-')?t(({ 'case-only':'caseOnly','mixed-compact':'caseCompact','easier-cutting':'caseEasy'})[settings.sheetPreset])+' · '+(settings.paper==='selphy'?'1181 × 1748':'1200 × 1800'):t('sheetDownload',{count:settings.setCount,pixels:settings.paper==='selphy'?'1181 × 1748':'1200 × 1800'});
 try{const c=calibration(settings);$('calibration-warning').classList.toggle('measured',settings.calibrated);$('calibration-warning').textContent=settings.calibrated?t('correctionWarning',{x:c.x.factor.toFixed(5),y:c.y.factor.toFixed(5)}):t('defaultWarning');}catch(e){$('calibration-warning').textContent=errorText(e);}
}
function schedule(){revision++;controlsEnabled(false);clearTimeout(timer);timer=setTimeout(()=>render(),90);}
function copyCanvas(target,source){target.width=source.width;target.height=source.height;target.getContext('2d').drawImage(source,0,0);}
async function render(){const current=++revision;if(!ready)return;syncNotes();
 const snapshot=structuredClone(sets),config={...settings},s=snapshot[active];
 const attempt=fn=>Promise.resolve().then(fn);
 const [front,spine,sheet,cal,caseResult]=await Promise.allSettled([
  attempt(()=>{if(uploads.has(active))throw localeError('coverBusy');return frontCanvas(s,mode);}),
  attempt(()=>spineCanvas(s)),
  attempt(()=>{if(uploads.size)throw localeError('coverBusy');return sheetCanvas(config.sheetPreset?.startsWith('legacy-')?snapshot.slice(0,config.setCount):snapshot,config);}),
  attempt(()=>({canvas:calibrationCanvas(config)})),attempt(()=>caseCanvas(s))]);
 if(current!==revision)return;
 for(const [id,r] of [['export-front',front],['export-spine',spine],['export-sheet',sheet],['export-manifest',sheet],['export-calibration',cal],['export-case',caseResult]])$(id).disabled=!!jobCount||r.status!=='fulfilled';
 lastResult={front,spine,sheet,cal,caseResult,config,active,view};
 if(spine.status==='fulfilled')copyCanvas($('spine-preview'),spine.value.canvas);
 else $('spine-preview').getContext('2d').clearRect(0,0,$('spine-preview').width,$('spine-preview').height);
 const selected=view==='case'?caseResult:view==='label'?front:view==='sheet'?sheet:cal;
 if(selected.status==='fulfilled')copyCanvas($('preview'),selected.value.canvas);
 else $('preview').getContext('2d').clearRect(0,0,$('preview').width,$('preview').height);
 $('preview-stage').classList.toggle('sheet',view!=='label');
 present(lastResult);
}
function present({front,spine,sheet,cal,caseResult,config,active,view}){
 const failures=[];if(view==='case'&&caseResult.status==='rejected')failures.push(errorText(caseResult.reason));for(const [name,r] of [['front',front],['spine',spine],['sheet',sheet],['calibrationSheet',cal]])if(r.status==='rejected')failures.push(t('notExportable',{name:t(name),reason:errorText(r.reason)}));
 const selected=view==='case'?caseResult:view==='label'?front:view==='sheet'?sheet:cal;
 const caption=view==='case'?t('caseLabel'):view==='label'?t('labelCaption',{set:'ABCD'[active]}):view==='sheet'?(config.sheetPreset&&!config.sheetPreset.startsWith('legacy-')?sheetTitle(config)+' · '+PAPERS[config.paper]?.width+' × '+PAPERS[config.paper]?.height+' mm':t('sheetCaption',{count:config.setCount,w:PAPERS[config.paper]?.width,h:PAPERS[config.paper]?.height})):t('rulerCaption');
 $('preview').setAttribute('aria-label',caption);$('preview-caption').textContent=caption+(selected.status==='rejected'?t('previewUnavailable'):'');
 const truncated=[front,spine].some(r=>r.status==='fulfilled'&&r.value.info?.truncated);
 $('render-status').textContent=(truncated?t('truncated'):'')+(failures.length?failures.join(' '):t('ready'));
 error(failures.length?failures.join(' '):null);
}
function presentFonts(){for(const [key,{node,ok,cause}] of fontResults){node.textContent=t(ok?'fontLoaded':'fontFailed',{key:fontName(key)})+(cause?' · '+errorText(cause):'');}}
onLanguageChange(()=>{
 // Chrome only: never touch canvas pixels, user data, fonts, geometry, or project state.
 const retained=lastError;syncFontOptions();syncNotes();document.querySelector('[data-view=sheet]').textContent=sheetTitle();presentFonts();
 if(lastResult)present(lastResult);
 if(retained&&typeof retained!=='string')error(retained);
 if(startupFailure)$('render-status').textContent=t('startupFailed');
});
async function runJob(fn){if(jobCount)return;jobCount++;controlsEnabled(false);error(null);let failure;try{if(uploads.size)throw localeError('coverStillBusy');await fn();}catch(e){failure=e;}finally{jobCount--;clearTimeout(timer);await render();if(failure)error(failure);}}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function exportPNG(kind){const snapshot=structuredClone(sets),config={...settings},set=snapshot[active];let canvas,suffix;if(kind==='case'){canvas=(await caseCanvas(set)).canvas;suffix='case';}else if(kind==='front'){canvas=(await frontCanvas(set,mode)).canvas;suffix=`${t('fileFront')}-${t(mode==='compat'?'fileCompat':'filePhysical')}`;}else if(kind==='spine'){canvas=(await spineCanvas(set)).canvas;suffix=t('fileSpine');}else if(kind==='sheet'){canvas=(await sheetCanvas(config.sheetPreset?.startsWith('legacy-')?snapshot.slice(0,config.setCount):snapshot,config)).canvas;suffix=t('fileSheet',{count:config.setCount,paper:config.paper==='selphy'?'SELPHY':'4x6'});}else{canvas=calibrationCanvas(config);suffix=t('fileCalibration',{paper:config.paper==='selphy'?'SELPHY':'4x6'});}download(await pngBlob(canvas),`${safeFilename(kind==='sheet'||kind==='calibration'?'MD-Studio':set.album||t('untitled'))}-${suffix}-300dpi.png`);}
for(const [id,key] of Object.entries(fields))$(id).addEventListener('input',()=>{const el=$(id);sets[active][key]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;if(key==='latin'||key==='cjk')syncFontOptions();syncNotes();schedule();});
document.querySelectorAll('[name=theme]').forEach(el=>el.addEventListener('change',()=>{sets[active].theme=el.value;schedule();}));
document.querySelectorAll('[data-set]').forEach(el=>el.addEventListener('click',()=>{active=Number(el.dataset.set);syncForm();schedule();}));
document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>{view=el.dataset.view;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-selected',String(b===el)));schedule();}));
document.querySelectorAll('[role=tablist]').forEach(list=>list.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const buttons=[...list.querySelectorAll('button')].filter(b=>!b.disabled&&!b.hidden&&b.getClientRects().length),i=buttons.indexOf(document.activeElement);if(i<0||!buttons.length)return;const next=buttons[(i+(e.key==='ArrowRight'?1:buttons.length-1))%buttons.length];next.focus();next.click();}));
$('editor-form').addEventListener('submit',e=>e.preventDefault());
$('random').onclick=()=>{uploads.delete(active);const prev=sets[active].art.seed??-1,choices=examples.map((_,i)=>i).filter(i=>i!==prev),seed=choices[Math.floor(Math.random()*choices.length)];Object.assign(sets[active],examples[seed],{art:{type:'sample',seed}});syncForm();schedule();};
$('clear-art').onclick=()=>{uploads.delete(active);sets[active].art={type:'none'};syncNotes();schedule();};
$('redraw').onclick=()=>schedule();
$('export-mode').onchange=()=>{mode=$('export-mode').value;schedule();};
for(const [id,key] of [['paper','paper'],['calibrated','calibrated'],['measured-x','measuredX'],['measured-y','measuredY']])$(id).addEventListener('input',()=>{const el=$(id);settings[key]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;schedule();});
for(const kind of ['front','spine','sheet','calibration'])$('export-'+kind).onclick=()=>runJob(()=>exportPNG(kind));
$('export-manifest').onclick=()=>runJob(async()=>{const result=await sheetCanvas(structuredClone(settings.sheetPreset?.startsWith('legacy-')?sets.slice(0,settings.setCount):sets),{...settings});result.manifest.exportPx={width:result.canvas.width,height:result.canvas.height};download(new Blob([JSON.stringify(result.manifest,null,2)],{type:'application/json'}),`MD-Studio-${t('fileGeometry')}.json`);});
function readData(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(localeError('fileRead'));r.readAsDataURL(file);});}
$('art-file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;const index=active,token={};uploads.set(index,token);schedule();try{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12*1024*1024)throw localeError('uploadType');const art={type:'upload',data:await readData(file),name:file.name};const img=await getArtwork(art);if(Math.max(img.width,img.height)>2048){const scale=2048/Math.max(img.width,img.height),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);art.data=c.toDataURL('image/png');}if(art.data.length>MAX_ART_DATA_CHARS||art.name.length>1024)throw localeError('coverLimit');if(uploads.get(index)!==token)return;sets[index].art=art;uploads.delete(index);syncNotes();schedule();}catch(e){if(uploads.get(index)===token)uploads.delete(index);clearTimeout(timer);await render();error(e);}};
$('save-project').onclick=()=>runJob(async()=>{const project={schema:'md-studio-project/3',sets,settings,mode};validateProject(project);const blob=new Blob([JSON.stringify(project,null,2)],{type:'application/json'});checkProjectSize(blob.size);download(blob,`MD-Studio-${t('fileProject')}.json`);});
function validateLegacyProject(data){const legacy=data?.schema==='md-studio-project/1';if(!Array.isArray(data?.sets)||!(legacy?data.sets.length===2:data?.schema==='md-studio-project/2'&&data.sets.length===4))throw localeError('unsupportedProject');const clean=data.sets.map(s=>{const out=makeSet(0);delete out.id;delete out.trackList;for(const key of ['album','artist','year']){if(typeof s[key]!=='string'||s[key].length>2000)throw localeError('projectText');out[key]=s[key];}for(const [key,values] of Object.entries({latin:Object.keys(FONT_OPTIONS).filter(k=>FONT_OPTIONS[k].role==='latin'),cjk:Object.keys(FONT_OPTIONS).filter(k=>FONT_OPTIONS[k].role==='cjk'),theme:['dark','light'],profile:Object.keys(PROFILES)})){if(!values.includes(s[key]))throw localeError('projectOption',{keyKey:({latin:'latinFont',cjk:'cjkFont',theme:'theme',profile:'profile'})[key]});out[key]=s[key];}for(const key of ['w','h','sw','sh'])out[key]=Number(s[key]);for(const key of ['uppercase','hideHeader','hiMD'])out[key]=s[key]===true;dimensions(out);if(s.lookup!==undefined)out.lookup=metadataRecord(s.lookup);if(s.art?.type==='sample'&&Number.isInteger(s.art.seed)&&s.art.seed>=0&&s.art.seed<4)out.art={type:'sample',seed:s.art.seed};else if(s.art?.type==='none')out.art={type:'none'};else if(s.art?.type==='upload'&&typeof s.art.data==='string'&&s.art.data.length<=MAX_ART_DATA_CHARS&&typeof s.art.name==='string'&&s.art.name.length<=1024)out.art={type:'upload',data:s.art.data,name:s.art.name};else throw localeError('projectArt');return out;});if(legacy)clean.push(makeSet(2),makeSet(3));const count=legacy?2:data.settings?.setCount;if(![2,4].includes(count))throw localeError('projectCount');const cfg={setCount:count,paper:data.settings?.paper,calibrated:data.settings?.calibrated===true,measuredX:Number(data.settings?.measuredX),measuredY:Number(data.settings?.measuredY)};if(!PAPERS[cfg.paper])throw localeError('projectPaper');calibration(cfg);return {sets:clean,settings:cfg,mode:data.mode==='compat'?'compat':'physical'};}
function validateProject(data){return validateV3(data,validateLegacyProject);}
$('set-count').onchange=()=>{settings.setCount=Number($('set-count').value);settings.sheetPreset=settings.setCount===2?'legacy-two':'legacy-four';settings.labelAssignments=[];syncForm();schedule();};
$('load-project').onchange=e=>{const file=e.target.files[0];e.target.value='';if(!file)return;runJob(async()=>{checkProjectSize(file.size);let raw;try{raw=JSON.parse(await file.text());}catch{throw localeError('invalidJson');}const data=validateProject(raw);await Promise.all(data.sets.map(prepare));uploads.clear();sets=data.sets;settings=data.settings;mode=data.mode;active=0;caseUI.resetProject();syncForm();});};
async function start(){syncForm();try{await initFonts((key,ok,cause)=>{const node=document.createElement('li');fontResults.set(key,{node,ok,cause});$('font-status').append(node);presentFonts();});if(!fontDiagnostics().atkinson?.loaded)throw localeError('baseFont');ready=true;await render();}catch(e){error(e);startupFailure=true;$('render-status').textContent=t('startupFailed');}}
export const studio={getState:()=>structuredClone({sets,settings,active,view,mode}),render,fontDiagnostics,validateProject,exportPNG};
let getArtworkResolution=null;
function coverResolution(target,w,h){const d=dimensions(target),area=Math.min(d.w,d.h-(target.hideHeader?0:5)-8),ratio=area/Math.max(w,h);return {w,h,low:w<600||h<600||w<Math.ceil(w*ratio/25.4*300)||h<Math.ceil(h*ratio/25.4*300)};}
const online=initOnline({getTarget:()=>sets[active],applyMetadata:metadata=>{Object.assign(sets[active],{album:metadata.album,artist:metadata.artist,year:metadata.year,lookup:metadata});syncForm();schedule();},getResolution:()=>{const target=sets[active],img=getArtworkResolution;return img&&img.target===target?coverResolution(target,img.w,img.h):null;},applyCover:async(blob,valid,mbid)=>{const index=active,target=sets[index],previous=target.art;const art={type:'upload',data:await readData(blob),name:'CAA-cover'};let img;try{img=await getArtwork(art);}catch{throw new LookupError('decode');}const w=img.width,h=img.height;if(w*h>40*1024*1024)throw new LookupError('invalid');if(Math.max(w,h)>2048){const scale=2048/Math.max(w,h),c=document.createElement('canvas');c.width=Math.round(w*scale);c.height=Math.round(h*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);art.data=c.toDataURL('image/png');}if(art.data.length>MAX_ART_DATA_CHARS)throw new LookupError('invalid');if(!valid()||sets[index]!==target||target.art!==previous||uploads.has(index))throw new LookupError('cancelled');target.art=art;if(target.lookup)target.lookup.coverMbid=mbid;const scale=Math.min(1,2048/Math.max(w,h));getArtworkResolution={target,w:Math.round(w*scale),h:Math.round(h*scale)};syncNotes();schedule();return coverResolution(target,getArtworkResolution.w,getArtworkResolution.h);}});
let caseUI=initCaseUI({getSets:()=>sets,getSettings:()=>settings,getTarget:()=>sets[active],changed:()=>{syncNotes();schedule();},exportCase:()=>runJob(()=>exportPNG('case')),showCase:()=>{view='case';document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-selected','false'));schedule();},online});
start();
