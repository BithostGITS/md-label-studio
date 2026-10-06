import {validateCaseInterior,CASE_TEMPLATES} from './kaih-case.mjs';
import {localeError} from './i18n.mjs';
import {CASE_PROFILE,CASE_PROFILES,defaultAssignments,presetManifest} from './geometry.mjs';
import {validateTrackList,emptyTrackList} from './tracks.mjs';
const fail=()=>{throw localeError('caseInvalid');};
// Removed preset IDs and shapes are recognized ONLY at this import boundary.
const oldShapes={'legacy-two':[], 'legacy-four':[], 'case-only':['case','case'], 'mixed-compact':['case','front','front','spine','spine','spine','spine'], 'easier-cutting':['case','front','front','spine','spine','spine']};
function reviewRecord(v){if(!v||typeof v.reviewed!=='boolean'||typeof v.includesCD!=='boolean'||typeof v.changedSet!=='boolean'||!['beforeCount','afterCount','removedCount'].every(k=>Number.isInteger(v[k])&&v[k]>=0&&v[k]<=200)||![3,8].includes(v.afterCount))fail();return {beforeCount:v.beforeCount,afterCount:v.afterCount,removedCount:v.removedCount,reviewed:v.reviewed,includesCD:v.includesCD,changedSet:v.changedSet};}
export function validateV3(data,legacyValidate){
 const version=Number(/^md-studio-project\/([1-4])$/.exec(data?.schema||'')?.[1]);if(!version)fail();const modern=version>=3;
 if(modern){if(!['compat','physical'].includes(data.mode)||!data.settings||typeof data.settings.calibrated!=='boolean'||!['measuredX','measuredY'].every(k=>typeof data.settings[k]==='number'&&Number.isFinite(data.settings[k]))||!Array.isArray(data.sets))fail();for(const s of data.sets){if(!s||!['w','h','sw','sh'].every(k=>typeof s[k]==='number'&&Number.isFinite(s[k]))||!['uppercase','hideHeader','hiMD'].every(k=>typeof s[k]==='boolean'))fail();}}
 const base=legacyValidate(modern?{...data,schema:'md-studio-project/2'}:data);
 const ids=new Set();base.sets=base.sets.map((set,i)=>{const raw=data.sets[i];const id=modern?raw?.id:'set-'+'ABCD'[i];if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(id)||ids.has(id))fail();ids.add(id);set.id=id;
 if(modern&&raw.case!==undefined){if((version===3?raw.case?.profile!==CASE_PROFILE.id:!Object.hasOwn(CASE_PROFILES,raw.case?.profile))||!CASE_TEMPLATES.includes(raw.case.template))fail();try{set.case=validateCaseInterior(raw.case);}catch{fail();}}
 set.trackList=modern&&raw.trackList!==undefined?validateTrackList(raw.trackList):emptyTrackList();return set;});
 if(version===4){const cfg=data.settings;if(!['legacy-four','case-set'].includes(cfg.sheetPreset)||cfg.setCount!==4||!ids.has(cfg.sheetSetId))fail();base.settings={...base.settings,setCount:4,sheetPreset:cfg.sheetPreset,sheetSetId:cfg.sheetSetId};
 if(cfg.labelAssignments!==undefined){if(!Array.isArray(cfg.labelAssignments))fail();const expected=cfg.sheetPreset==='case-set'?defaultAssignments(base.sets,'case-set',cfg.sheetSetId):[];if(cfg.labelAssignments.length!==expected.length||cfg.labelAssignments.some((r,i)=>r?.setId!==expected[i].setId||r.kind!==expected[i].kind||r.copyIndex!==0))fail();}
 if(cfg.sheetPreset==='case-set'&&!base.sets.find(s=>s.id===cfg.sheetSetId).case)fail();
 if(cfg.layoutMigration!==undefined)base.settings.layoutMigration=reviewRecord(cfg.layoutMigration);
 }else{
 const p=version===3?data.settings.sheetPreset:base.settings.setCount===2?'legacy-two':'legacy-four';if(!Object.hasOwn(oldShapes,p))fail();let refs=[];
 if(version===3){const raw=data.settings.labelAssignments;if(!Array.isArray(raw)||raw.length>200)fail();refs=raw.map(r=>{if(!ids.has(r?.setId)||!['front','spine','case'].includes(r.kind)||!Number.isInteger(r.copyIndex)||r.copyIndex<0||r.copyIndex>199)fail();if(r.kind==='case'&&!base.sets.find(s=>s.id===r.setId).case)fail();return {setId:r.setId,kind:r.kind,copyIndex:r.copyIndex};});const shape=oldShapes[p];if(shape.length&&(refs.length!==shape.length||refs.some((r,i)=>r.kind!==shape[i])))fail();}
 const withCase=oldShapes[p].length>0,chosen=withCase?refs.find(r=>r.kind==='case').setId:base.sets[0].id;
 const beforeCount=withCase?refs.length:p==='legacy-two'?4:8,afterCount=withCase?3:8;
 base.settings={...base.settings,setCount:4,sheetPreset:withCase?'case-set':'legacy-four',sheetSetId:chosen};
 if(p!=='legacy-four')base.settings.layoutMigration={beforeCount,afterCount,removedCount:p==='case-only'?1:Math.max(0,beforeCount-afterCount),reviewed:false,includesCD:p==='legacy-two',changedSet:withCase&&refs.some(r=>r.setId!==chosen)};
 }
 // References are derived, never mutable label/copy assignments. Geometry failures
 // remain explicit export gates so imports cannot discard saved custom/calibration values.
 base.schema='md-studio-project/4';
 delete base.settings.labelAssignments;
 return base;
}
