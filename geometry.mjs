/** Independent implementation; no original app code. All coordinates are millimetres. */
export const DPI=300, PPM=DPI/25.4, STROKE=.10;
export const PROFILES={original:{w:38,h:54,label:'原版布局 · 38 × 54 mm（源码推导）'},vendor:{w:32,h:52,label:'厂商贴纸 · 32 × 52 mm（Elecom / A-one）'},sony:{w:35.75,h:52.75,label:'Sony 社区实测 · 35.75 × 52.75 mm'},custom:{label:'自定义 · 请测量实际贴纸区域'}};
export const PAPERS={selphy:{width:100,height:148,label:'SELPHY 明信片 · 成品 100 × 148 mm'},inch:{width:101.6,height:152.4,label:'真正 4 × 6 英寸 · 101.6 × 152.4 mm'}};
export const px=mm=>Math.round(mm*PPM);
export function bounded(value,min,max,name){if(!Number.isFinite(value)||value<min||value>max)throw Error(`${name}须为 ${min}–${max} 之间的数字`);return value;}
export function frontDimensions(set){const p=PROFILES[set.profile];if(!p)throw Error('未知正面尺寸方案');return {w:bounded(p.w??Number(set.w),10,85,'正面宽度'),h:bounded(p.h??Number(set.h),15,120,'正面高度')};}
export function spineDimensions(set){return {sw:bounded(Number(set.sw),20,85,'书脊长度'),sh:bounded(Number(set.sh),2,10,'书脊高度')};}
export function dimensions(set){return {...frontDimensions(set),...spineDimensions(set)};}
export function calibration(settings){if(!settings.calibrated)return {mode:'none',x:{factor:1},y:{factor:1}};const axis=m=>({referenceMm:50,measuredMm:bounded(Number(m),35,75,'未校正标尺实测长度'),factor:50/Number(m)});return {mode:'measured',x:axis(settings.measuredX),y:axis(settings.measuredY)};}
export function pixelRect(r){const x=px(r.x),y=px(r.y);return {x,y,width:px(r.x+r.width)-x,height:px(r.y+r.height)-y};}
export function overlaps(a,b){return a.x<b.x+b.width-1e-8&&b.x<a.x+a.width-1e-8&&a.y<b.y+b.height-1e-8&&b.y<a.y+a.height-1e-8;}
export function sheetManifest(sets,settings){
 if(sets.length!==2)throw Error('纸张必须包含两套标签');
 const paper=PAPERS[settings.paper];if(!paper)throw Error('未知纸张');const {width:W,height:H}=paper;
 const dims=sets.map(dimensions), gap=6, margin=6, cal=calibration(settings),fx=cal.x.factor,fy=cal.y.factor;
 const [a,b]=dims;let design;
 if(a.w+b.w+gap<=W-2*margin){
  const totalH=Math.max(a.h,b.h)+gap+a.sh+gap+b.sh,top=(H-totalH)/2,left=(W-a.w-b.w-gap)/2;
  design=[[{x:left,y:top,width:a.w,height:a.h},{x:(W-a.sw)/2,y:top+Math.max(a.h,b.h)+gap,width:a.sw,height:a.sh}],
  [{x:left+a.w+gap,y:top,width:b.w,height:b.h},{x:(W-b.sw)/2,y:top+Math.max(a.h,b.h)+gap+a.sh+gap,width:b.sw,height:b.sh}]];
 }else{
  const totalH=a.h+b.h+a.sh+b.sh+3*gap;let y=(H-totalH)/2;
  design=dims.map(d=>{const front={x:(W-d.w)/2,y,width:d.w,height:d.h};y+=d.h+gap;const spine={x:(W-d.sw)/2,y,width:d.sw,height:d.sh};y+=d.sh+gap;return [front,spine];});
 }
 const manifest={schema:'md-studio/1',paperPreset:settings.paper,paperMm:{width:W,height:H},dpi:DPI,exportPx:{width:px(W),height:px(H)},marginsMm:{left:margin,right:margin,top:margin,bottom:margin},calibration:cal,transform:{origin:'paper-center',centerMm:{x:W/2,y:H/2},formula:'rendered = center + (design - center) * factor',checkerNote:'nominalMm positions are pretranslated by center/factor-center before origin scaling; dimensions stay nominal. designMm retains original centered layout.'},physicalOutputVerified:false,sets:[]};
 manifest.sets=design.map((pair,i)=>({id:i?'B':'A',profile:sets[i].profile,labels:pair.map((r,j)=>{
  const rendered={x:W/2+(r.x-W/2)*fx,y:H/2+(r.y-H/2)*fy,width:r.width*fx,height:r.height*fy};
  return {kind:j?'spine':'front',designMm:r,nominalMm:{...r,x:rendered.x/fx,y:rendered.y/fy},renderedMm:rendered,rectPx:pixelRect(rendered),cutline:{placement:'inside',widthMm:STROKE,maxWidthMm:.2,widthPx:{x:STROKE*fx*PPM,y:STROKE*fy*PPM}}};})}));
 const labels=manifest.sets.flatMap(s=>s.labels);
 for(const l of labels){const r=l.renderedMm;if(r.x<margin||r.y<margin||r.x+r.width>W-margin||r.y+r.height>H-margin)throw Error('尺寸或校正超出 6 mm 安全边距，请减小尺寸或检查实测值（不会自动缩放）');}
 for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)if(overlaps(labels[i].renderedMm,labels[j].renderedMm)||overlaps(labels[i].rectPx,labels[j].rectPx))throw Error('标签发生重叠，请调整尺寸');
 return manifest;
}
export function frontRaster(set,mode){const d=frontDimensions(set);if(mode==='compat'){if(set.profile!=='original')throw Error('兼容导出只适用于原版 38 × 54 mm 方案');return {width:448,height:637,scale:11.811,compat:true};}return {width:px(d.w),height:px(d.h),scale:PPM,compat:false};}
export function safeFilename(text){return (String(text).normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g,'_').replace(/[. ]+$/g,'').trim().slice(0,70)||'未命名专辑').replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?=\.|$)/i,'_$1');}
