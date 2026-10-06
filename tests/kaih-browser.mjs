import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
// Kaih CASE/J-card acceptance: real Chromium downloads for all four layouts in both
// formats, interior toggles/palettes/fonts, six-language pixel stability, and frozen
// 778cb80 no-case byte identity. Interior-only scope: exports/sheet modes untouched.
const root=path.resolve(import.meta.dirname,'..'),project=path.resolve(root,'..'),out=path.join(project,'artifacts/case-label/kaih-browser');await mkdir(out,{recursive:true});
const baseline=path.join(project,'artifacts/case-label/kaih-baseline-778cb80');
const pw=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright-core');
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;},ok=(v,m)=>{assert.ok(v,m);checks++;};const hash=b=>createHash('sha256').update(b).digest('hex');
const server=createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname,dir=root;if(p.startsWith('/base/')){dir=baseline;p=p.slice(5);}if(p.endsWith('/'))p+='index.html';const f=path.resolve(dir,'.'+p);if(!f.startsWith(dir+'/'))throw Error('outside');res.setHeader('Content-Type',({'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.json':'application/json','.woff2':'font/woff2','.svg':'image/svg+xml'})[path.extname(f)]||'text/plain');res.end(await readFile(f));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await pw.chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const ctx=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:1000}}),page=await ctx.newPage(),files=[],errors=[],external=[];
ctx.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith(origin)||u.startsWith('blob:'+origin)||u.startsWith('data:'))return r.continue();external.push(u);return r.abort();});
function crc(b){let c=0xffffffff;for(const v of b){c^=v;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function inspect(b,w,h){eq(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),true,'PNG signature');eq([b.readUInt32BE(16),b.readUInt32BE(20)],[w,h],'PNG dimensions');let at=8,densities=0,last='';while(at<b.length){const n=b.readUInt32BE(at),type=b.toString('ascii',at+4,at+8);ok(at+n+12<=b.length,'chunk bounds');eq(crc(b.subarray(at+4,at+n+8)),b.readUInt32BE(at+n+8),'CRC '+type);if(type==='pHYs'){densities++;eq([b.readUInt32BE(at+8),b.readUInt32BE(at+12),b[at+16]],[11811,11811,1],'pHYs 300dpi');}last=type;at+=n+12;}eq([densities,last,at],[1,'IEND',b.length],'unique pHYs, complete PNG');}
async function settle(p=page){await p.bringToFront();await p.waitForTimeout(250);await p.waitForFunction(()=>!document.querySelector('#export-spine').disabled,null,{timeout:60000});}
const state=(p=page)=>p.evaluate(async()=> (await import('./app.mjs')).studio.getState());
const probe=(p,fn,...args)=>p.evaluate(fn,...args);
async function dl(p,id,name,w,h){await p.bringToFront();await p.waitForFunction(id=>!document.getElementById(id).disabled,id,{timeout:60000});const pending=p.waitForEvent('download',{timeout:60000});await p.locator('#'+id).click();const d=await pending;await d.saveAs(path.join(out,name+'.png'));const b=await readFile(path.join(out,name+'.png'));if(w)inspect(b,w,h);files.push({file:name+'.png',bytes:b.length,sha256:hash(b),suggestedFilename:d.suggestedFilename()});await settle(p);return b;}
async function dlJson(p,id,name){await p.bringToFront();await p.waitForFunction(id=>!document.getElementById(id).disabled,id,{timeout:60000});const pending=p.waitForEvent('download',{timeout:60000});await p.locator('#'+id).click();const d=await pending;const fp=path.join(out,name+'.json');await d.saveAs(fp);await settle(p);return JSON.parse(await readFile(fp,'utf8'));}
async function identity(p,b){return p.evaluate(async b64=>{const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);const pv=document.querySelector('#preview');if(c.width!==pv.width||c.height!==pv.height)return false;const a=x.getImageData(0,0,c.width,c.height).data,d=pv.getContext('2d').getImageData(0,0,pv.width,pv.height).data;return a.every((v,i)=>v===d[i]);},b.toString('base64'));}
try{
 await page.goto(origin+'/');await settle();
 // Frozen no-case parity first: identical project loaded in current and 778cb80 apps.
 const old=await ctx.newPage();await old.goto(origin+'/base/');await settle(old);
 const fixture=await dlJson(old,'save-project','frozen-fixture');
 ok(fixture.schema==='md-studio-project/4','frozen 778cb80 saves v4');ok(fixture.sets.every(s=>!s.case),'frozen fixture is no-case');
 await page.locator('#load-project').setInputFiles({name:'project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await settle();
 for(const mode of ['compat','physical']){await page.locator('#export-mode').selectOption(mode);await old.locator('#export-mode').selectOption(mode);await settle();await settle(old);eq(hash(await dl(page,'export-front','parity-front-'+mode,mode==='compat'?448:449,mode==='compat'?637:638)),hash(await dl(old,'export-front','frozen-front-'+mode,null,null)),'778cb80 front byte parity '+mode);}
 for(const [id,w,h] of [['export-spine',685,41],['export-sheet',1181,1748],['export-calibration',1181,1748]])eq(hash(await dl(page,id,'parity-'+id,w,h)),hash(await dl(old,id,'frozen-'+id,null,null)),'778cb80 '+id+' byte parity');
 const pm=await dlJson(page,'export-manifest','parity-manifest'),fm=await dlJson(old,'export-manifest','frozen-manifest');
 eq(JSON.stringify(pm),JSON.stringify(fm),'778cb80 manifest byte parity');
 await old.close();
 // Shared sample release for all eight fixtures (spec section 5).
 await page.locator('#album').fill('Blue Hour');await page.locator('#artist').fill('Mika Vale');await page.locator('#year').fill('2026');
 await page.locator('#case-enabled').check();await settle();
 for(let i=0;i<6;i++){await page.locator('#track-add').click();await page.locator('[data-track-field=title]').nth(i).fill('Track Title '+i);await page.locator('[data-track-field=title]').nth(i).blur();}
 await settle();ok((await state()).sets[0].case.template==='kaih-image-tracks','new case defaults to image+tracks');
 ok(await probe(page,()=>document.fonts.check('16px "MD Kaih Inter"')),'kaih offline font ready');
 const layouts=['kaih-image-tracks','kaih-image','kaih-background-tracks','kaih-tracks'];
 for(const [variant,profile,w,h] of [['case','kaih-case-71x60',839,709],['jcard','kaih-jcard-68x64',803,756]]){
  await page.locator('#case-variant').selectOption(profile);await settle();
  for(const layout of layouts){
   await page.locator('#case-layout').selectOption(layout);await settle();
   await page.locator('#case-preview-button').click();await settle();
   const b=await dl(page,'export-case',variant+'-'+layout,w,h);
   ok(await identity(page,b),variant+' '+layout+' preview/export pixel identity');
   ok(files.at(-1).suggestedFilename.includes(variant==='jcard'?'jcard':'case')&&files.at(-1).suggestedFilename.endsWith('-300dpi.png'),variant+' '+layout+' download filename');
   eq((await state()).sets[0].case.template,layout,variant+' state template '+layout);
  }
 }
 // J-card exactly 803px wide: no screenshot-ceil 804.
 eq(await probe(page,()=>[document.querySelector('#preview').width,document.querySelector('#preview').height]),[803,756],'J-card preview 803x756 exact');
 // Interior toggles (title block, spine info) with real differing exports.
 await page.locator('#case-variant').selectOption('kaih-jcard-68x64');await page.locator('#case-layout').selectOption('kaih-image');await settle();await page.locator('#case-preview-button').click();await settle();
 const spineOn=await dl(page,'export-case','jcard-image-spine-on',803,756);
 const stripOpaque=await probe(page,()=>{const p=document.querySelector('#preview'),x=p.getContext('2d'),mm=300/25.4;const at=(mx,my)=>Array.from(x.getImageData(Math.round(mx*mm),Math.round(my*mm),1,1).data);return {strip:at(34,2.5).slice(0,3),below:at(34,30).slice(0,3)};});
 await page.locator('#case-spine-info').uncheck();await settle();const spineOff=await dl(page,'export-case','jcard-image-spine-off',803,756);
 ok(!spineOn.equals(spineOff),'spine info toggle changes pixels');eq((await state()).sets[0].case.jCardSpineInfo,false,'spine flag persisted');
 eq(stripOpaque.strip.every((v,i)=>Math.abs(v-[0x11,0x18,0x20][i])<=3),true,'opaque 5mm strip painted in default palette');
 await page.locator('#case-variant').selectOption('kaih-case-71x60');await page.locator('#case-layout').selectOption('kaih-image');await settle();
 const blockOn=await dl(page,'export-case','case-image-title-on',839,709);
 await page.locator('#case-title-block').uncheck();await settle();const blockOff=await dl(page,'export-case','case-image-title-off',839,709);
 ok(!blockOn.equals(blockOff),'title block toggle changes pixels');ok(!(await state()).sets[0].case.titleBlock,'title flag persisted');
 // Logo styles x corners, real downloads.
 for(const style of ['auto','black','white','emoji','none'])for(const corner of ['bottom-right','bottom-left','top-right']){await page.locator('#case-logo-style').selectOption(style);await page.locator('#case-logo-corner').selectOption(corner);await settle();await dl(page,'export-case','logo-'+style+'-'+corner,839,709);}
 const by=n=>files.find(f=>f.file===n+'.png').sha256;
 ok(by('logo-none-bottom-right')!==by('logo-black-bottom-right'),'logo none/black differ');
 ok(by('logo-auto-bottom-right')!==by('logo-auto-top-right'),'logo corner changes pixels');
 // Six exact palettes and custom colors.
 const palettes=await probe(page,async()=>(await import('./kaih-case.mjs')).KAIH_PALETTES);
 for(let i=0;i<6;i++){await page.locator('#case-palette').selectOption(String(i));await settle();const c=(await state()).sets[0].case;eq([c.palette,c.caseBg,c.caseText,c.spineBg],[i,palettes[i].caseBg,palettes[i].caseText,palettes[i].spineBg],'palette '+i+' exact values applied');}
 await dl(page,'export-case','palette-5',839,709);
 await page.locator('#case-caseBg').fill('#123456');await page.locator('#case-caseText').fill('#fedcba');await settle();eq([(await state()).sets[0].case.caseBg,(await state()).sets[0].case.caseText],['#123456','#fedcba'],'custom case colors persisted');await dl(page,'export-case','custom-colors',839,709);
 // Independent image: upload, album-cover source, clear.
 const upload=await probe(page,()=>{const c=document.createElement('canvas');c.width=700;c.height=512;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,700,512);g.addColorStop(0,'#ff0055');g.addColorStop(1,'#0055ff');x.fillStyle=g;x.fillRect(0,0,700,512);x.fillStyle='#ffee00';x.fillRect(280,180,140,140);return c.toDataURL('image/png').split(',')[1];});
 await page.locator('#case-image-file').setInputFiles({name:'case-upload.png',mimeType:'image/png',buffer:Buffer.from(upload,'base64')});await settle();
 eq((await state()).sets[0].case.image.type,'upload','uploaded case image persisted');const uploaded=await dl(page,'export-case','image-upload',839,709);
 await page.locator('#case-image-album').click();await settle();eq((await state()).sets[0].case.image.type,'album','album-cover source');const albumArt=await dl(page,'export-case','image-album',839,709);ok(!uploaded.equals(albumArt),'upload vs album cover differ');
 await page.locator('#case-image-clear').click();await settle();eq((await state()).sets[0].case.image.type,'sample','clear returns sample artwork');
 // Empty fields keep literal separator; still exports.
 await page.locator('#album').fill('');await page.locator('#artist').fill('');await page.locator('#year').fill('');await settle();await dl(page,'export-case','empty-fields',839,709);
 await page.locator('#album').fill('Blue Hour');await page.locator('#artist').fill('Mika Vale');await page.locator('#year').fill('2026');await settle();
 // 14 tracks: 13 drawn, saved rows preserved, omitted warning visible.
 await page.locator('#case-layout').selectOption('kaih-image-tracks');await settle();
 for(let i=6;i<14;i++){await page.locator('#track-add').click();await page.locator('[data-track-field=title]').nth(i).fill('Extra '+i);await page.locator('[data-track-field=title]').nth(i).blur();}
 await settle();eq((await state()).sets[0].trackList.rows.length,14,'all 14 rows preserved');
 const info=await probe(page,async()=>{const {studio}=await import('./app.mjs'),{caseCanvas}=await import('./render.mjs');const r=await caseCanvas(studio.getState().sets[0]);return {drawn:r.info.rows.length,omitted:r.info.omitted};});
 eq([info.drawn,info.omitted],[13,1],'13 drawn, 1 omitted');ok((await page.locator('#render-status').textContent()).includes('additional strings remain saved'),'omitted warning shown');
 // Long Latin/CJK overflow: warning, no block, no shrink.
 await page.locator('#album').fill('Extremely Long Title 非常に長いタイトル '.repeat(6));await settle();
 ok((await page.locator('#render-status').textContent()).includes('exceeds trim bounds'),'overflow warning shown');
 ok(!(await page.locator('#export-case').isDisabled()),'overflow never blocks export');await dl(page,'export-case','overflow-long-title',839,709);
 await page.locator('#album').fill('Blue Hour');await settle();
 // Exact freeform track text and spine override.
 await page.locator('#case-track-override').check();await settle();await page.locator('#case-track-text').fill('01 Opening 0:42\n02 邦楽タイトル 4:05\n03 Extra\n'+Array.from({length:12},(_,i)=>'0'+(4+i)+' Line '+(4+i)).join('\n'));await page.locator('#case-track-text').blur();await settle();
 eq((await state()).sets[0].case.trackText.split('\n').length,15,'freeform 15 lines saved');await dl(page,'export-case','freeform-tracks',839,709);
 await page.locator('#case-track-override').uncheck();await settle();
 await page.locator('#case-variant').selectOption('kaih-jcard-68x64');await settle();await page.locator('#case-spine-auto').uncheck();await settle();await page.locator('#case-spine-text').fill('Custom Spine Text');await page.locator('#case-spine-text').blur();await settle();
 eq((await state()).sets[0].case.spineTextOverride,'Custom Spine Text','freeform spine saved');await dl(page,'export-case','freeform-spine',803,756);
 // No-art fallback keeps image modes exportable (solid background only), via real project load.
 {
  const s=await state(),artNone={...structuredClone(s),schema:'md-studio-project/4',mode:s.mode,settings:{setCount:4,paper:s.settings.paper,calibrated:s.settings.calibrated,measuredX:s.settings.measuredX,measuredY:s.settings.measuredY,sheetPreset:'legacy-four',sheetSetId:s.settings.sheetSetId}};
  artNone.sets[0].case={...artNone.sets[0].case,image:{type:'none'}};
  await page.locator('#load-project').setInputFiles({name:'art-none.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(artNone))});await settle();
  eq((await state()).sets[0].case.image.type,'none','no-art image persisted via project');
  await dl(page,'export-case','no-art-image-mode',803,756);
  const bgProbe=await probe(page,async()=>{const {studio}=await import('./app.mjs');const bg=studio.getState().sets[0].case.caseBg;const p=document.querySelector('#preview'),x=p.getContext('2d'),mm=300/25.4;return {pixel:Array.from(x.getImageData(Math.round(35*mm),Math.round(30*mm),1,1).data).slice(0,3),bg:[parseInt(bg.slice(1,3),16),parseInt(bg.slice(3,5),16),parseInt(bg.slice(5,7),16)]};});
  eq(bgProbe.pixel.every((v,i)=>Math.abs(v-bgProbe.bg[i])<=3),true,'image mode with no art paints solid caseBg only');
  const restored={...structuredClone(await state()),schema:'md-studio-project/4',mode:s.mode};restored.sets[0].case={...restored.sets[0].case,image:{type:'sample',seed:0}};
  await page.locator('#load-project').setInputFiles({name:'restore-art.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(restored))});await settle();
 }
 // On-sheet kaih exports with preview identity and manifest anchors.
 await page.locator('#sheet-preset').selectOption('case-set');await settle();await page.locator('[data-view=sheet]').click();await settle();
 const jcardFirst=await dl(page,'export-sheet','kaih-jcard-sheet-first',1181,1748);ok(await identity(page,jcardFirst),'J-card sheet identity (current variant)');
 const manifest=await dlJson(page,'export-manifest','sheet-manifest-jcard');
 eq(manifest.labels.map(l=>Object.values(l.designMm)),[[16,6.25,68,64],[31,77.25,38,54],[21,138.25,58,3.5]],'J-card sheet anchors frozen (set variant retained)');
 await page.locator('#sheet-case-variant').selectOption('kaih-case-71x60');await settle();
 await dl(page,'export-sheet','kaih-case-sheet',1181,1748);
 const manifestCase=await dlJson(page,'export-manifest','sheet-manifest-case');
 eq(manifestCase.labels.map(l=>Object.values(l.designMm)),[[14.5,8.25,71,60],[31,75.25,38,54],[21,136.25,58,3.5]],'CASE sheet anchors frozen');
 await page.locator('#sheet-case-variant').selectOption('kaih-jcard-68x64');await settle();
 const jcardSheet=await dl(page,'export-sheet','kaih-jcard-sheet',1181,1748);ok(await identity(page,jcardSheet),'J-card sheet identity');
 ok(files.at(-1).suggestedFilename.includes('J-Card'),'sheet variant filename');
 // Six languages: localized controls, identical export pixels and unchanged project.
 await page.locator('#case-preview-button').click();await settle();
 const baselineProject=await state();
 const caseHashes={};
 for(const lang of ['en','zh-Hans','zh-Hant','es','fr','ja']){
  await page.locator('#language').selectOption(lang);await page.waitForTimeout(300);
  const expected=await probe(page,async l=>(await import('./i18n.mjs')).messages[l].kaihLayout,lang);
  ok((await page.locator('#case-interior-controls').textContent()).includes(expected),'localized layout control '+lang);
  caseHashes[lang]=hash(await dl(page,'export-case','lang-'+lang,803,756));
 }
 eq(new Set(Object.values(caseHashes)).size,1,'case export bytes identical across six languages');
 eq((await state()).sets,baselineProject.sets,'language switching never mutates project');
 await page.locator('#language').selectOption('en');await settle();
 // Case problems never gate unrelated exports (broken upload data via real project load).
 {
  const s=await state(),broken={...structuredClone(s),schema:'md-studio-project/4',mode:s.mode,settings:{setCount:4,paper:s.settings.paper,calibrated:s.settings.calibrated,measuredX:s.settings.measuredX,measuredY:s.settings.measuredY,sheetPreset:'legacy-four',sheetSetId:s.settings.sheetSetId}};
  broken.sets[0].case={...broken.sets[0].case,image:{type:'upload',data:'data:image/png;base64,broken',name:'bad.png'}};
  await page.locator('#load-project').setInputFiles({name:'broken-case.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(broken))});await settle();
  eq((await state()).sets[0].case.image.type,'upload','broken upload accepted by schema validation');
  ok(!await page.locator('#export-front').isDisabled(),'broken case image never blocks front');ok(!await page.locator('#export-spine').isDisabled(),'broken case image never blocks spine');ok(await page.locator('#export-case').isDisabled(),'broken case image blocks only case');
  await page.locator('#sheet-preset').selectOption('legacy-four');await settle();ok(!await page.locator('#export-sheet').isDisabled(),'no-case sheet unaffected by broken case art');await dl(page,'export-sheet','unrelated-sheet-intact',1181,1748);
  const repaired={...structuredClone(await state()),schema:'md-studio-project/4',mode:s.mode};repaired.sets[0].case={...repaired.sets[0].case,image:{type:'sample',seed:3}};
  await page.locator('#load-project').setInputFiles({name:'repaired.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(repaired))});await settle();
 }
 // Offline (routes already deny network): final export with context offline.
 await ctx.setOffline(true);await page.locator('#sheet-preset').selectOption('case-set');await settle();await dl(page,'export-case','offline-final',803,756);await ctx.setOffline(false);
 eq(errors,[],'no runtime errors');eq(external,[],'no external requests');
 const report={status:'PASS',checks,browser:browser.version(),downloads:files,scope:'Real Chromium downloads: 8 layout/format fixtures, frozen 778cb80 no-case byte identity, toggles, logos, palettes, upload/album/clear, empty fields, 13/14 tracks, overflow, freeform text/spine, no-art, on-sheet CASE/J-card, six-language pixel stability, unrelated-export independence, offline'};await writeFile(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:'PASS',checks,downloads:files.length,browser:browser.version()}));
}catch(e){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});await writeFile(path.join(out,'failure.txt'),String(e.stack));throw e;}finally{await ctx.close();await browser.close();server.close();}
