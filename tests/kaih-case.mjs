import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {KAIH_LAYOUTS,KAIH_PALETTES,newCase,caseElements,coverCrop,paintKaih,trackStrings,logoColor,validateCaseInterior} from '../kaih-case.mjs';
import {validateV3} from '../project-v3.mjs';
import {messages,LANGUAGES} from '../i18n.mjs';
import {kaihKeys} from '../kaih-i18n.mjs';
import {presetManifest,PPM,px} from '../geometry.mjs';
import {emptyTrackList} from '../tracks.mjs';
let checks=0;const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;},ok=(v,m)=>{assert.ok(v,m);checks++;};
const rows=Array.from({length:14},(_,i)=>({id:'row-'+i,no:String(i+1),title:'Track '+i,durationMs:123000,included:true}));
const set={id:'set-A',profile:'original',w:38,h:54,sw:58,sh:3.5,album:'Blue Hour',artist:'Mika Vale',year:'2026',uppercase:true,hideHeader:false,hiMD:false,case:newCase(),trackList:{...emptyTrackList(),rows}};
const text=e=>[e.x,e.y,e.size,e.weight];
for(const [profile,w,h,j] of [['kaih-case-71x60',71,60,0],['kaih-jcard-68x64',68,64,1]])for(const layout of KAIH_LAYOUTS){const s={...set,case:{...newCase(profile),template:layout}},e=caseElements(s,w,h),album=e.find(e=>e.role==='album'),artist=e.find(e=>e.role==='artist'),tracks=e.filter(e=>e.role==='track'),art=e.find(e=>e.kind==='image');
 eq(e.slice(0,2).map(e=>[e.role,e.x,e.y,e.w,e.h,e.color]),[['bleed',-2,-2,w+4,h+4,'#111820'],['trim',0,0,w,h,'#111820']]);
 const expected={
 'kaih-image-tracks':[[5,8+j,4.6,700],[5,12.5+j,2.7,700],36,18+j,3,2.25],
 'kaih-image':[[6,9.5+j,4.2,700],[6,14+j,2.5,400]],
 'kaih-background-tracks':[[6,9.5+j,4.2,700],[6,14+j,2.5,400],6,25+j,2.35,2.1],
 'kaih-tracks':[[5,8+j,5.2,700],[5,13+j,3,700],5,20+j,3.2,2.35]
 }[layout];eq(text(album),expected[0]);eq(text(artist),expected[1]);eq(album.text,'Blue Hour','no uppercase');eq(artist.text,'Mika Vale - 2026');
 eq(tracks.length,layout==='kaih-image'?0:13);tracks.forEach((e,i)=>eq(text(e),[expected[2],expected[3]+expected[4]*i,expected[5],400]));
 if(art)eq([art.x,art.y,art.w,art.h],layout==='kaih-image-tracks'?[5,16+j,27,27]:[-1,-1,w+2,h+2]);
 const panels=e.filter(e=>e.alpha===.88);eq(panels.map(e=>[e.x,e.y,e.w,e.h,e.alpha]),layout==='kaih-background-tracks'?[[4,4+j,w-8,13,.88],[4,20+j,w-8,36,.88]]:layout==='kaih-image'?[[4,4+j,w-8,13,.88]]:[]);
 if(j){const spine=e.find(e=>e.role==='spine');eq(text(spine),[3,2.5,2.75,700]);eq(spine.text,'Blue Hour : Mika Vale');eq(e.find(e=>e.role==='spine-strip').h,5);eq(e.at(-1),{kind:'fold',role:'fold',x:0,y:5,w,color:'#8f969c',dash:[1.2,.8],screenStroke:.176388889});ok(e.findIndex(e=>e.role==='spine-strip')>e.findIndex(e=>e.role==='album'),'spine paint overlays');}
 eq([px(w),px(h)],j?[803,756]:[839,709]);eq(PPM,300/25.4);
 const settings={paper:'selphy',calibrated:false,measuredX:50,measuredY:50,sheetPreset:'case-set',sheetSetId:'set-A',setCount:4};const sets=[s,...['B','C','D'].map(k=>({...s,id:'set-'+k}))];const manifest=presetManifest(sets,settings);eq(manifest.labels.map(e=>Object.values(e.designMm)),j?[[16,6.25,68,64],[31,77.25,38,54],[21,138.25,58,3.5]]:[[14.5,8.25,71,60],[31,75.25,38,54],[21,136.25,58,3.5]]);
 const p={schema:'md-studio-project/4',sets,mode:'physical',settings};eq(validateV3(p,v=>structuredClone(v)),p,'roundtrip '+layout);eq(validateV3(JSON.parse(JSON.stringify(p)),v=>structuredClone(v)),p);
}
eq(coverCrop(700,512,27,27),[94,0,512,512]);const full=coverCrop(700,512,73,62);ok(Math.abs(full[2]/full[3]-73/62)<1e-12);
const paletteExpected=[['#f1e5d3','#172130','#111820','#f5efe4','#efe3cf','#172130'],['#17142b','#ffd6f3','#120f25','#fdd7fb','#f5d5ef','#191129'],['#efe0c9','#32271d','#2b241d','#f4e7d2','#ead9be','#2b241d'],['#dce8e2','#223548','#172637','#ecf2ec','#d9e7e0','#213344'],['#1d132d','#ffb5e8','#11101f','#fbd0ee','#241331','#ffcaef'],['#d6c0a2','#241f1b','#211b17','#f1dec2','#d8bea0','#241f1b']];eq(KAIH_PALETTES.map(Object.values),paletteExpected);
for(const style of ['auto','black','white','emoji','none'])for(const corner of ['bottom-right','bottom-left','top-right']){const c={...newCase(),logoStyle:style,logoCorner:corner},e=caseElements({...set,case:c},71,60).find(e=>e.role==='logo');if(style==='none')eq(e,undefined);else eq([e.x,e.y,e.w,e.h,e.style],[corner==='bottom-left'?1.2:60.6,corner==='top-right'?1.2:53.8,12,5,style==='auto'?'white':style]);}
eq(logoColor('#ffffff','auto'),'black');eq(logoColor('#000000','auto'),'white');
for(const layout of KAIH_LAYOUTS){const e=caseElements({...set,case:{...newCase('kaih-jcard-68x64'),template:layout,titleBlock:false,jCardSpineInfo:false,spineTextOverride:'Custom Spine'}},68,64);eq(e.some(e=>e.role==='spine'),layout!=='kaih-image');if(layout==='kaih-image')eq(e.some(e=>e.role==='album'),false);if(layout==='kaih-background-tracks')ok(e.some(e=>e.role==='title-panel'));if(layout!=='kaih-image')eq(e.find(e=>e.role==='spine').text,'Custom Spine');}
const free={...set,case:{...newCase(),trackText:'  01  Exact time 3:20\r\n\n日本語\n  '}};eq(trackStrings(free),['01  Exact time 3:20','日本語']);eq(trackStrings(set).length,14);
const blank=caseElements({...set,album:'',artist:'',year:''},71,60);eq(blank.find(e=>e.role==='artist').text,' - ');
const draws=[],ctx={save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(){},drawImage(...a){draws.push(a);},measureText(s){return {width:s.length*2,actualBoundingBoxAscent:2,actualBoundingBoxDescent:.2};},fillText(...args){draws.push(args);},getTransform(){return {a:PPM,b:0};},setLineDash(){},moveTo(){},lineTo(){},stroke(){}};
const long={...set,album:'長いタイトル'.repeat(100),case:{...newCase(),trackText:Array.from({length:14},()=> 'Long title '.repeat(20)).join('\n')}};const info=paintKaih(ctx,long,71,60,{font:'test',art:{width:700,height:512},logo:{}});ok(info.truncated);eq(info.omitted,1);eq(info.rows.length,13);ok(draws.filter(a=>typeof a[0]==='string').every(a=>a.length===3),'no maxWidth/shrink');eq(draws.find(a=>a[0]===long.album)[0],long.album,'no elision/wrap');
for(const lang of LANGUAGES)for(const key of kaihKeys){ok(messages[lang][key]);eq([...messages[lang][key].matchAll(/\{(\w+)\}/g)].map(m=>m[1]),[...messages.en[key].matchAll(/\{(\w+)\}/g)].map(m=>m[1]));}
for(const template of ['tracks','legacy-track-table']){const old={profile:'kaih-case-71x60',template};const validated=validateCaseInterior(old);eq(validated.template,template);if(template==='tracks')eq(validated,old,'original persisted shape kept');}
for(const patch of [{font:'missing'},{caseBg:'bad'},{trackText:123},{logoCorner:'top-left'},{image:{type:'upload',data:'https://outside',name:'bad'}}]){assert.throws(()=>validateCaseInterior({...newCase(),...patch}));checks++;}
const fonts=JSON.parse(readFileSync(new URL('../assets/kaih/fonts.json',import.meta.url)));eq(Object.keys(fonts).length,15);for(const f of Object.values(fonts)){eq(createHash('sha256').update(readFileSync(new URL('../assets/kaih/'+f.file,import.meta.url))).digest('hex'),f.sha256);ok(readFileSync(new URL('../assets/kaih/'+f.licenseFile,import.meta.url),'utf8').includes('LICENSE'));}
writeFileSync(new URL('../../artifacts/case-label/kaih-unit-results.json',import.meta.url),JSON.stringify({status:'PASS',checks,scope:'Eight mm layouts, paint order, palettes, cover crop, J-card, logo styles/corners, no wrapping/elision, overflow, roundtrip/legacy, fonts and six-language coverage'},null,2));console.log(JSON.stringify({status:'PASS',checks}));
