export function bossSalePrice(item){
 if(item?.boss!==true||!Number.isInteger(item.level)||item.level<10||item.level>200||!Number.isInteger(item.slot)||item.slot<0||item.slot>8)return 0;
 if(item.level===200)return item.slot===0?200000000:100000000;
 const base=item.level<=100?Math.floor(item.level/10)*300000:item.level<=150?3000000+Math.floor((item.level-100)/10)*2000000:13000000+Math.floor((item.level-150)/10)*3000000;
 return base*(item.slot===0?2:1);
}
// Equipment-slot (preset) membership. The active slot is the live loadout.
export function gearPresetSlots(state,id,classId=state?.classId){
 const p=state?.gearPresets?.[classId],active=Number.isInteger(p?.active)?p.active:0,out=[];
 for(let i=0;i<3;i++){const saved=i===active&&classId===state?.classId?state.equipped:p?.list?.[i];if(saved&&Object.values(saved).includes(id))out.push(i+1);}
 return out;
}
export function inAnyGearPreset(state,id){
 const classes=new Set([state?.classId,...Object.keys(state?.gearPresets||{})]);
 for(const c of classes)if(gearPresetSlots(state,id,c).length)return true;
 return false;
}
export function bossSaleBlock(state,item){
 if(!item)return '장비를 찾을 수 없습니다.';
 if(!bossSalePrice(item))return '보스장비만 판매할 수 있어요.';
 if(state.battle||state.coopRoom||state.partyRoom)return '전투를 종료한 뒤 판매해 주세요.';
 if(Object.values(state.equipped||{}).includes(item.id))return '장착 중';
 if(inAnyGearPreset(state,item.id))return '장비 슬롯 등록';
 if(item.locked)return '잠금 장비';
 if(item.broken)return '파괴된 장비';
 if([state.pendingCube,state.pendingAddCube,state.pendingRefine].some(p=>p?.id===item.id))return '큐브 옵션 선택 중';
 return '';
}
