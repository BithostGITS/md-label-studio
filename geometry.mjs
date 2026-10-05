import {t,localeError,errorText} from './i18n.mjs';
/** Independent implementation; no original app code. All coordinates are millimetres. */
export const DPI=300, PPM=DPI/25.4, STROKE=.10;
export const PROFILES={original:{w:38,h:54,label:'原版布局 · 38 × 54 mm（源码推导）'},vendor:{w:32,h:52,label:'厂商贴纸 · 32 × 52 mm（Elecom / A-one）'},sony:{w:35.75,h:52.75,label:'Sony 社区实测 · 35.75 × 52.75 mm'},custom:{label:'自定义 · 请测量实际贴纸区域'}};
export const PAPERS={selphy:{width:100,height:148,label:'SELPHY 明信片 · 成品 100 × 148 mm'},inch:{width:101.6,height:152.4,label:'真正 4 × 6 英寸 · 101.6 × 152.4 mm'}};
export const px=mm=>Math.round(mm*PPM);
export function bounded(value,min,max,name){if(!Number.isFinite(value)||value<min||value>max)throw localeError('bounded',{nameKey:name,min,max});return value;}
export function frontDimensions(set){const p=PROFILES[set.profile];if(!p)throw localeError('unknownProfile');return {w:bounded(p.w??Number(set.w),10,85,'frontWidth'),h:bounded(p.h??Number(set.h),15,120,'frontHeight')};}
export function spineDimensions(set){return {sw:bounded(Number(set.sw),20,85,'spineWidth'),sh:bounded(Number(set.sh),2,10,'spineHeight')};}
export function dimensions(set){return {...frontDimensions(set),...spineDimensions(set)};}
export function calibration(settings){if(!settings.calibrated)return {mode:'none',x:{factor:1},y:{factor:1}};const axis=m=>({referenceMm:50,measuredMm:bounded(Number(m),35,75,'rulerMeasurement'),factor:50/Number(m)});return {mode:'measured',x:axis(settings.measuredX),y:axis(settings.measuredY)};}
export function pixelRect(r){const x=px(r.x),y=px(r.y);return {x,y,width:px(r.x+r.width)-x,height:px(r.y+r.height)-y};}
export function overlaps(a,b){return a.x<b.x+b.width-1e-8&&b.x<a.x+a.width-1e-8&&a.y<b.y+b.height-1e-8&&b.y<a.y+a.height-1e-8;}
export function sheetManifest(sets,settings){
 if(![2,4].includes(sets.length))throw localeError('sheetCount');
 const paper=PAPERS[settings.paper];if(!paper)throw localeError('unknownPaper');const {width:W,height:H}=paper;
 const dims=sets.map(dimensions), gap=6, margin=6, cal=calibration(settings),fx=cal.x.factor,fy=cal.y.factor;
 const [a,b]=dims;let design;
 if(sets.length===4){
  // Fixed nominal anchors: custom dimensions must fit, never shrink/reflow silently.
  const ox=(W-100)/2,oy=(H-148)/2;
  design=dims.map((d,i)=>[{x:ox+(i%2?53:9),y:oy+(i<2?6:62),width:d.w,height:d.h},{x:ox+21,y:oy+118+i*5.5,width:d.sw,height:d.sh}]);
 }else if(a.w+b.w+gap<=W-2*margin){
  const totalH=Math.max(a.h,b.h)+gap+a.sh+gap+b.sh,top=(H-totalH)/2,left=(W-a.w-b.w-gap)/2;
  design=[[{x:left,y:top,width:a.w,height:a.h},{x:(W-a.sw)/2,y:top+Math.max(a.h,b.h)+gap,width:a.sw,height:a.sh}],
  [{x:left+a.w+gap,y:top,width:b.w,height:b.h},{x:(W-b.sw)/2,y:top+Math.max(a.h,b.h)+gap+a.sh+gap,width:b.sw,height:b.sh}]];
 }else{
  const totalH=a.h+b.h+a.sh+b.sh+3*gap;let y=(H-totalH)/2;
  design=dims.map(d=>{const front={x:(W-d.w)/2,y,width:d.w,height:d.h};y+=d.h+gap;const spine={x:(W-d.sw)/2,y,width:d.sw,height:d.sh};y+=d.sh+gap;return [front,spine];});
 }
 const manifest={schema:'md-studio/1',paperPreset:settings.paper,paperMm:{width:W,height:H},dpi:DPI,exportPx:{width:px(W),height:px(H)},marginsMm:{left:margin,right:margin,top:margin,bottom:margin},calibration:cal,transform:{origin:'paper-center',centerMm:{x:W/2,y:H/2},formula:'rendered = center + (design - center) * factor',checkerNote:'nominalMm positions are pretranslated by center/factor-center before origin scaling; dimensions stay nominal. designMm retains original centered layout.'},physicalOutputVerified:false,sets:[]};
 manifest.sets=design.map((pair,i)=>({id:'ABCD'[i],profile:sets[i].profile,labels:pair.map((r,j)=>{
  const rendered={x:W/2+(r.x-W/2)*fx,y:H/2+(r.y-H/2)*fy,width:r.width*fx,height:r.height*fy};
  return {kind:j?'spine':'front',designMm:r,nominalMm:{...r,x:rendered.x/fx,y:rendered.y/fy},renderedMm:rendered,rectPx:pixelRect(rendered),cutline:{placement:'inside',widthMm:STROKE,maxWidthMm:.2,widthPx:{x:STROKE*fx*PPM,y:STROKE*fy*PPM}}};})}));
 const labels=manifest.sets.flatMap(s=>s.labels);
 for(const l of labels){const r=l.renderedMm;if(r.x<margin||r.y<margin||r.x+r.width>W-margin||r.y+r.height>H-margin)throw localeError('margin');}
 for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)if(overlaps(labels[i].renderedMm,labels[j].renderedMm)||overlaps(labels[i].rectPx,labels[j].rectPx))throw localeError('overlap');
 return manifest;
}
export function frontRaster(set,mode){const d=frontDimensions(set);if(mode==='compat'){if(set.profile!=='original')throw localeError('compatOnly');return {width:448,height:637,scale:11.811,compat:true};}return {width:px(d.w),height:px(d.h),scale:PPM,compat:false};}
export function safeFilename(text){return (String(text).normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g,'_').replace(/[. ]+$/g,'').trim().slice(0,70)||'未命名专辑').replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?=\.|$)/i,'_$1');}

// Label-aware presets are independent of the historical paired-set manifest.
export const CASE_PROFILE=Object.freeze({id:'kaih-case-71x60',w:71,h:60,source:{url:'https://github.com/kai-h/minidisc-label-generator',file:'app/app.js',license:'CC0-1.0',note:'Nominal case rectangle; physical fit not verified'}});
export const SHEET_PRESETS=Object.freeze({
 'case-only':[['case',14.5,6],['case',14.5,68]],
 'mixed-compact':[['case',14.5,6],['front',9,68],['front',53,68],['spine',21,124],['spine',21,128.5],['spine',21,133],['spine',21,137.5]],
 'easier-cutting':[['case',14.5,6],['front',9,68],['front',53,68],['spine',21,124],['spine',21,129.5],['spine',21,135]]
});
export function defaultAssignments(sets,preset){const anchors=SHEET_PRESETS[preset];if(!anchors)throw localeError('caseInvalid');const seen={};return anchors.map(([kind],i)=>{const index=kind==='case'?i:kind==='front'?(seen.front||0):(seen.spine||0);seen[kind]=(seen[kind]||0)+1;return {setId:sets[index%sets.length].id,kind,copyIndex:0};});}
export function labelDimensions(set,kind){if(kind==='case'){if(set.case?.profile!==CASE_PROFILE.id)throw localeError('caseInvalid');return {width:71,height:60};}if(kind==='front'){const {w,h}=frontDimensions(set);return {width:w,height:h};}if(kind==='spine'){const {sw,sh}=spineDimensions(set);return {width:sw,height:sh};}throw localeError('caseInvalid');}
export function presetManifest(sets,settings){
 const preset=settings.sheetPreset;
 if(!preset||['legacy-two','legacy-four'].includes(preset))return sheetManifest(sets.slice(0,preset==='legacy-two'?2:preset==='legacy-four'?4:settings.setCount),settings);
 const anchors=SHEET_PRESETS[preset],paper=PAPERS[settings.paper];if(!anchors||!paper)throw localeError('caseInvalid');
 const refs=settings.labelAssignments;if(!Array.isArray(refs)||refs.length!==anchors.length)throw localeError('caseInvalid');
 const W=paper.width,H=paper.height,cal=calibration(settings),fx=cal.x.factor,fy=cal.y.factor,ids=new Map(sets.map(s=>[s.id,s]));if(ids.size!==sets.length||sets.some(s=>typeof s.id!=='string'||!s.id))throw localeError('caseInvalid');
 const labels=anchors.map(([kind,x,y],i)=>{const ref=refs[i],set=ids.get(ref?.setId);if(!set||ref.kind!==kind||!Number.isInteger(ref.copyIndex)||ref.copyIndex<0||ref.copyIndex>199)throw localeError('caseInvalid');const d={x:x+(W-100)/2,y:y+(H-148)/2,...labelDimensions(set,kind)},r={x:W/2+(d.x-W/2)*fx,y:H/2+(d.y-H/2)*fy,width:d.width*fx,height:d.height*fy};return {...ref,profile:kind==='case'?CASE_PROFILE.id:kind==='front'?set.profile:null,...(kind==='case'?{source:CASE_PROFILE.source}:{}),designMm:d,renderedMm:r,rectPx:pixelRect(r),cutline:{placement:'inside',widthMm:STROKE,widthPx:{x:STROKE*fx*PPM,y:STROKE*fy*PPM}},corners:'rectangular'};});
 for(const l of labels){const r=l.renderedMm;if(!Object.values(r).every(Number.isFinite)||r.x<6||r.y<6||r.x+r.width>W-6||r.y+r.height>H-6)throw localeError('margin');}
 for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)if(overlaps(labels[i].renderedMm,labels[j].renderedMm)||overlaps(labels[i].rectPx,labels[j].rectPx))throw localeError('overlap');
 return {schema:'md-studio/2',sheetPreset:preset,paperPreset:settings.paper,paperMm:{width:W,height:H},exportPx:{width:px(W),height:px(H)},dpi:DPI,marginsMm:{left:6,right:6,top:6,bottom:6},calibration:cal,physicalOutputVerified:false,labels};
}
