import {localeError} from './i18n.mjs';
import {CASE_PROFILE,SHEET_PRESETS} from './geometry.mjs';
import {validateTrackList,emptyTrackList} from './tracks.mjs';
const fail=()=>{throw localeError('caseInvalid');};
export function validateV3(data,legacyValidate){
 const v3=data?.schema==='md-studio-project/3';
 if(v3){if(!['compat','physical'].includes(data.mode)||!data.settings||typeof data.settings.calibrated!=='boolean'||!['measuredX','measuredY'].every(k=>typeof data.settings[k]==='number'&&Number.isFinite(data.settings[k]))||!Array.isArray(data.sets))fail();for(const s of data.sets){if(!s||!['w','h','sw','sh'].every(k=>typeof s[k]==='number'&&Number.isFinite(s[k]))||!['uppercase','hideHeader','hiMD'].every(k=>typeof s[k]==='boolean'))fail();}}
 const base=legacyValidate(v3?{...data,schema:'md-studio-project/2'}:data);
 const ids=new Set();base.sets=base.sets.map((set,i)=>{const raw=data.sets[i];const id=v3?raw?.id:'set-'+'ABCD'[i];if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(id)||ids.has(id))fail();ids.add(id);set.id=id;
 if(v3&&raw.case!==undefined){if(raw.case?.profile!==CASE_PROFILE.id||raw.case.template!=='tracks')fail();set.case={profile:CASE_PROFILE.id,template:'tracks'};}
 set.trackList=v3&&raw.trackList!==undefined?validateTrackList(raw.trackList):emptyTrackList();return set;});
 if(v3){const p=data.settings.sheetPreset;if(!['legacy-two','legacy-four',...Object.keys(SHEET_PRESETS)].includes(p))fail();base.settings.sheetPreset=p;
 const refs=data.settings.labelAssignments;if(!Array.isArray(refs)||refs.length>200)fail();base.settings.labelAssignments=refs.map(r=>{if(!ids.has(r?.setId)||!['front','spine','case'].includes(r.kind)||!Number.isInteger(r.copyIndex)||r.copyIndex<0||r.copyIndex>199)fail();if(r.kind==='case'&&!base.sets.find(s=>s.id===r.setId).case)fail();return {setId:r.setId,kind:r.kind,copyIndex:r.copyIndex};});
 if(SHEET_PRESETS[p]&&(refs.length!==SHEET_PRESETS[p].length||refs.some((r,i)=>r.kind!==SHEET_PRESETS[p][i][0])))fail();
 }else{base.settings.sheetPreset=base.settings.setCount===2?'legacy-two':'legacy-four';base.settings.labelAssignments=[];}
 return base;
}
