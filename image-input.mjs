/** Reject animated containers before creating Image, including project data URLs.
 * Parse chunk boundaries, not byte substrings; MIME labels are not trusted. */
export function assertStillImage(bytes){
 const b=bytes,v=new DataView(b.buffer,b.byteOffset,b.byteLength),text=(i,n)=>String.fromCharCode(...b.subarray(i,i+n));
 const bad=()=>{throw Error('无法解码封面：图片容器损坏或不是 PNG / JPEG / WebP');};
 const animated=()=>{throw Error('不接收动图（APNG / animated WebP）；请选择静态 PNG / JPEG / WebP');};
 if(b.length>=8&&text(0,8)==='\x89PNG\r\n\x1a\n'){
  let at=8,ended=false;
  while(at+12<=b.length){const n=v.getUint32(at),type=text(at+4,4);if(n>b.length-at-12)bad();if(['acTL','fcTL','fdAT'].includes(type))animated();at+=n+12;if(type==='IEND'){if(n!==0)bad();ended=true;break;}}
  if(!ended||at!==b.length)bad();return;
 }
 if(b.length>=12&&text(0,4)==='RIFF'&&text(8,4)==='WEBP'){
  const end=v.getUint32(4,true)+8;if(end!==b.length)bad();let at=12;
  while(at+8<=end){const type=text(at,4),n=v.getUint32(at+4,true);if(n>end-at-8)bad();if(type==='ANIM'||type==='ANMF'||(type==='VP8X'&&n>=1&&(b[at+8]&2)))animated();at+=8+n+(n%2);}
  if(at!==end)bad();return;
 }
 if(b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255)return;
 bad();
}
