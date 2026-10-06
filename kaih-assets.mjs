import {caseSettings,caseElements,logoColor} from './kaih-case.mjs';
import {localeError} from './i18n.mjs';
const cached=new Map(),faces=new Map();let manifestPromise;
const base=new URL('./assets/kaih/',import.meta.url);
export function kaihFontManifest(){return manifestPromise??=(async()=>{const r=await fetch(new URL('fonts.json',base));if(!r.ok)throw localeError('kaihAssetError');return r.json();})();}
async function image(file){const url=new URL(file,base).href;if(cached.has(url))return cached.get(url);const pending=new Promise((resolve,reject)=>{const img=new Image(),timer=setTimeout(()=>reject(localeError('kaihAssetError')),15000);img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);reject(localeError('kaihAssetError'));};img.src=url;});cached.set(url,pending);try{return await pending;}catch(e){cached.delete(url);throw e;}}
export async function prepareKaih(set,{getArtwork,fontStack,supports,loaded}){const c=caseSettings(set),manifest=await kaihFontManifest(),f=manifest[c.font];if(!f)throw localeError('kaihAssetError');
 if(!faces.has(c.font)){const pending=(async()=>{const face=new FontFace(f.family,`url("${new URL(f.file,base).href}")`,{weight:f.weights.length===2?'400 700':String(f.weights[0]),style:'normal'});let timer;try{await Promise.race([face.load(),new Promise((_,reject)=>timer=setTimeout(()=>reject(localeError('kaihAssetError')),20000))]);}finally{clearTimeout(timer);}document.fonts.add(face);if(face.status!=='loaded')throw localeError('kaihAssetError');return face;})();faces.set(c.font,pending);pending.catch(()=>faces.delete(c.font));}
 await faces.get(c.font);if(!loaded.has(set.cjk))throw localeError('fontMissing',{key:set.cjk});
 const w=c.profile==='kaih-jcard-68x64'?68:71,h=w===68?64:60,elements=caseElements(set,w,h);const text=elements.filter(e=>e.kind==='text').map(e=>e.text).join('\n');
 const missing=[...new Set([...text].filter(ch=>!/[\n\r\t]/.test(ch)&&!f.ranges.some(([a,b])=>ch.codePointAt(0)>=a&&ch.codePointAt(0)<=b)&&!supports(set.cjk,ch.codePointAt(0))))];if(missing.length)throw localeError('missingGlyph',{chars:missing.slice(0,12).join('')});
 const needsImage=elements.some(e=>e.kind==='image'),artSpec=c.image.type==='album'?set.art:c.image;
 const [art,logo]=await Promise.all([needsImage?(artSpec.type==='sample'?image(`art-${artSpec.seed}.png`):getArtwork(artSpec)):null,c.logoCase&&!['none','emoji'].includes(c.logoStyle)?image(`minidisc-logo-${logoColor(c.caseBg,c.logoStyle)}.svg`):null]);
 return {art,logo,font:`"${f.family}",${fontStack(set).split(',').slice(1).join(',')}`,weight:()=>f.weights.includes(700)?700:f.weights[0],fontWeightLimited:!f.weights.includes(700)};
}
