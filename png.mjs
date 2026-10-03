import {t,localeError,errorText} from './i18n.mjs';
const te=new TextEncoder();
export function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,data){const out=new Uint8Array(data.length+12),v=new DataView(out.buffer);v.setUint32(0,data.length);out.set(te.encode(type),4);out.set(data,8);v.setUint32(data.length+8,crc32(out.subarray(4,data.length+8)));return out;}
export function setPngDpi(bytes,dpi=300){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(bytes.length<33||view.getUint32(0)!==0x89504e47||view.getUint32(4)!==0x0d0a1a0a)throw localeError('pngInvalid');
 const density=new Uint8Array(9),d=new DataView(density.buffer);d.setUint32(0,Math.round(dpi/.0254));d.setUint32(4,Math.round(dpi/.0254));density[8]=1;
 const parts=[bytes.subarray(0,8)];let at=8,inserted=false;
 while(at<bytes.length){const len=view.getUint32(at),end=at+12+len;if(end>bytes.length)throw localeError('pngIncomplete');const type=new TextDecoder().decode(bytes.subarray(at+4,at+8));if(type!=='pHYs')parts.push(bytes.subarray(at,end));if(type==='IHDR'){parts.push(chunk('pHYs',density));inserted=true;}at=end;}
 if(!inserted)throw localeError('pngHeader');const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let i=0;for(const p of parts){out.set(p,i);i+=p.length;}return out;
}
export async function pngBlob(canvas){const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(localeError('pngEncode')),'image/png'));return new Blob([setPngDpi(new Uint8Array(await blob.arrayBuffer()))],{type:'image/png'});}
