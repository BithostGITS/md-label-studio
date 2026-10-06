import {cp,mkdtemp,readdir,readFile,writeFile,lstat,rename,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),dest=path.join(root,'dist');
const kaihAssets=(await readdir(path.join(root,'assets/kaih'))).map(n=>'assets/kaih/'+n);
const fonts=['atkinson','b612','noto-sans','noto-serif','wenkai','source-sans','noto-sc-regular','noto-tc','noto-jp'];
export const entries=[...kaihAssets,'kaih-case.mjs','kaih-assets.mjs','kaih-ui.mjs','kaih-i18n.mjs','index.html','style.css','app.mjs','case-ui.mjs','case-i18n.mjs','project-v3.mjs','tracks.mjs','online.mjs','online-ui.mjs','online-i18n.mjs','i18n.mjs','geometry.mjs','render.mjs','image-input.mjs','png.mjs','README.md','LICENSE','THIRD-PARTY-NOTICES.txt','assets/branding/minidisc.png','assets/branding/hi-md.png',...fonts.flatMap(f=>[`assets/fonts/${f}.woff2`,`assets/fonts/${f}-OFL.txt`]),'assets/fonts/manifest.json','assets/fonts/README.md'].sort();
// Never follow a redirected output or input tree. Only dist and our unique stage are owned.
const prior=await lstat(dest).catch(e=>{if(e.code!=='ENOENT')throw e;});if(prior&&(!prior.isDirectory()||prior.isSymbolicLink()))throw Error('Refusing non-directory/symlink dist');
const stage=await mkdtemp(path.join(root,'.dist-stage-'));let moved=false;
try{
 for(const name of entries){let p=root;for(const part of name.split('/')){p=path.join(p,part);if((await lstat(p)).isSymbolicLink())throw Error('Refusing symlink input: '+name);}await cp(path.join(root,name),path.join(stage,name),{recursive:false});}
 const found=[];async function walk(dir){for(const name of await readdir(dir)){const p=path.join(dir,name),s=await lstat(p);if(s.isDirectory())await walk(p);else if(s.isFile())found.push(path.relative(stage,p));else throw Error('Unexpected staged file');}}await walk(stage);
 if(JSON.stringify(found.sort())!==JSON.stringify(entries))throw Error('Release allowlist mismatch');
 const files=[];for(const name of entries){const data=await readFile(path.join(stage,name));if(data.length>=25*1024*1024)throw Error('Asset exceeds 25 MiB: '+name);files.push({path:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
 if(files.filter(f=>f.path.endsWith('.woff2')).reduce((n,f)=>n+f.bytes,0)>=25*1024*1024)throw Error('Aggregate font payload exceeds 25 MiB');
 await writeFile(path.join(stage,'build-manifest.json'),JSON.stringify({files,totalBytes:files.reduce((n,f)=>n+f.bytes,0)},null,2));
 // Move the old owned output aside only after the complete staging gate passes.
 const backup=path.join(stage,'previous-dist');if(prior){await rename(dest,backup);moved=true;}
 try{const {mkdir}=await import('node:fs/promises');const release=path.join(stage,'release');await mkdir(release);for(const name of await readdir(stage))if(!['previous-dist','release'].includes(name))await rename(path.join(stage,name),path.join(release,name));await rename(release,dest);}catch(e){if(moved)await rename(backup,dest);throw e;}
 console.log(`Built ${files.length} allowlisted static files; fresh staged output; no deployment.`);
}finally{await rm(stage,{recursive:true,force:true});}
