import {skillLookById} from './skill-looks.mjs';
// Client-only art revisions preserve purchased item IDs and combat rules.
const revised=Object.freeze({
 'warrior-dark':{revision:4,previewColumn:0,identity:'흑룡의 뿔 대검과 용두 투사체, 날개 모양 검격이 폭발하는 검무'},
 'warrior-fallen':{revision:4,previewColumn:0,identity:'사슬에 묶인 처형 대검과 철제 단두대가 내려치는 검무'},
 'mage-dark':{revision:4,previewColumn:0,identity:'심연의 눈이 열리며 마안 투사체와 검은 균열을 펼치는 마법'},
 'mage-fallen':{revision:4,previewColumn:0,identity:'이빨 달린 금서와 찢긴 저주 문서가 폭주하는 마법'},
 'archer-dark':{revision:4,previewColumn:0,identity:'까마귀 날개 활과 은빛 깃 화살, 검은 새떼가 휘몰아치는 사격'},
 'archer-fallen':{revision:4,previewColumn:0,identity:'악마의 뿔 석궁과 가시 볼트가 타락의 낙인을 새기는 사격'},
 'rogue-dark':{revision:4,previewColumn:0,identity:'해골 손잡이 쌍단검과 망령의 잔상이 교차하는 암살'},
 'rogue-fallen':{revision:4,previewColumn:0,identity:'거미 다리 갈고리 칼날과 혈독 거미줄이 터지는 암살'},
 'pirate-dark':{revision:4,previewColumn:0,identity:'찢긴 돛의 유령 함대와 해골 함포, 영혼 포탄의 포격'},
 'pirate-fallen':{revision:4,previewColumn:0,identity:'크라켄 촉수 함포와 심해 탄환이 붉은 소용돌이를 터뜨리는 포격'},
 'priest-dark':{revision:4,previewColumn:2,identity:'검은 성당의 첨탑과 깨진 스테인드글라스, 망령 성녀의 기도'},
 'priest-fallen':{revision:4,previewColumn:2,identity:'해골 성물과 붉은 촛불 제단, 뼈 날개가 펼쳐지는 계시'},
 'galaxy-waltz':{revision:3,color:'#ff70d9',light:'#83efff',previewColumn:0,identity:'나선 은하와 성운 혜성'},
 'violet-moon':{revision:3,color:'#b192ff',light:'#f1e5ff',previewColumn:0,identity:'가면과 쌍초승달 칼날'},
 'dawn-seraph':{revision:3,color:'#ffadbd',light:'#fff2df',previewColumn:2,identity:'여섯 날개와 분홍 여명'},
 'pearl-tide':{revision:3,color:'#ff8e98',light:'#c6fff5',previewColumn:2,identity:'가리비 조개·진주·붉은 산호'},
 'peacock-plume':{revision:3,color:'#39c9e7',light:'#dca3ff',previewColumn:0,identity:'사파이어 눈무늬 공작 깃'},
 'starlit-deer':{revision:3,color:'#c5dcff',light:'#f0f8ff',previewColumn:0,identity:'은빛 가지뿔과 숲의 별빛'},
});
// New dark/fallen themes own their painted atlases; purchased IDs stay stable.
export const skillLookBaseId=id=>id;
export function skillLookDesign(id){const look=skillLookById(id);return {...{revision:2,color:look?.color,light:look?.light,previewColumn:0,identity:look?.description},...revised[id]};}
export const skillLookArtPath=id=>`skill-looks/${skillLookBaseId(id)}-native-v${skillLookDesign(id).revision}.webp`;
export const skillLookPreviewPath=id=>`skill-looks/${skillLookBaseId(id)}-preview-v${skillLookDesign(id).revision}.webp`;
