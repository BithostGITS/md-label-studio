import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),project=path.dirname(root),out=path.join(project,'artifacts/case-label/layout-v2-fixes/artwork-engine');await mkdir(out,{recursive:true});
const baseline=path.join(project,'artifacts/case-label/layout-v2-baseline-v091'),commit='b19ed652067b43a6222245105a6f935861875c40';
const hash=b=>createHash('sha256').update(b).digest('hex');let checks=0;
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
for(const name of execFileSync('git',['-C',path.join(project,'publish'),'ls-tree','-r','--name-only',commit],{encoding:'utf8'}).trim().split('\n'))eq(hash(await readFile(path.join(baseline,name))),hash(execFileSync('git',['-C',path.join(project,'publish'),'show',commit+':'+name],{maxBuffer:40*1024*1024})),'immutable baseline '+name);
const roots={current:root,built:path.join(root,'dist'),old:baseline};
const server=createServer(async(req,res)=>{try{const parts=new URL(req.url,'http://localhost').pathname.split('/'),dir=roots[parts[1]],file=path.resolve(dir,parts.slice(2).join('/')||'index.html');if(!file.startsWith(dir+'/'))throw Error();res.setHeader('Content-Type',({'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.png':'image/png'})[path.extname(file)]||'text/plain');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const pw=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright-core'),engine=process.env.LAYOUT_ENGINE||'webkit',browser=await pw[engine].launch({headless:true,...(engine==='chromium'?{executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{})}),ctx=await browser.newContext({viewport:{width:1280,height:1000},acceptDownloads:true}),report={engine,version:browser.version(),baseline:commit,runs:[],errors:[]};
await ctx.route('**/*',r=>r.request().url().startsWith(origin+'/')||r.request().url().startsWith('blob:'+origin+'/')||r.request().url().startsWith('data:')?r.continue():r.abort());
const settle=async p=>{await p.waitForTimeout(300);await p.waitForFunction(()=>!document.querySelector('#export-front').disabled,null,{timeout:60000});};
async function download(p,id,name){const pending=p.waitForEvent('download',{timeout:60000});pending.catch(()=>{});await p.locator('#'+id).click();const d=await pending,f=path.join(out,engine+'-'+name);await d.saveAs(f);return hash(await readFile(f));}
try{
 const pages={};for(const name of Object.keys(roots)){const p=pages[name]=await ctx.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(origin+'/'+name+'/');await settle(p);}
 const frozen=await pages.old.evaluate(async()=>{const s=(await import('./app.mjs')).studio.getState();return {schema:'md-studio-project/2',sets:s.sets,settings:s.settings,mode:'compat'};});
 // Real local image inputs, not Canvas monkeypatches; portrait/landscape/transparent.
 const uploads=await pages.old.evaluate(()=>{return [[96,160,false],[160,96,false],[117,117,true]].map(([w,h,transparent])=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');if(!transparent){x.fillStyle='#276192';x.fillRect(0,0,w,h);}x.fillStyle='rgba(240,80,33,.6)';x.fillRect(7,11,w/2,h/2);return c.toDataURL();});});
 const cases=[...Array.from({length:4},(_,seed)=>({name:'sample-'+seed,art:{type:'sample',seed}})),{name:'none',art:{type:'none'}},...uploads.map((data,i)=>({name:'upload-'+i,art:{type:'upload',data,name:'cover.png'}}))];
 for(const item of cases){const fixture=structuredClone(frozen);fixture.sets[0].art=item.art;for(const p of Object.values(pages)){await p.locator('#load-project').setInputFiles({name:'frozen.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await settle(p);if(item.art.type==='upload'){await p.locator('#art-file').setInputFiles({name:'cover.png',mimeType:'image/png',buffer:Buffer.from(item.art.data.split(',')[1],'base64')});await settle(p);}}
  for(const mode of ['compat','physical']){for(const p of Object.values(pages)){await p.locator('#export-mode').selectOption(mode);await settle(p);}for(let repeat=0;repeat<2;repeat++){const row={art:item.name,mode,repeat,hashes:{}};for(const [name,p] of Object.entries(pages))row.hashes[name]=await download(p,'export-front',`${item.name}-${mode}-${repeat}-${name}.png`);report.runs.push(row);if(engine==='webkit' && item.art.type==='sample'){row.verdict=Object.values(row.hashes).every(h=>h===row.hashes.old)?'EXACT':'PROCEDURAL_SAMPLE_ENGINE_DIFFERENCE';}else{eq(row.hashes.current,row.hashes.old,item.name+' source exact baseline '+mode);eq(row.hashes.built,row.hashes.old,item.name+' built exact baseline '+mode);}}}
 }
 // The Firefox pointer regression must use genuine Playwright pointer clicks.
 for(const name of ['current','built']){const p=pages[name];report[name]={calibration:await download(p,'export-calibration',name+'-calibration.png')};await p.locator('#export-calibration').evaluate(e=>e.scrollIntoView({block:'end'}));report[name].endScroll=await download(p,'export-calibration',name+'-calibration-end.png');eq(report[name].calibration,report[name].endScroll,'ordinary/end-scroll pointer downloads');}
 eq(report.errors,[],'runtime errors');report.status='PASS';report.checks=checks;console.log(JSON.stringify({status:'PASS',engine,version:report.version,checks,runs:report.runs.length}));
}catch(e){report.status='FAIL';report.error=String(e.stack).split(root).join('<app>').split(project).join('<project>');throw e;}finally{await writeFile(path.join(out,engine+'-results.json'),JSON.stringify(report,null,2));await ctx.close();await browser.close();await new Promise(r=>server.close(r));}
