import {dimensions,PROFILES,PAPERS,calibration,sheetManifest,safeFilename,frontRaster} from './geometry.mjs';
import {initFonts,fontDiagnostics,frontCanvas,spineCanvas,sheetCanvas,calibrationCanvas,getArtwork,prepare} from './render.mjs';
import {pngBlob} from './png.mjs';
const $=id=>document.getElementById(id);
const examples=[{album:'海岸来信 / Coastal Letters',artist:'慢频电台',year:'2026'},{album:'深夜轨道 / Midnight Orbit',artist:'月台合成器',year:'2025'},{album:'留声花园 / Sound Garden',artist:'星期日的风',year:'2026'},{album:'蓝色时刻 / Blue Hour',artist:'远方回声',year:'2024'}];
function makeSet(seed){return {...examples[seed],latin:'atkinson',cjk:'noto-sans',theme:'dark',uppercase:true,hideHeader:false,profile:'original',w:38,h:54,sw:58,sh:3.5,art:{type:'sample',seed}};}
let sets=[makeSet(0),makeSet(1)],settings={paper:'selphy',calibrated:false,measuredX:50,measuredY:50},active=0,view='label',mode='compat',ready=false,revision=0,timer,jobCount=0;const uploads=new Map();
const exportIds=['export-front','export-spine','export-sheet','export-manifest','export-calibration'];
function error(e){$('error').hidden=!e;$('error').textContent=e?String(e.message||e):'';}
function controlsEnabled(value){for(const id of exportIds)$(id).disabled=!value;}
const fields={album:'album',artist:'artist',year:'year',latin:'latin',cjk:'cjk',uppercase:'uppercase','hide-header':'hideHeader',profile:'profile','front-w':'w','front-h':'h','spine-w':'sw','spine-h':'sh'};
function syncForm(){const s=sets[active];for(const [id,key] of Object.entries(fields)){const el=$(id);if(el.type==='checkbox')el.checked=s[key];else el.value=s[key];}document.querySelectorAll('[name=theme]').forEach(el=>el.checked=el.value===s.theme);document.querySelectorAll('[data-set]').forEach(el=>{const chosen=Number(el.dataset.set)===active;el.setAttribute('aria-selected',String(chosen));el.tabIndex=chosen?0:-1;});$('paper').value=settings.paper;$('calibrated').checked=settings.calibrated;$('measured-x').value=settings.measuredX;$('measured-y').value=settings.measuredY;$('export-mode').value=mode;syncNotes();}
function syncNotes(){const s=sets[active],p=PROFILES[s.profile];$('custom-size').hidden=s.profile!=='custom';$('profile-note').textContent=({original:'原版基准，不保证适合所有盘壳；不是猜测的 36 × 53 mm。',vendor:'32 × 52 mm：Elecom EDT-KMD1 / A-one 31274 厂商规格。',sony:'35.75 × 52.75 mm：社区测量，非 Sony 官方统一规格；此处为矩形，未模拟切角。',custom:'按你的盘壳平整贴标区域测量；过大或重叠将阻止整张导出。'})[s.profile];$('art-info').textContent=s.art.type==='upload'?(s.art.name||'本地封面')+' · 仅保存在浏览器内存':s.art.type==='none'?'未放置封面':'原创几何封面 · 无版权素材复用';
 const compat=$('export-mode').querySelector('[value=compat]');compat.disabled=s.profile!=='original';if(compat.disabled&&mode==='compat'){mode='physical';$('export-mode').value=mode;}
 try{const d=dimensions(s),r=frontRaster(s,mode);$('export-note').textContent=mode==='compat'?'源码推导兼容：448 × 637 px，pHYs 11811/m（300 DPI）；实际编码尺寸约 37.931 × 53.933 mm。尚未经原站真实 PNG 验证。':`真实毫米取整：${d.w} × ${d.h} mm → ${r.width} × ${r.height} px。单边取整误差 ≤ 0.043 mm；单张导出不应用纸张补偿。`;}catch(e){$('export-note').textContent=e.message;}
 $('export-sheet').textContent=`下载两套排版 · ${settings.paper==='selphy'?'1181 × 1748':'1200 × 1800'} px`;
 try{const c=calibration(settings);$('calibration-warning').classList.toggle('measured',settings.calibrated);$('calibration-warning').textContent=settings.calibrated?`已填写补偿 · X ${c.x.factor.toFixed(5)} / Y ${c.y.factor.toFixed(5)}。仅为软件补偿，尚待实际试印确认；导出的校准测试纸始终不补偿。`:'未校准 · X / Y = 1。无边距打印可能放大，有边距打印可能缩小；两者都不保证实物等大。';}catch(e){$('calibration-warning').textContent=e.message;}
}
function schedule(){revision++;controlsEnabled(false);clearTimeout(timer);timer=setTimeout(()=>render(),90);}
function copyCanvas(target,source){target.width=source.width;target.height=source.height;target.getContext('2d').drawImage(source,0,0);}
async function render(){const current=++revision;if(!ready)return;syncNotes();
 const snapshot=structuredClone(sets),config={...settings},s=snapshot[active];
 const attempt=fn=>Promise.resolve().then(fn);
 const [front,spine,sheet,cal]=await Promise.allSettled([
  attempt(()=>{if(uploads.has(active))throw Error('正在解码封面，请稍候…');return frontCanvas(s,mode);}),
  attempt(()=>spineCanvas(s)),
  attempt(()=>{if(uploads.size)throw Error('正在解码封面，请稍候…');return sheetCanvas(snapshot,config);}),
  attempt(()=>({canvas:calibrationCanvas(config)}))]);
 if(current!==revision)return;
 for(const [id,r] of [['export-front',front],['export-spine',spine],['export-sheet',sheet],['export-manifest',sheet],['export-calibration',cal]])$(id).disabled=!!jobCount||r.status!=='fulfilled';
 const failures=[];for(const [name,r] of [['正面',front],['书脊',spine],['整张排版',sheet],['校准纸',cal]])if(r.status==='rejected')failures.push(name+'暂不可导出：'+r.reason.message);
 if(spine.status==='fulfilled')copyCanvas($('spine-preview'),spine.value.canvas);
 else $('spine-preview').getContext('2d').clearRect(0,0,$('spine-preview').width,$('spine-preview').height);
 const selected=view==='label'?front:view==='sheet'?sheet:cal;
 const caption=view==='label'?`${active?'B':'A'} / 正面与书脊独立验证`:view==='sheet'?`两套独立标签 / ${PAPERS[config.paper]?.width} × ${PAPERS[config.paper]?.height} mm`:'未补偿标尺 / X 50 mm · Y 50 mm';
 if(selected.status==='fulfilled')copyCanvas($('preview'),selected.value.canvas);
 else $('preview').getContext('2d').clearRect(0,0,$('preview').width,$('preview').height);
 $('preview-stage').classList.toggle('sheet',view!=='label');$('preview').setAttribute('aria-label',caption);$('preview-caption').textContent=caption+(selected.status==='rejected'?' · 此预览不可用':'');
 const truncated=[front,spine].some(r=>r.status==='fulfilled'&&r.value.info?.truncated);
 $('render-status').textContent=(truncated?'长文字已在标签边界内截断；完整输入仍保留。 ':'')+(failures.length?failures.join(' '):'离线字体与封面已就绪 · PNG 导出内嵌 300 DPI · 全部处理留在本机');
 error(failures.length?failures.join(' '):null);
}
async function runJob(fn){if(jobCount)return;jobCount++;controlsEnabled(false);error(null);let failure;try{if(uploads.size)throw Error('封面仍在解码，请稍候');await fn();}catch(e){failure=e;}finally{jobCount--;clearTimeout(timer);await render();if(failure)error(failure);}}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function exportPNG(kind){const snapshot=structuredClone(sets),config={...settings},set=snapshot[active];let canvas,suffix;if(kind==='front'){canvas=(await frontCanvas(set,mode)).canvas;suffix=`front-${mode}`;}else if(kind==='spine'){canvas=(await spineCanvas(set)).canvas;suffix='spine';}else if(kind==='sheet'){canvas=(await sheetCanvas(snapshot,config)).canvas;suffix=`two-sets-${config.paper}`;}else{canvas=calibrationCanvas(config);suffix=`calibration-uncorrected-${config.paper}`;}download(await pngBlob(canvas),`${safeFilename(kind==='sheet'||kind==='calibration'?'MD-Studio':set.album)}-${suffix}-300dpi.png`);}
for(const [id,key] of Object.entries(fields))$(id).addEventListener('input',()=>{const el=$(id);sets[active][key]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;syncNotes();schedule();});
document.querySelectorAll('[name=theme]').forEach(el=>el.addEventListener('change',()=>{sets[active].theme=el.value;schedule();}));
document.querySelectorAll('[data-set]').forEach(el=>el.addEventListener('click',()=>{active=Number(el.dataset.set);syncForm();schedule();}));
document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>{view=el.dataset.view;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-selected',String(b===el)));schedule();}));
document.querySelectorAll('[role=tablist]').forEach(list=>list.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const buttons=[...list.querySelectorAll('button')],i=buttons.indexOf(document.activeElement),next=buttons[(i+(e.key==='ArrowRight'?1:buttons.length-1))%buttons.length];next.focus();next.click();}));
$('editor-form').addEventListener('submit',e=>e.preventDefault());
$('random').onclick=()=>{uploads.delete(active);const prev=sets[active].art.seed??-1,choices=examples.map((_,i)=>i).filter(i=>i!==prev),seed=choices[Math.floor(Math.random()*choices.length)];Object.assign(sets[active],examples[seed],{art:{type:'sample',seed}});syncForm();schedule();};
$('clear-art').onclick=()=>{uploads.delete(active);sets[active].art={type:'none'};syncNotes();schedule();};
$('redraw').onclick=()=>schedule();
$('export-mode').onchange=()=>{mode=$('export-mode').value;schedule();};
for(const [id,key] of [['paper','paper'],['calibrated','calibrated'],['measured-x','measuredX'],['measured-y','measuredY']])$(id).addEventListener('input',()=>{const el=$(id);settings[key]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;schedule();});
for(const kind of ['front','spine','sheet','calibration'])$('export-'+kind).onclick=()=>runJob(()=>exportPNG(kind));
$('export-manifest').onclick=()=>runJob(async()=>{const result=await sheetCanvas(structuredClone(sets),{...settings});result.manifest.exportPx={width:result.canvas.width,height:result.canvas.height};download(new Blob([JSON.stringify(result.manifest,null,2)],{type:'application/json'}),'MD-Studio-geometry.json');});
function readData(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('本地文件读取失败'));r.readAsDataURL(file);});}
$('art-file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;const index=active,token={};uploads.set(index,token);schedule();try{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12*1024*1024)throw Error('请选择不超过 12 MiB 的 PNG / JPEG / WebP；不接收 SVG 或动图');const art={type:'upload',data:await readData(file),name:file.name};const img=await getArtwork(art);if(Math.max(img.width,img.height)>2048){const scale=2048/Math.max(img.width,img.height),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);art.data=c.toDataURL('image/png');}if(uploads.get(index)!==token)return;sets[index].art=art;uploads.delete(index);syncNotes();schedule();}catch(e){if(uploads.get(index)===token)uploads.delete(index);clearTimeout(timer);await render();error(e);}};
$('save-project').onclick=()=>runJob(async()=>download(new Blob([JSON.stringify({schema:'md-studio-project/1',sets,settings,mode},null,2)],{type:'application/json'}),'MD-Studio-project.json'));
function validateProject(data){if(data?.schema!=='md-studio-project/1'||!Array.isArray(data.sets)||data.sets.length!==2)throw Error('不是受支持的双套标签项目');const clean=data.sets.map(s=>{const out=makeSet(0);for(const key of ['album','artist','year']){if(typeof s[key]!=='string'||s[key].length>2000)throw Error('项目文字字段无效');out[key]=s[key];}for(const [key,values] of Object.entries({latin:['atkinson','b612'],cjk:['noto-sans','noto-serif','wenkai'],theme:['dark','light'],profile:Object.keys(PROFILES)})){if(!values.includes(s[key]))throw Error('项目包含未知选项：'+key);out[key]=s[key];}for(const key of ['w','h','sw','sh'])out[key]=Number(s[key]);for(const key of ['uppercase','hideHeader'])out[key]=s[key]===true;dimensions(out);if(s.art?.type==='sample'&&Number.isInteger(s.art.seed)&&s.art.seed>=0&&s.art.seed<4)out.art={type:'sample',seed:s.art.seed};else if(s.art?.type==='none')out.art={type:'none'};else if(s.art?.type==='upload'&&typeof s.art.data==='string'&&s.art.data.length<18000000)out.art={type:'upload',data:s.art.data,name:String(s.art.name||'本地封面').slice(0,200)};else throw Error('项目图片字段无效');return out;});const cfg={paper:data.settings?.paper,calibrated:data.settings?.calibrated===true,measuredX:Number(data.settings?.measuredX),measuredY:Number(data.settings?.measuredY)};if(!PAPERS[cfg.paper])throw Error('项目纸张无效');calibration(cfg);return {sets:clean,settings:cfg,mode:data.mode==='compat'?'compat':'physical'};}
$('load-project').onchange=e=>{const file=e.target.files[0];e.target.value='';if(!file)return;runJob(async()=>{if(file.size>30*1024*1024)throw Error('项目文件超过 30 MiB');const data=validateProject(JSON.parse(await file.text()));await Promise.all(data.sets.map(prepare));uploads.clear();sets=data.sets;settings=data.settings;mode=data.mode;active=0;syncForm();});};
async function start(){syncForm();try{await initFonts((key,ok)=>{const li=document.createElement('li');li.textContent=`${key} — ${ok?'离线字体已真实载入':'载入失败，相关导出已阻止'}`;$('font-status').append(li);});if(!fontDiagnostics().atkinson?.loaded)throw Error('基础字体载入失败，请检查 assets/fonts 是否完整');ready=true;await render();}catch(e){error(e);$('render-status').textContent='启动失败。请确保通过 HTTP 服务访问，且字体文件未丢失。';}}
export const studio={getState:()=>structuredClone({sets,settings,active,view,mode}),render,fontDiagnostics,validateProject,exportPNG};
start();
