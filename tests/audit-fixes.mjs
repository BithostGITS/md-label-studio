import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),out=path.resolve(root,'../artifacts/four-set');await mkdir(out,{recursive:true});
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const server=createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(p.endsWith('/'))p+='index.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.html':'text/html','.woff2':'font/woff2','.css':'text/css','.png':'image/png'})[path.extname(f)]||'text/plain');res.end(await readFile(f));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),context=await browser.newContext({acceptDownloads:true}),page=await context.newPage();
const checks=[],errors=[],downloads=[];page.on('pageerror',e=>errors.push(e.message));const check=(v,name)=>{assert.ok(v,name);checks.push({name,pass:true});};
async function settle(){await page.waitForTimeout(400);await page.waitForFunction(()=>!document.querySelector('#export-front').disabled,{},{timeout:90000});}
async function state(){return page.evaluate(async()=>{const s=(await import('./app.mjs')).studio.getState();for(const set of s.sets)if(set.art.data){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(set.art.data));set.art.dataSHA256=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');set.art.dataLength=set.art.data.length;delete set.art.data;}return s;});}
async function dl(id,name){const wait=page.waitForEvent('download',{timeout:90000});await page.locator('#'+id).click();const d=await wait;await d.saveAs(path.join(out,name));await settle();const b=await readFile(path.join(out,name));downloads.push({path:name,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});return b;}
async function load(buffer){if(buffer.length>50*1024*1024){const file=path.join(out,'fix-bounded-input.json');await writeFile(file,buffer);await page.locator('#load-project').setInputFiles(file,{timeout:120000});}else await page.locator('#load-project').setInputFiles({name:'restore.json',mimeType:'application/json',buffer},{timeout:120000});await settle();}
try{
 await page.goto(base+'/dist/');await settle();
 check(await page.locator('[data-set]').count()===4,'exactly four unique editable set tabs');check(await page.locator('#set-count').count()===1,'exactly one print-count selector');
 check(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return new Set(ids).size===ids.length;}),'all IDs unique');
 const initial=await state(),small=await dl('save-project','fix-small-project.json');
 for(const count of ['2','4']){
  await page.locator('#set-count').selectOption(count);await settle();
  for(const id of 'abcd'){await page.locator('#set-'+id).click();await settle();check((await state()).active==='abcd'.indexOf(id),'editable '+id+' in '+count+' mode');await dl('export-front',`fix-${count}-${id}-front.png`);await dl('export-spine',`fix-${count}-${id}-spine.png`);}
  await page.locator('#set-d').focus();await page.keyboard.press('ArrowRight');await settle();check((await state()).active===0,'ArrowRight wraps D to A in '+count);
  await page.keyboard.press('ArrowLeft');await settle();check((await state()).active===3,'ArrowLeft wraps A to D in '+count);
 }
 await page.locator('#set-count').selectOption('2');await settle();check((await state()).active===3,'mode switch with D active preserves editable D');
 await page.locator('#set-b').focus();await page.keyboard.press('ArrowRight');await settle();check((await state()).active===2&&!await page.locator('#set-c').isHidden()&&!await page.locator('#export-front').isDisabled(),'B ArrowRight selects visible valid C in two-set mode');
 // Defensive keyboard filter: simulate a future hidden tab without changing application state.
 await page.evaluate(()=>document.querySelector('#set-c').hidden=true);await page.locator('#set-b').focus();await page.keyboard.press('ArrowRight');await settle();check((await state()).active===3,'keyboard skips hidden C');await page.evaluate(()=>document.querySelector('#set-c').hidden=false);
 await page.setViewportSize({width:390,height:844});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile document fits');check(await page.locator('.set-tabs button').evaluateAll(bs=>bs.every(b=>b.scrollWidth<=b.clientWidth)),'four mobile tabs fit');await page.screenshot({path:path.join(out,'fix-mobile.png'),fullPage:true});
 await load(small);await page.locator('#set-count').selectOption('4');await settle();
 const encoded=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=1600;const x=c.getContext('2d'),d=x.createImageData(1600,1600);let seed=42;for(let i=0;i<d.data.length;i+=4){for(let k=0;k<3;k++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;d.data[i+k]=seed>>>24;}d.data[i+3]=255;}x.putImageData(d,0,0);return c.toDataURL('image/png').split(',')[1];});const image=Buffer.from(encoded,'base64');
 for(const id of 'abcd'){await page.locator('#set-'+id).click();await page.locator('#album').fill('Before '+id);await page.locator('#artist').fill('Artist '+id);await page.locator('#year').fill(String(2020+'abcd'.indexOf(id)));await page.locator('#art-file').setInputFiles({name:id+'-procedural-noise.png',mimeType:'image/png',buffer:image});await settle();}
 const before=await state(),large=await dl('save-project','fix-large-project.json');check(large.length>30*1024*1024&&image.length<12*1024*1024,'actual saved four-cover file exceeds old cap with legal uploads');
 for(const id of 'abcd'){await page.locator('#set-'+id).click();await page.locator('#album').fill('Changed '+id);await page.locator('#clear-art').click();await settle();}
 await load(large);const restored=await state();check(JSON.stringify(restored.sets)===JSON.stringify(before.sets)&&JSON.stringify(restored.settings)===JSON.stringify(before.settings)&&restored.mode===before.mode,'actual save/mutate all/load restores every field and exact image data SHA256');check((await page.locator('#error').textContent())==='','large restore has no error');
 // Exact file-ceiling acceptance and one-byte-over rejection; padding is legal JSON whitespace.
 await load(small);const limit=100*1024*1024,bounded=Buffer.alloc(limit,32);small.copy(bounded);await load(bounded);check(assert.deepEqual((await state()).sets,initial.sets)===undefined,'exact 100 MiB legal project accepted');const stable=await state();
 await load(Buffer.concat([bounded,Buffer.from(' ')]));check((await page.locator('#error').textContent()).includes('100 MiB'),'100 MiB + 1 rejected explicitly');check(JSON.stringify(await state())===JSON.stringify(stable),'file-limit rejection retains full prior state');
 const bad=JSON.parse(small);bad.sets[3].art={type:'upload',name:'broken.png',data:'data:image/png;base64,AAAA'};await load(Buffer.from(JSON.stringify(bad)));check(JSON.stringify(await state())===JSON.stringify(stable),'fourth corrupt image restores atomically: no partial replacement');check((await page.locator('#error').textContent()).length>0,'corrupt image error visible');
 const fieldLimit=await page.evaluate(async()=>{const {studio}=await import('./app.mjs'),s=studio.getState();const d={schema:'md-studio-project/2',sets:s.sets,settings:s.settings,mode:s.mode};d.sets[0].art={type:'upload',name:'limit.png',data:'x'.repeat(24*1024*1024+1)};try{studio.validateProject(d);return false;}catch{return true;}});check(fieldLimit,'per-image one-character-over bound rejected');
 check(errors.length===0,'no page runtime exceptions');await writeFile(path.join(out,'fix-audit-results.json'),JSON.stringify({status:'PASS',browser:browser.version(),imageBytes:image.length,projectBytes:large.length,checks,downloads,runtimeErrors:errors,roundtrip:restored,scope:'Built payload targeted F1/F2/F3 audit reproductions; exact data URL digests, no extra image encoding'},null,2));console.log(JSON.stringify({status:'PASS',checks:checks.length,imageBytes:image.length,projectBytes:large.length,downloads:downloads.length}));
}finally{await context.close();await browser.close();server.close();}
