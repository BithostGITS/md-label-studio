// Revision 2 shared millimetre layout. Legacy painters are intentionally separate.
export const coordinated=set=>set.layoutRevision===2;
export function fitImage(art,box,fit='contain'){
 if(!art)return null;const sw=art.naturalWidth||art.width,sh=art.naturalHeight||art.height;
 if(!(sw>0&&sh>0&&box.w>0&&box.h>0))throw Error('image rectangle');
 const scale=(fit==='cover'?Math.max:Math.min)(box.w/sw,box.h/sh),w=sw*scale,h=sh*scale;
 if(fit==='cover'){const cw=box.w/scale,ch=box.h/scale;return {...box,source:[(sw-cw)/2,(sh-ch)/2,cw,ch],fit};}
 return {x:box.x+(box.w-w)/2,y:box.y+(box.h-h)/2,w,h,source:[0,0,sw,sh],fit};
}
export function wrapMeasured(text,width,measure){
 const out=[];for(const para of String(text).replace(/\r\n?/g,'\n').split('\n')){let line='';
 const chars=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('und',{granularity:'grapheme'}).segment(para)].map(s=>s.segment):[...para];
 for(const ch of chars){if(line&&measure(line+ch).width>width){out.push(line.trimEnd());line='';}line+=ch;}out.push(line.trimEnd());}return out;
}
export function textGroup(text,width,size,measure,weight=400){
 const lines=wrapMeasured(text,width,s=>measure(s,size,weight));const pitch=size*1.25;
 const metrics=lines.map(s=>measure(s,size,weight));const top=Math.min(...metrics.map((m,i)=>i*pitch-m.actualBoundingBoxAscent)),bottom=Math.max(...metrics.map((m,i)=>i*pitch+m.actualBoundingBoxDescent));
 return {lines,metrics,pitch,top,bottom,h:bottom-top,size,weight};
}
export function groupElements(group,x,center,role,color){return group.lines.map((text,i)=>({kind:'text',role,text,x,y:center-(group.top+group.bottom)/2+i*group.pitch,size:group.size,weight:group.weight,color}));}
// Protect artwork from the inside cutting stroke and its antialiased fringe.
// Caller supplies the shared physical stroke + one native300DPI raster pixel.
export function frontLayout(set,art,w,h,measure,text,artInset=.10+25.4/300){
 const footer=textGroup(text,w-4,1.76,measure),headerH=set.hideHeader?0:43/11.811,pad=1;
 const topMin=headerH?headerH+2*pad:pad,bottomMin=footer.h+2*pad,available=h-topMin-bottomMin;
 if(available<=0)return {unsafe:['vertical-clipping'],footer};
 const image=fitImage(art,{x:artInset,y:topMin,w:w-2*artInset,h:available},set.coverFit||'contain');
 // Remaining space is shared between the actual top and bottom bands.
 const ih=image?.h||0,extra=h-ih-topMin-bottomMin,top=topMin+extra/2;
 if(image)image.y=top;
 const bands={top:{y:0,h:top},bottom:{y:top+ih,h:h-top-ih}};
 return {image,bands,headerCenter:bands.top.h/2,footer,footerCenter:bands.bottom.y+bands.bottom.h/2,unsafe:[]};
}
export function caseLayout(set,w,h,{art,measure,settings,strings}){
 const c=settings,j=h===64,bodyTop=j?5:0,pad=2,gap=1.2,color=c.caseText;
 const mode=c.template.replace('kaih-','');const elements=[{kind:'rect',role:'trim',x:0,y:0,w,h,alpha:1,color:c.caseBg}],unsafe=[];
 const logoEnabled=c.logoCase&&c.logoStyle!=='none',topLogo=logoEnabled&&c.logoCorner.startsWith('top');
 const logoBand=logoEnabled?6.5:0;let top=bodyTop+pad+(topLogo?logoBand:0),bottom=h-pad-(!topLogo?logoBand:0);
 const addGroup=(g,x,center,role)=>elements.push(...groupElements(g,x,center,role,color));
 const titleNeeded=mode!=='image'||c.titleBlock;
 let titleGroup=null;if(titleNeeded){const album=textGroup(set.album,w-2*pad,mode==='image-tracks'?4.0:4.2,measure,700),artist=textGroup(`${set.artist} - ${set.year}`,w-2*pad,2.5,measure,400);titleGroup={album,artist,h:album.h+gap+artist.h};}
 const minTitle=titleGroup?titleGroup.h+2*gap:0;
 const contentTop=top+minTitle,contentHeight=bottom-contentTop;
 let image=null,trackGroups=[];
 if(contentHeight<=0)unsafe.push('vertical-clipping');
 else if(mode==='image')image=fitImage(art,{x:pad,y:contentTop,w:w-2*pad,h:contentHeight},set.coverFit||'contain');
 else if(mode==='image-tracks'||mode==='background-tracks'){
 const imageW=(w-2*pad-gap)*.46,trackX=pad+imageW+gap,trackW=w-pad-trackX;
 trackGroups=strings.slice(0,13).map(s=>textGroup(s,trackW,2.25,measure));
 const trackHeight=trackGroups.reduce((n,g)=>n+g.h+.65,0)-.65;
 if(trackHeight>contentHeight)unsafe.push('vertical-clipping');
 const center=contentTop+contentHeight/2;image=fitImage(art,{x:pad,y:contentTop,w:imageW,h:contentHeight},mode==='background-tracks'?(set.coverFit||'contain'):'contain');let y=center-trackHeight/2;
 // Revision2 background panels decorate their own reserved text column;
 // neither panels nor text can mask the protected image/spine regions.
 if(mode==='background-tracks'&&trackGroups.length)elements.push({kind:'rect',role:'track-panel',x:trackX-.3,y:y-.3,w:trackW+.6,h:trackHeight+.6,alpha:.88,color:c.caseBg});
 for(const g of trackGroups){addGroup(g,trackX,y+g.h/2,'track');y+=g.h+.65;}
 }else if(mode==='tracks'){
 trackGroups=strings.slice(0,13).map(s=>textGroup(s,w-2*pad,2.35,measure));const total=trackGroups.reduce((n,g)=>n+g.h+.65,0)-.65;
 if(total>contentHeight)unsafe.push('vertical-clipping');let y=contentTop+(contentHeight-total)/2;for(const g of trackGroups){addGroup(g,pad,y+g.h/2,'track');y+=g.h+.65;}
 }
 if(image)elements.push({kind:'image',role:'art',...image});
 // For image-only captions, use the real whitespace, not the allocated image box.
 if(titleGroup){const trackTop=elements.filter(e=>e.role==='track').map(e=>e.y-measure(e.text,e.size,e.weight).actualBoundingBoxAscent);const titleBottom=image?Math.min(image.y,...trackTop):contentTop;const center=(top+titleBottom)/2;const y=center-titleGroup.h/2;if(mode==='background-tracks')elements.push({kind:'rect',role:'title-panel',x:pad-.3,y:y-.3,w:w-2*pad+.6,h:titleGroup.h+.6,alpha:.88,color:c.caseBg});addGroup(titleGroup.album,pad,y+titleGroup.album.h/2,'album');addGroup(titleGroup.artist,pad,y+titleGroup.album.h+gap+titleGroup.artist.h/2,'artist');}
 if(logoEnabled){const band=topLogo?{y:bodyTop,h:logoBand+pad}:{y:image&&mode==='image'?image.y+image.h:bottom,h:h-(image&&mode==='image'?image.y+image.h:bottom)};
 elements.push({kind:'logo',role:'logo',x:c.logoCorner.endsWith('left')?-1.5:w-10.5,y:band.y+(band.h-5)/2,w:12,h:5,style:c.logoStyle,color});}
 if(j){elements.push({kind:'rect',role:'spine-strip',x:0,y:0,w,h:5,alpha:1,color:c.caseBg});if(mode!=='image'||c.jCardSpineInfo){const group=textGroup(c.spineTextOverride??`${set.album} : ${set.artist}`,w-6,2.75,measure,700);if(group.h>4)unsafe.push('vertical-clipping');addGroup(group,3,2.5,'spine');}elements.push({kind:'fold',role:'fold',x:0,y:5,w,color:'#8f969c',dash:[1.2,.8],screenStroke:.176388889});}
 if(mode!=='image'&&strings.length>13)unsafe.push('row-overflow');
 return {elements,image,unsafe,omitted:mode==='image'?0:Math.max(0,strings.length-13)};
}
