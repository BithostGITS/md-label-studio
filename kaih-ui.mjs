import {t,errorText} from './i18n.mjs';
import {KAIH_LAYOUTS,KAIH_PALETTES,KAIH_FONTS,caseSettings,isKaih,trackStrings} from './kaih-case.mjs';
import {getArtwork} from './render.mjs';
const uploads=new WeakMap();
export function caseInteriorControls(set,{changed,message}){const root=document.createElement('div');root.id='case-interior-controls';const c=set.case,defaults=caseSettings(set);
 const node=(tag,props={})=>Object.assign(document.createElement(tag),props);
 const label=(key,control)=>{const l=node('label');l.append(node('span',{textContent:t(key)}),control);root.append(l);return control;};
 const hint=(key,values,warning=false)=>root.append(node('p',{className:warning?'warning':'hint',textContent:t(key,values)}));
 const change=(key,value)=>{if(key==='template'&&KAIH_LAYOUTS.includes(value))Object.assign(c,defaults);c[key]=value;changed();};
 const select=(key,id,field,options)=>{const control=node('select',{id});options.forEach(([value,key,literal])=>control.append(node('option',{value,textContent:literal||t(key)})));control.value=defaults[field];control.onchange=()=>change(field,control.value);return label(key,control);};
 const check=(key,id,field)=>{const control=node('input',{id,type:'checkbox',checked:defaults[field]});control.onchange=()=>change(field,control.checked);return label(key,control);};
 const button=(key,id,fn)=>{const b=node('button',{id,type:'button',className:'button secondary',textContent:t(key)});b.onclick=fn;root.append(b);return b;};
 const layout=select('kaihLayout','case-layout','template',[...KAIH_LAYOUTS.map((value,i)=>[value,['kaihImageTracks','kaihImage','kaihBackgroundTracks','kaihTracks'][i]]),['legacy-track-table','kaihLegacy']]);if(c.template==='tracks')layout.value='legacy-track-table';
 if(!isKaih(set)){hint('kaihLegacyHint');return root;}
 select('kaihPalette','case-palette','palette',KAIH_PALETTES.map((_,i)=>[String(i),'kaihPalette'+i])).onchange=e=>{const i=Number(e.target.value);Object.assign(c,KAIH_PALETTES[i],{palette:i});changed();};hint('kaihPaletteHint');
 for(const [field,key] of [['caseBg','kaihCaseBg'],['caseText','kaihCaseText']]){const control=node('input',{id:'case-'+field,type:'color',value:defaults[field]});control.onchange=()=>change(field,control.value);label(key,control);}
 select('kaihFont','case-font','font',KAIH_FONTS.map(name=>[name,null,name]));hint('kaihWeightHint');
 if(c.template!=='kaih-tracks'){
 const input=node('input',{type:'file',accept:'image/png,image/jpeg,image/webp',id:'case-image-file'});label('kaihUpload',input);
 input.onchange=async()=>{const file=input.files[0];input.value='';if(!file)return;const token={};uploads.set(set,token);input.disabled=true;try{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12*1024*1024)throw Error(t('uploadType'));const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});const art={type:'upload',data,name:file.name};await getArtwork(art);if(data.length>18000000||file.name.length>1024)throw Error(t('coverLimit'));if(uploads.get(set)!==token||set.case!==c)return;c.image=art;changed();}catch(e){if(uploads.get(set)===token)message(errorText(e));}finally{if(uploads.get(set)===token)uploads.delete(set);input.disabled=false;}};
 button('kaihClear','case-image-clear',()=>{uploads.delete(set);change('image',{type:'sample',seed:defaults.palette});});
 button('kaihAlbumCover','case-image-album',()=>{uploads.delete(set);change('image',{type:'album'});});hint('kaihImageSource');
 }
 if(c.template==='kaih-image')check('kaihTitleBlock','case-title-block','titleBlock');
 if(c.profile==='kaih-jcard-68x64'){
 if(c.template==='kaih-image')check('kaihSpineInfo','case-spine-info','jCardSpineInfo');
 const auto=node('input',{type:'checkbox',id:'case-spine-auto',checked:defaults.spineTextOverride===null});auto.onchange=()=>change('spineTextOverride',auto.checked?null:`${set.album} : ${set.artist}`);label('kaihSpineAuto',auto);
 if(defaults.spineTextOverride!==null){const text=node('input',{id:'case-spine-text',value:defaults.spineTextOverride,maxLength:4003});text.onchange=()=>change('spineTextOverride',text.value);label('kaihSpineOverride',text);}hint('kaihFold');
 }
 if(c.template!=='kaih-image'){
 const override=node('input',{type:'checkbox',id:'case-track-override',checked:defaults.trackText!==null});override.onchange=()=>change('trackText',override.checked?trackStrings(set).join('\n'):null);label('kaihTrackOverride',override);
 if(defaults.trackText!==null){const text=node('textarea',{id:'case-track-text',value:defaults.trackText,rows:8,maxLength:402000});text.onchange=()=>change('trackText',text.value);label('kaihTrackText',text);}
 const omitted=Math.max(0,trackStrings(set).length-13);if(omitted)hint('kaihOmitted',{count:omitted},true);
 }
 check('kaihLogo','case-logo','logoCase');select('kaihLogoStyle','case-logo-style','logoStyle',['auto','black','white','emoji','none'].map((v,i)=>[v,['kaihAuto','kaihBlack','kaihWhite','kaihEmoji','kaihNone'][i]]));select('kaihLogoCorner','case-logo-corner','logoCorner',['bottom-right','bottom-left','top-right'].map((v,i)=>[v,['kaihBottomRight','kaihBottomLeft','kaihTopRight'][i]]));hint('kaihSafety');return root;
}
