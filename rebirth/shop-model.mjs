export function bossSalePrice(item){
 if(item?.boss!==true||!Number.isInteger(item.level)||item.level<10||item.level>200||!Number.isInteger(item.slot)||item.slot<0||item.slot>8)return 0;
 return Math.floor(item.level/10)*(item.slot===0?100000:50000);
}
export function bossSaleBlock(state,item){
 if(!item)return '장비를 찾을 수 없습니다.';
 if(!bossSalePrice(item))return '보스장비만 판매할 수 있어요.';
 if(state.battle||state.coopRoom||state.partyRoom)return '전투를 종료한 뒤 판매해 주세요.';
 if(Object.values(state.equipped||{}).includes(item.id))return '장착 중';
 if(item.locked)return '잠금 장비';
 if(item.broken)return '파괴된 장비';
 if(state.pendingCube?.id===item.id)return '큐브 옵션 선택 중';
 return '';
}
