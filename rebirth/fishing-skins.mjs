// All skins use the same six-pose, 3×2 atlas as the original angler.
const tips=[[.7768,.26066],[.08211,.19328],[.8484,.28434],[.77832,.30133],[.89715,.4316],[.64426,.25438]];
export const FISHING_SKINS=Object.freeze([
 {id:'default',name:'별빛 낚시 여행자',art:'angler-poses-v2',text:'처음 함께한 작은 모험가'},
 {id:'sakura',name:'벚꽃 정원의 엘프',art:'angler-sakura',text:'꽃잎과 함께 물가를 찾는 숲의 요정'},
 {id:'captain',name:'푸른 바다의 캡틴',art:'angler-captain',text:'먼바다를 누비는 씩씩한 선장'},
 {id:'witch',name:'별빛 고양이 마녀',art:'angler-witch',text:'달빛 아래 별을 낚는 고양이 마녀'},
 {id:'ranger',name:'숲속 여우 탐험가',art:'angler-ranger',text:'비밀 낚시터를 찾아다니는 여우 탐험가'},
 {id:'princess',name:'진주빛 용궁 공주',art:'angler-princess',text:'산호와 진주를 두른 바다의 공주'},
].map(x=>Object.freeze({...x,seat:[.42,.82],tips})));
export const fishingSkin=id=>FISHING_SKINS.find(x=>x.id===id)||FISHING_SKINS[0];
