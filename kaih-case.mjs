import {coordinated,caseLayout} from './cover-layout.mjs';
// Interior-only Kaih adaptation. Geometry/exports remain owned by existing callers.
export const KAIH_LAYOUTS=['kaih-image-tracks','kaih-image','kaih-background-tracks','kaih-tracks'];
export const CASE_TEMPLATES=['tracks','legacy-track-table',...KAIH_LAYOUTS];
export const isKaih=set=>KAIH_LAYOUTS.includes(set.case?.template);
export const KAIH_FONTS=['Inter','IBM Plex Sans','Source Sans 3','Roboto Condensed','Work Sans','Libre Baskerville','Cormorant Garamond','Playfair Display','Spectral','Space Grotesk','Bebas Neue','Archivo Black','Oswald','Staatliches','Unica One'];
export const KAIH_PALETTES=[
 ['#f1e5d3','#172130','#111820','#f5efe4','#efe3cf','#172130'],
 ['#17142b','#ffd6f3','#120f25','#fdd7fb','#f5d5ef','#191129'],
 ['#efe0c9','#32271d','#2b241d','#f4e7d2','#ead9be','#2b241d'],
 ['#dce8e2','#223548','#172637','#ecf2ec','#d9e7e0','#213344'],
 ['#1d132d','#ffb5e8','#11101f','#fbd0ee','#241331','#ffcaef'],
 ['#d6c0a2','#241f1b','#211b17','#f1dec2','#d8bea0','#241f1b'],
 ['#000000','#ffffff','#000000','#ffffff','#000000','#ffffff'],
 ['#ffffff','#000000','#ffffff','#000000','#ffffff','#000000']
].map(values=>Object.freeze(Object.fromEntries(['discBg','discText','caseBg','caseText','spineBg','spineText'].map((k,i)=>[k,values[i]]))));
export function newCase(profile='kaih-case-71x60',seed=0){return {profile,template:KAIH_LAYOUTS[0],...caseDefaults(seed)};}
export function caseDefaults(seed=0){return {styleLinked:true,palette:seed%6,...KAIH_PALETTES[seed%6],image:{type:'sample',seed:seed%6},font:'Inter',titleBlock:true,jCardSpineInfo:true,spineTextOverride:null,trackText:null,logoCase:true,logoStyle:'auto',logoCorner:'bottom-right'};}
export function caseSettings(set){return {...caseDefaults(),...set.case};}
export function trackStrings(set){const c=caseSettings(set);return (c.trackText===null?(set.trackList?.rows||[]).filter(r=>r.included).map(r=>`${r.no} ${r.title}`).join('\n'):c.trackText).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);}
export function validateCaseInterior(raw,version=4){
 if(!raw||!CASE_TEMPLATES.includes(raw.template))throw Error('caseInvalid');
 // Old tracks keeps its exact persisted shape and old painter behavior.
 if(raw.template==='tracks'&&version<5)return {profile:raw.profile,template:'tracks'};
 if(version===5){if(typeof raw.styleLinked!=='boolean'||!Number.isInteger(raw.palette)||raw.palette<0||raw.palette>7)throw Error('caseInvalid');for(const k of STYLE_ROLES)if(typeof raw[k]!=='string'||!/^#[\da-f]{6}$/i.test(raw[k]))throw Error('caseInvalid');}
 const out={...caseDefaults(),...raw};
 if(!KAIH_FONTS.includes(out.font)||!Number.isInteger(out.palette)||out.palette<0||out.palette>(version===5?7:5)||!['auto','black','white','emoji','none'].includes(out.logoStyle)||!['bottom-right','bottom-left','top-right'].includes(out.logoCorner))throw Error('caseInvalid');
 for(const k of ['discBg','discText','caseBg','caseText','spineBg','spineText'])if(!/^#[\da-f]{6}$/i.test(out[k]))throw Error('caseInvalid');
 for(const k of ['titleBlock','jCardSpineInfo','logoCase'])if(typeof out[k]!=='boolean')throw Error('caseInvalid');
 for(const [k,n] of [['trackText',402000],['spineTextOverride',4003]])if(out[k]!==null&&(typeof out[k]!=='string'||out[k].length>n))throw Error('caseInvalid');
 const art=out.image;if(!art||!(art.type==='sample'&&Number.isInteger(art.seed)&&art.seed>=0&&art.seed<6||art.type==='album'||art.type==='none'||art.type==='upload'&&typeof art.data==='string'&&art.data.length<=18000000&&/^data:image\/(png|jpeg|webp);base64,/.test(art.data)&&typeof art.name==='string'&&art.name.length<=1024))throw Error('caseInvalid');
 return Object.fromEntries(['profile','template',...Object.keys(caseDefaults()).filter(k=>version===5||k!=='styleLinked')].map(k=>[k,out[k]]));
}
export function logoColor(bg,style){if(style!=='auto')return style;const rgb=[1,3,5].map(i=>parseInt(bg.slice(i,i+2),16)/255);return rgb.reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0)<.45?'white':'black';}
export function coverCrop(sw,sh,w,h){const scale=Math.max(w/sw,h/sh),cw=w/scale,ch=h/scale;return [(sw-cw)/2,(sh-ch)/2,cw,ch];}
// Exact mm display list also supports independent acceptance tests.
export function caseElements(set,w,h){const c=caseSettings(set),j=h===64?3:0,mode=c.template.replace('kaih-',''),elements=[];
 const rect=(role,x,y,width,height,alpha=1)=>elements.push({kind:'rect',role,x,y,w:width,h:height,alpha,color:c.caseBg});
 const text=(role,value,x,y,size,weight=400)=>elements.push({kind:'text',role,text:value,x,y,size,weight,color:c.caseText});
 const image=(x,y,width,height)=>elements.push({kind:'image',role:'art',x,y,w:width,h:height});
 const panel=()=>{rect('title-panel',4,4+j,w-8,13,.88);text('album',set.album,6,9.5+j,4.2,700);text('artist',`${set.artist} - ${set.year}`,6,14+j,2.5);};
 rect('bleed',-2,-2,w+4,h+4);rect('trim',0,0,w,h);
 const strings=trackStrings(set).slice(0,13);
 if(mode==='image-tracks'){text('album',set.album,5,8+j,4.6,700);text('artist',`${set.artist} - ${set.year}`,5,12.5+j,2.7,700);image(5,16+j,27,27);strings.forEach((s,i)=>text('track',s,36,18+j+3*i,2.25));}
 if(mode==='image'||mode==='background-tracks')image(-1,-1,w+2,h+2);
 if(mode==='image'&&c.titleBlock)panel();
 if(mode==='background-tracks'){panel();rect('track-panel',4,20+j,w-8,36,.88);strings.forEach((s,i)=>text('track',s,6,25+j+2.35*i,2.1));}
 if(mode==='tracks'){text('album',set.album,5,8+j,5.2,700);text('artist',`${set.artist} - ${set.year}`,5,13+j,3,700);strings.forEach((s,i)=>text('track',s,5,20+j+3.2*i,2.35));}
 if(j){rect('spine-strip',0,0,w,5);if(mode!=='image'||c.jCardSpineInfo){text('spine',c.spineTextOverride??`${set.album} : ${set.artist}`,3,2.5,2.75,700);elements.at(-1).anchor='ink-center';}}
 if(c.logoCase&&c.logoStyle!=='none')elements.push({kind:'logo',role:'logo',x:c.logoCorner.endsWith('left')?1.2:w-10.4,y:c.logoCorner.startsWith('top')?1.2:h-6.2,w:12,h:5,style:logoColor(c.caseBg,c.logoStyle),color:c.caseText});
 if(j)elements.push({kind:'fold',role:'fold',x:0,y:5,w,color:'#8f969c',dash:[1.2,.8],screenStroke:.176388889});
 return elements;
}
export function paintKaih(ctx,set,w,h,{art,logo,font,weight=()=>700}){const c=caseSettings(set),modern=coordinated(set),layout=modern?caseLayout(set,w,h,{art,measure:(text,size,wt)=>inkMetrics(ctx,text,size,font,wt===700?weight(c.font):wt),settings:c,strings:trackStrings(set)}):null,elements=layout?.elements||caseElements(set,w,h),overflow=[],unsafe=[...(layout?.unsafe||[])];
 if(coordinated(set)&&c.template!=='kaih-image'&&trackStrings(set).length>13)unsafe.push('row-overflow');
 for(const mark of elements.filter(e=>e.kind==='logo'))mark.style=logoColor(c.caseBg,mark.style);
 ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();ctx.textAlign='left';ctx.textBaseline='alphabetic';
 const tracks=elements.filter(e=>e.role==='track'),trackMetrics=tracks.map(e=>inkMetrics(ctx,e.text,e.size,font,400));let backgroundPitch=2.35;
 // Separately evidenced background-grid defect: descender bands fail the 0.35mm
 // gate in all three engines at the inherited 2.35mm pitch. Keep first baseline,
 // title/panel origins and font sizes; enlarge pitch only when final ink needs it.
 if(!modern&&c.template==='kaih-background-tracks'&&tracks.length){for(let i=1;i<tracks.length;i++)backgroundPitch=Math.max(backgroundPitch,trackMetrics[i-1].actualBoundingBoxDescent+trackMetrics[i].actualBoundingBoxAscent+.35+2*25.4/300);const panel=elements.find(e=>e.role==='track-panel'),last=tracks[0].y+backgroundPitch*(tracks.length-1)+trackMetrics.at(-1).actualBoundingBoxDescent+.15;if(panel)panel.h=Math.max(panel.h,Math.min(h===64?62.5:h-.5,last)-panel.y);}
 const boundedPitch=h===64&&c.template==='kaih-tracks'&&tracks.length>1?Math.min(3.2,(62.5-Math.max(...trackMetrics.map(m=>m.actualBoundingBoxDescent))-23)/(tracks.length-1)):3.2;
 for(const e of elements){ctx.fillStyle=e.color||c.caseBg;
 if(e.kind==='rect'){ctx.globalAlpha=e.alpha;ctx.fillRect(e.x,e.y,e.w,e.h);ctx.globalAlpha=1;}
 if(e.kind==='image'&&art){const sw=art.naturalWidth||art.width,sh=art.naturalHeight||art.height;ctx.drawImage(art,...(e.source||coverCrop(sw,sh,e.w,e.h)),e.x,e.y,e.w,e.h);}
 if(e.kind==='text'&&e.text){const resolvedWeight=e.weight===700?weight(c.font):400;ctx.font=`${resolvedWeight} ${e.size}px ${font}`;const m=inkMetrics(ctx,e.text,e.size,font,resolvedWeight);let baseline=e.anchor==='ink-center'?e.y+(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/2:e.y;
 if(!modern&&e.role==='track'&&c.template==='kaih-background-tracks'){baseline=tracks[0].y+tracks.indexOf(e)*backgroundPitch;e.pitch=backgroundPitch;}
 if(!modern&&h===64&&c.template==='kaih-tracks'&&e.role==='track'){baseline=23+tracks.indexOf(e)*boundedPitch;e.pitch=boundedPitch;}
 e.baseline=baseline;e.ink={x:e.x-m.actualBoundingBoxLeft,right:e.x+m.actualBoundingBoxRight,top:baseline-m.actualBoundingBoxAscent,bottom:baseline+m.actualBoundingBoxDescent};const mark=elements.find(v=>v.kind==='logo');let occupied=null;
 // Placement container is 12mm wide; the drawn bitmap occupies only 5mm.
 if(mark&&mark.style==='emoji'){const lm=inkMetrics(ctx,'💽',4.6,font,400);occupied={x:mark.x+6-lm.width/2-lm.actualBoundingBoxLeft,right:mark.x+6-lm.width/2+lm.actualBoundingBoxRight,top:mark.y+4-lm.actualBoundingBoxAscent,bottom:mark.y+4+lm.actualBoundingBoxDescent};}
 else if(mark&&logo)occupied={x:mark.x+3.5,right:mark.x+8.5,top:mark.y,bottom:mark.y+5};
 if(e.role==='track'&&occupied&&e.ink.right>occupied.x&&e.ink.x<occupied.right&&e.ink.bottom>occupied.top&&e.ink.top<occupied.bottom){overflow.push('logo-collision');unsafe.push('logo-collision');}
 const safeBottom=e.role==='track'?(h===64?62.5:h-.5):h;
 if(e.ink.top<0||e.ink.bottom>safeBottom)unsafe.push('vertical-clipping');
 if(e.x+m.width>w||e.ink.x<0||e.ink.top<0||e.ink.bottom>safeBottom){overflow.push(e.role);if(modern)unsafe.push('vertical-clipping');}
 ctx.font=`${resolvedWeight} ${e.size}px ${font}`;ctx.fillText(e.text,e.x,baseline);}
 if(e.kind==='logo'){if(e.style==='emoji'){ctx.font=`400 4.6px ${font}`;ctx.textAlign='center';ctx.fillText('💽',e.x+6,e.y+4);ctx.textAlign='left';}else if(logo)ctx.drawImage(logo,e.x+3.5,e.y,5,5);}
 if(e.kind==='fold'){ctx.save();const m=ctx.getTransform(),scale=Math.hypot(m.a,m.b);ctx.lineWidth=e.screenStroke/scale;ctx.strokeStyle=e.color;ctx.setLineDash(e.dash);ctx.beginPath();ctx.moveTo(0,5);ctx.lineTo(w,5);ctx.stroke();ctx.restore();}
 }
 ctx.restore();return {elements,overflow,unsafe:[...new Set(unsafe)],truncated:overflow.length>0,omitted:c.template==='kaih-image'?0:Math.max(0,trackStrings(set).length-13),rows:elements.filter(e=>e.role==='track')};
}

export const STYLE_ROLES=['discBg','discText','caseBg','caseText','spineBg','spineText'];
export function effectiveStyle(set,{withCase=false}={}){const bg=set.theme==='dark'?'#231F20':'#ffffff',fg=set.theme==='dark'?'#ffffff':'#000000';const old={discBg:bg,discText:fg,caseBg:bg,caseText:fg,spineBg:bg,spineText:fg};return withCase&&set.case?Object.fromEntries(STYLE_ROLES.map(k=>[k,caseSettings(set)[k]])):old;}
export function matchingPalette(set){const c=caseSettings(set);return c.styleLinked===false?-1:KAIH_PALETTES.findIndex(p=>STYLE_ROLES.every(k=>p[k].toLowerCase()===c[k].toLowerCase()));}
export function applyPalette(set,id){if(!Number.isInteger(id)||!KAIH_PALETTES[id])throw Error('caseInvalid');Object.assign(set.case,KAIH_PALETTES[id],{palette:id,styleLinked:true});}
// Small mm TextMetrics are quantized on some engines. Measure the final loaded face at 100x.
export function inkMetrics(ctx,text,size,font,weight=400){ctx.save();ctx.textBaseline='alphabetic';ctx.font=`${weight} ${size*100}px ${font}`;const m=ctx.measureText(text);ctx.restore();const keys=['width','actualBoundingBoxLeft','actualBoundingBoxRight','actualBoundingBoxAscent','actualBoundingBoxDescent'];const result=Object.fromEntries(keys.map(k=>[k,(m[k]??0)/100]));if(keys.some(k=>!Number.isFinite(result[k])))throw Error('textMetrics');return result;}
