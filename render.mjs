import {capacity,formatDuration,printRows} from './tracks.mjs';
import {t,localeError,errorText} from './i18n.mjs';
import {assertStillImage} from './image-input.mjs';
import {dimensions,frontDimensions,spineDimensions,PPM,px,STROKE,frontRaster,sheetManifest,presetManifest,caseProfile,PAPERS} from './geometry.mjs';
const loaded=new Map(),images=new Map();let fontManifest;
export async function initFonts(onStatus=()=>{}){
 const response=await fetch(new URL('./assets/fonts/manifest.json',import.meta.url));if(!response.ok)throw localeError('fontManifest');fontManifest=await response.json();
 await Promise.all(Object.entries(fontManifest).map(async([key,info])=>{try{const url=new URL('./assets/fonts/'+info.file,import.meta.url);const face=new FontFace(info.family,`url("${url.href}")`,{weight:'400',style:'normal'});let timeout;try{await Promise.race([face.load(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(localeError('fontTimeout')),20000);})]);}finally{clearTimeout(timeout);}document.fonts.add(face);if(face.status!=='loaded'||!document.fonts.check(`16px "${info.family}"`))throw localeError('fontFaceNotReady');loaded.set(key,face);onStatus(key,true);}catch(e){onStatus(key,false,e);}}));
}
function supports(key,cp){return fontManifest?.[key]?.ranges.some(([a,b])=>cp>=a&&cp<=b);}
export function fontStack(set){return `"${fontManifest[set.latin].family}","${fontManifest[set.cjk].family}"`;}
export function checkFonts(set,spine=false){for(const key of [set.latin,set.cjk])if(!loaded.has(key))throw localeError('fontMissing',{key});
 const text=displayText(set,(spine?[set.album,set.artist]:[set.album,set.artist,set.year]).join('\n'));const missing=[...new Set([...text].filter(c=>!/[\n\r\t]/.test(c)&&!supports(set.latin,c.codePointAt(0))&&!supports(set.cjk,c.codePointAt(0))))];if(missing.length)throw localeError('missingGlyph',{chars:missing.slice(0,12).join('')});
}
export function displayText(set,text){return set.uppercase?text.toUpperCase():text;}
function newCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
export function originalArtwork(seed=0){
 const c=newCanvas(800,800),x=c.getContext('2d');const palettes=[['#163f4a','#e9b380','#e6ddc1','#5d918a'],['#352e58','#d49e8c','#f1d4a2','#726992'],['#ece3ca','#be5d3e','#285248','#9da76c'],['#142f4f','#e8ca92','#adc7cf','#3b7493']];const p=palettes[seed%palettes.length];x.fillStyle=p[0];x.fillRect(0,0,800,800);
 if(seed%4===0){x.fillStyle=p[1];x.beginPath();x.arc(565,240,154,0,Math.PI*2);x.fill();for(let i=0;i<11;i++){x.strokeStyle=i%2?p[2]:p[3];x.lineWidth=6;x.beginPath();x.moveTo(-80,490+i*23);x.bezierCurveTo(230,170+i*23,470,910-i*8,890,360+i*21);x.stroke();}x.fillStyle=p[2];x.fillRect(61,63,3,90);}
 else if(seed%4===1){for(let i=0;i<9;i++){x.strokeStyle=i%2?p[1]:p[2];x.lineWidth=9;x.beginPath();x.arc(400,450,58+i*43,Math.PI*.78,Math.PI*2.22);x.stroke();}x.fillStyle=p[3];x.fillRect(363,145,74,510);x.fillStyle=p[2];x.beginPath();x.arc(400,145,37,0,Math.PI*2);x.fill();}
 else if(seed%4===2){for(let i=0;i<5;i++){x.fillStyle=p[(i%3)+1];x.save();x.translate(150+i*110,400);x.rotate(-.26);x.fillRect(-56,-230+i*25,110,480-i*48);x.restore();}x.strokeStyle=p[0];x.lineWidth=2;for(let i=0;i<26;i++){x.beginPath();x.moveTo(0,i*32);x.lineTo(800,i*32);x.stroke();}}
 else{for(let i=0;i<6;i++){x.fillStyle=i%2?p[2]:p[3];x.beginPath();x.moveTo(-20,380+i*80);x.quadraticCurveTo(300,90+i*110,850,430+i*70);x.lineTo(850,810);x.lineTo(-20,810);x.fill();}x.fillStyle=p[1];x.beginPath();x.arc(550,195,84,0,Math.PI*2);x.fill();}
 return c;
}
export async function getArtwork(art){if(!art||art.type==='none')return null;const key=art.type==='sample'?'sample-'+art.seed:art.data;if(images.has(key))return images.get(key);if(art.type==='sample'){const c=originalArtwork(art.seed);images.set(key,c);return c;}
 if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(art.data||''))throw localeError('localRaster');
 assertStillImage(Uint8Array.from(atob(art.data.split(',')[1]),c=>c.charCodeAt(0)));
 const pending=new Promise((resolve,reject)=>{const img=new Image();const timeout=setTimeout(()=>reject(localeError('coverTimeout')),15000);img.onload=()=>{clearTimeout(timeout);if(img.naturalWidth*img.naturalHeight>64000000||!img.naturalWidth){reject(localeError('imagePixels'));return;}resolve(img);};img.onerror=()=>{clearTimeout(timeout);reject(localeError('coverDecode'));};img.src=art.data;});images.set(key,pending);try{return await pending;}catch(e){images.delete(key);throw e;}
}
let logoImage,logoPending;
export function loadLogo(){
 if(logoImage)return Promise.resolve(logoImage);
 if(logoPending)return logoPending;
 logoPending=new Promise((resolve,reject)=>{
  const image=new Image();let done=false;
  const finish=(error)=>{if(done)return;done=true;clearTimeout(timeout);image.onload=image.onerror=null;if(error){reject(error);return;}logoImage=image;resolve(image);};
  const timeout=setTimeout(()=>finish(localeError('mdTimeout')),15000);
  image.onload=()=>finish(image.naturalWidth===44&&image.naturalHeight===43?null:localeError('mdSize'));
  image.onerror=()=>finish(localeError('mdLoad'));
  image.src=new URL('./assets/branding/minidisc.png',import.meta.url).href;
 }).catch(error=>{logoPending=null;throw error;});
 return logoPending;
}
let frontHiMDFrame;
function hiMDFrame(){if(frontHiMDFrame)return frontHiMDFrame;const c=newCanvas(106,43),x=c.getContext('2d');x.fillStyle='white';x.fillRect(5,5,96,33);for(const [sx,sy,sw,sh,dx,dy,dw,dh] of [[0,0,5,5,0,0,5,5],[39,0,5,5,101,0,5,5],[0,38,5,5,0,38,5,5],[39,38,5,5,101,38,5,5],[5,0,34,5,5,0,96,5],[5,38,34,5,5,38,96,5],[0,5,5,33,0,5,5,33],[39,5,5,33,101,5,5,33]])x.drawImage(logoImage,sx,sy,sw,sh,dx,dy,dw,dh);frontHiMDFrame=c;return c;}
const hiMDImages=new Map(),hiMDPending=new Map();
export function loadHiMD(){
 const name='hi-md.png',size=[272,88];
 if(hiMDImages.has(name))return Promise.resolve(hiMDImages.get(name));
 if(hiMDPending.has(name))return hiMDPending.get(name);
 const pending=new Promise((resolve,reject)=>{const image=new Image();let done=false;const finish=error=>{if(done)return;done=true;clearTimeout(timeout);image.onload=image.onerror=null;if(error)return reject(error);hiMDImages.set(name,image);resolve(image);};const timeout=setTimeout(()=>finish(localeError('hiTimeout',{name})),15000);image.onload=()=>finish(image.naturalWidth===size[0]&&image.naturalHeight===size[1]?null:localeError('hiSize',{name}));image.onerror=()=>finish(localeError('hiLoad',{name}));image.src=new URL('./assets/branding/'+name,import.meta.url).href;}).catch(error=>{hiMDPending.delete(name);throw error;});hiMDPending.set(name,pending);return pending;
}
export async function prepare(set){checkFonts(set);const [art]=await Promise.all([getArtwork(set.art),set.hideHeader?null:loadLogo(),set.hiMD&&!set.hideHeader?loadHiMD():null]);return art;}
/** Word wrapping with character fallback, blank lines retained; no shrink-to-fit. */
export function wrappedLines(ctx,text,width){const lines=[];for(const paragraph of text.replace(/\r\n?/g,'\n').split('\n')){let line='';const tokens=paragraph.match(/\s+|[^\s]+/gu)||[''];for(const token of tokens){if(ctx.measureText(line+token).width<=width){line+=token;continue;}if(line){lines.push(line.trimEnd());line='';}for(const c of token){if(line&&ctx.measureText(line+c).width>width){lines.push(line);line='';}line+=c;}}lines.push(line.trimEnd());}return lines;}
export function cutline(ctx,w,h,dark=false){ctx.save();ctx.strokeStyle=dark?'#a7aba4':'#6d786c';ctx.lineWidth=STROKE;ctx.strokeRect(STROKE/2,STROKE/2,w-STROKE,h-STROKE);ctx.restore();}
export function paintFront(ctx,set,art,bounds){
 const d=frontDimensions(set),w=d.w,h=d.h,dark=set.theme==='dark',bg=dark?'#231F20':'#ffffff',fg=dark?'#ffffff':'#000000';
 ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.fillStyle=fg;const head=set.hideHeader?0:5,artSize=Math.min(w,h-head-8),artX=(w-artSize)/2;ctx.font=`1.76px ${fontStack(set)}`;ctx.textBaseline='middle';
 if(head){ctx.beginPath();ctx.moveTo(3.25,1.875);ctx.lineTo(4.5,3.125);ctx.lineTo(2,3.125);ctx.closePath();ctx.fill();ctx.fillText('INSERT THIS END',5.5,2.9138,set.hiMD?Math.max(1,w-2-44/11.811-.5-106/11.811-1-5.5):Math.max(4,w-13));if(!logoImage)throw localeError('mdNotReady');const lw=44/11.811,lh=43/11.811;ctx.drawImage(logoImage,w-2-lw,(5-lh)/2,lw,lh);if(set.hiMD){const mark=hiMDImages.get('hi-md.png');if(!mark)throw localeError('hiNotReady');const fw=106/11.811,fh=43/11.811,fx=w-2-lw-.5-fw,fy=(5-fh)/2,stroke=2/11.811,pad=5/11.811;if(fx<2||fy<0||fx+fw>w-2||fy+fh>5)throw localeError('hiMargin');ctx.drawImage(hiMDFrame(),fx,fy,fw,fh);ctx.drawImage(mark,fx+(106-31*272/88)/2/11.811,fy+pad,(31*272/88)/11.811,31/11.811);}}
 if(art){const ratio=Math.min(artSize/art.width,artSize/art.height),iw=art.width*ratio,ih=art.height*ratio;ctx.drawImage(art,artX+(artSize-iw)/2,head+(artSize-ih)/2,iw,ih);}
 const boxY=head+artSize,boxH=h-boxY;ctx.font=`1.76px ${fontStack(set)}`;const lines=wrappedLines(ctx,displayText(set,[set.album,set.artist,set.year].join('\n')),w-4),capacity=Math.floor(boxH/2.12),visible=lines.slice(0,capacity);ctx.save();ctx.beginPath();ctx.rect(2,boxY,w-4,boxH-.15);ctx.clip();const y=boxY+(boxH-visible.length*2.12)/2;visible.forEach((line,i)=>ctx.fillText(line,2,y+(i+.5)*2.12));ctx.restore();ctx.restore();cutline(ctx,bounds?.w??w,bounds?.h??h,dark);return {truncated:lines.length>capacity,lineCount:lines.length,capacity};
}
export function paintSpine(ctx,set,bounds){const d=spineDimensions(set),dark=set.theme==='dark';ctx.save();ctx.beginPath();ctx.rect(0,0,d.sw,d.sh);ctx.clip();ctx.fillStyle=dark?'#231F20':'#ffffff';ctx.fillRect(0,0,d.sw,d.sh);ctx.fillStyle=dark?'white':'black';ctx.font=`${Math.min(1.76,d.sh*.5)}px ${fontStack(set)}`;ctx.textBaseline='alphabetic';const raw=displayText(set,[set.album,set.artist].filter(Boolean).join(' / ')).replace(/[\r\n\t]+/g,' ');const logoW=Math.min(6.8,(d.sh-.6)*272/88),logoH=logoW*88/272,logoX=(bounds?.w??d.sw)-1.5-logoW,textWidth=set.hiMD?logoX-1-1.5:d.sw-3;const chars=[...raw];let text=raw;while(chars.length&&ctx.measureText(text).width>textWidth){chars.pop();text=chars.join('');}if(text!==raw){while(chars.length&&ctx.measureText(text+'…').width>textWidth){chars.pop();text=chars.join('');}text+='…';}// Canvas middle centers the font em box, not the visible Latin/CJK ink.
 const metrics=ctx.measureText(text),ascent=metrics.actualBoundingBoxAscent,descent=metrics.actualBoundingBoxDescent;
 if(!Number.isFinite(ascent)||!Number.isFinite(descent))throw localeError('textMetrics');
 const baseline=(bounds?.h??d.sh)/2+(ascent-descent)/2;
 ctx.fillText(text,1.5,baseline);if(set.hiMD){const mark=hiMDImages.get('hi-md.png');if(!mark)throw localeError('hiNotReady');ctx.drawImage(mark,logoX,((bounds?.h??d.sh)-logoH)/2,logoW,logoH);}ctx.restore();cutline(ctx,bounds?.w??d.sw,bounds?.h??d.sh,dark);return {truncated:raw!==text,text,textWidth:metrics.width,textRight:1.5+metrics.width,logo:set.hiMD?{x:logoX,y:((bounds?.h??d.sh)-logoH)/2,w:logoW,h:logoH}:null,baseline};}
export async function frontCanvas(set,mode='physical'){const art=await prepare(set),r=frontRaster(set,mode),c=newCanvas(r.width,r.height),ctx=c.getContext('2d');ctx.fillStyle=set.theme==='dark'?'#231F20':'white';ctx.fillRect(0,0,c.width,c.height);ctx.scale(r.scale,r.scale);const info=paintFront(ctx,set,art,{w:c.width/r.scale,h:c.height/r.scale});return {canvas:c,info};}
export async function spineCanvas(set){checkFonts(set,true);if(set.hiMD)await loadHiMD();const d=spineDimensions(set),c=newCanvas(px(d.sw),px(d.sh)),ctx=c.getContext('2d');ctx.fillStyle=set.theme==='dark'?'#231F20':'white';ctx.fillRect(0,0,c.width,c.height);ctx.scale(PPM,PPM);const info=paintSpine(ctx,set,{w:c.width/PPM,h:c.height/PPM});return {canvas:c,info};}
export async function sheetCanvas(sets,settings){if(settings.sheetPreset==='case-set')return labelSheetCanvas(sets,settings);if(settings.sheetPreset&&settings.sheetPreset!=='legacy-four')throw localeError('caseInvalid');const manifest=sheetManifest(sets,settings),arts=await Promise.all(sets.map(async set=>{const [art]=await Promise.all([prepare(set),set.hiMD?loadHiMD():null]);return art;})),c=newCanvas(manifest.exportPx.width,manifest.exportPx.height),ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.scale(PPM,PPM);for(let i=0;i<sets.length;i++)for(const l of manifest.sets[i].labels){const r=l.renderedMm,d=l.designMm;ctx.save();ctx.translate(r.x,r.y);ctx.scale(r.width/d.width,r.height/d.height);if(l.kind==='front')paintFront(ctx,sets[i],arts[i]);else paintSpine(ctx,sets[i]);ctx.restore();}return {canvas:c,manifest};}
export function calibrationCanvas(settings){const paper=PAPERS[settings.paper];if(!paper)throw localeError('unknownPaper');const {width:w,height:h}=paper,c=newCanvas(px(w),px(h)),ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.scale(PPM,PPM);ctx.fillStyle='#111';ctx.strokeStyle='#111';ctx.lineWidth=.15;ctx.font='2px "MD Studio atkinson"';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('UNCORRECTED / 300 DPI',w/2,12);ctx.font='1.6px "MD Studio atkinson"';ctx.fillText(`${w} x ${h} mm | X = 1 / Y = 1`,w/2,17);
 const cx=w/2,cy=h/2;ctx.beginPath();ctx.moveTo(cx-25,cy);ctx.lineTo(cx+25,cy);ctx.moveTo(cx,cy-25);ctx.lineTo(cx,cy+25);for(let i=-25;i<=25;i++){const length=i%5===0?2:1;ctx.moveTo(cx+i,cy-length);ctx.lineTo(cx+i,cy+length);ctx.moveTo(cx-length,cy+i);ctx.lineTo(cx+length,cy+i);}ctx.stroke();ctx.fillText('X: 50 mm / END TO END',cx,cy+7);ctx.save();ctx.translate(cx-7,cy);ctx.rotate(-Math.PI/2);ctx.fillText('Y: 50 mm / END TO END',0,0);ctx.restore();ctx.fillText('Measure both 50 mm spans on an uncorrected print.',cx,h-17);ctx.fillText('Factor = 50 / measured mm. Recheck label dimensions.',cx,h-12);
 // Independent reference boxes, all strokes inset and safely away from rulers.
 ctx.save();ctx.translate((w-38)/2,23);cutline(ctx,38,8);ctx.fillText('38 x 8 mm',19,4);ctx.restore();ctx.save();ctx.translate((w-58)/2,h-31);cutline(ctx,58,3.5);ctx.fillText('58 x 3.5 mm',29,1.75);ctx.restore();return c;
}
export function fontDiagnostics(){return Object.fromEntries(Object.keys(fontManifest||{}).map(k=>[k,{loaded:loaded.has(k),glyphs:fontManifest[k].glyphCount}]));}

export const CASE_TYPOGRAPHY=Object.freeze({paddingMm:3,headerMm:8,separatorMm:2,footerMm:3,listY:13,listHeight:41,pitchMm:3,fontMm:2.3,rows:13,numberMm:4,titleX:8,titleMm:49,durationX:58,durationMm:10});
export const JCARD_TYPOGRAPHY=Object.freeze({...CASE_TYPOGRAPHY,listHeight:45,rows:15,titleMm:46,durationX:55});
export function caseTypography(set){return caseProfile(set).h===64?JCARD_TYPOGRAPHY:CASE_TYPOGRAPHY;}
export function graphemes(text){if(typeof Intl.Segmenter!=='function')throw localeError('caseGrapheme');return [...new Intl.Segmenter('und',{granularity:'grapheme'}).segment(text)].map(v=>v.segment);}
export function elide(ctx,text,width){const raw=String(text).replace(/[\r\n\t]+/g,' ');if(ctx.measureText(raw).width<=width)return {text:raw,truncated:false};const chars=graphemes(raw);while(chars.length&&ctx.measureText(chars.join('')+'…').width>width)chars.pop();return {text:chars.join('')+'…',truncated:true};}
function caseFonts(set){caseProfile(set);const limit=printRows(set.case.profile),rows=(set.trackList?.rows||[]).filter(r=>r.included);if(rows.length>limit)throw localeError('caseRowOverflow',{count:rows.length-limit,limit});
 const text=[set.album,set.artist,'0123456789:—… / !',...rows.flatMap(r=>[r.no,r.title,formatDuration(r.durationMs)])].join('\n');checkFonts({...set,uppercase:false,album:text,artist:'',year:''});}
export function paintCase(ctx,set,bounds){const {w,h}=caseProfile(set),ty=caseTypography(set),dark=set.theme==='dark';ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();ctx.fillStyle=dark?'#231F20':'#ffffff';ctx.fillRect(0,0,w,h);ctx.fillStyle=dark?'#ffffff':'#000000';ctx.font=`2.3px ${fontStack(set)}`;ctx.textBaseline='middle';let truncated=false;
 const draw=(text,x,y,width,align='left')=>{const e=elide(ctx,text,width);truncated ||=e.truncated;ctx.save();ctx.beginPath();ctx.rect(x,y-1.5,width,3);ctx.clip();ctx.textAlign=align;ctx.fillText(e.text,align==='right'?x+width:x,y);ctx.restore();return e;};
 draw(set.album,3,5,w-6);ctx.font=`1.8px ${fontStack(set)}`;draw(set.artist,3,8.5,w-6);ctx.strokeStyle=dark?'#a7aba4':'#6d786c';ctx.lineWidth=.1;ctx.beginPath();ctx.moveTo(3,11);ctx.lineTo(w-3,11);ctx.stroke();ctx.font=`2.3px ${fontStack(set)}`;
 const rows=set.trackList.rows.filter(r=>r.included);const rendered=rows.map((r,i)=>{const y=14.5+i*3;draw(r.no,3,y,4);const title=draw(r.title,8,y,ty.titleMm);draw(formatDuration(r.durationMs),ty.durationX,y,10,'right');return {id:r.id,y,title:title.text,truncated:title.truncated};});
 const c=capacity(set.trackList,set.case.profile);ctx.font=`1.8px ${fontStack(set)}`;draw(`${rows.length} / ${formatDuration(c.knownMs)} / ${set.trackList.capacityMinutes}:00${c.unknown?' / —':''}${c.overflowMs?' / !':''}`,3,h-3.5,w-6);
 ctx.restore();cutline(ctx,bounds?.w??w,bounds?.h??h,dark);return {truncated,rows:rendered,capacity:c,typography:ty};}
export async function caseCanvas(set){caseFonts(set);const {w,h}=caseProfile(set),c=newCanvas(px(w),px(h)),ctx=c.getContext('2d');ctx.fillStyle=set.theme==='dark'?'#231F20':'white';ctx.fillRect(0,0,c.width,c.height);ctx.scale(PPM,PPM);const info=paintCase(ctx,set,{w:c.width/PPM,h:c.height/PPM});return {canvas:c,info};}
async function labelSheetCanvas(sets,settings){const manifest=presetManifest(sets,settings),map=new Map(sets.map(s=>[s.id,s])),arts=new Map();
 // Only selected kinds create dependencies: cases do not load artwork/front geometry.
 await Promise.all(manifest.labels.map(async l=>{const set=map.get(l.setId);if(l.kind==='case')caseFonts(set);else if(l.kind==='front')arts.set(set.id,await prepare(set));else{checkFonts(set,true);if(set.hiMD)await loadHiMD();}}));
 const c=newCanvas(manifest.exportPx.width,manifest.exportPx.height),ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.scale(PPM,PPM);for(const l of manifest.labels){const set=map.get(l.setId),r=l.renderedMm,d=l.designMm;ctx.save();ctx.translate(r.x,r.y);ctx.scale(r.width/d.width,r.height/d.height);if(l.kind==='case')paintCase(ctx,set);else if(l.kind==='front')paintFront(ctx,set,arts.get(set.id));else paintSpine(ctx,set);ctx.restore();}return {canvas:c,manifest};}
