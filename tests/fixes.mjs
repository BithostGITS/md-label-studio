import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,cp,access,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {assertStillImage} from '../image-input.mjs';
let assertions=0;const check=(v,m)=>{assert.ok(v,m);assertions++;};
const apng=await readFile('../artifacts/qa/animated-input.png');assert.throws(()=>assertStillImage(apng),/Animated images/);assertions++;
for(const type of ['ANIM','ANMF','VP8X']){const n=type==='VP8X'?10:6,b=Buffer.alloc(20+n);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WEBP',8);b.write(type,12);b.writeUInt32LE(n,16);b[20]=2;assert.throws(()=>assertStillImage(b),/Animated images/);assertions++;}
const staticPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');assertStillImage(staticPng);assertions++;
assert.throws(()=>assertStillImage(apng.subarray(0,20)),/decode/);assertions++;
// Isolated build reproduction: never place sentinels in the delivered dist.
const box=await mkdtemp(path.resolve('../artifacts/fixes/build-repro-'));
try{for(const name of ['build.mjs','index.html','style.css','app.mjs','i18n.mjs','geometry.mjs','render.mjs','image-input.mjs','png.mjs','README.md','LICENSE','THIRD-PARTY-NOTICES.txt','assets'])await cp(name,path.join(box,name),{recursive:true});await mkdir(path.join(box,'dist'));await writeFile(path.join(box,'dist/qa-stale-marker.txt'),'stale');await writeFile(path.join(box,'unrelated.txt'),'keep');await writeFile(path.join(box,'assets/fonts/unintended.txt'),'not allowed');execFileSync(process.execPath,['build.mjs'],{cwd:box});check(!await access(path.join(box,'dist/qa-stale-marker.txt')).then(()=>true,()=>false),'QA4 stale removed');check(!await access(path.join(box,'dist/assets/fonts/unintended.txt')).then(()=>true,()=>false),'QA4 fresh allowlist excludes extra input');check(await readFile(path.join(box,'unrelated.txt'),'utf8')==='keep','QA4 unrelated preserved');const manifest=JSON.parse(await readFile(path.join(box,'dist/build-manifest.json')));check(manifest.files.length===25&&['assets/branding/hi-md.png'].every(p=>manifest.files.some(f=>f.path===p))&&!manifest.files.some(f=>/stale|unintended/.test(f.path)),'QA4 manifest only intended files');}finally{await rm(box,{recursive:true,force:true});}
console.log(JSON.stringify({status:'PASS',assertions,cases:'QA2 container checks; QA4 isolated stale build and unrelated-file preservation'}));
