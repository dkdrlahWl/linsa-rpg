import {skillLookById} from './skill-looks.mjs';
// Client-only art revisions preserve purchased item IDs and combat rules.
const revised=Object.freeze({
 'galaxy-waltz':{revision:3,color:'#ff70d9',light:'#83efff',previewColumn:0,identity:'나선 은하와 성운 혜성'},
 'violet-moon':{revision:3,color:'#b192ff',light:'#f1e5ff',previewColumn:0,identity:'가면과 쌍초승달 칼날'},
 'dawn-seraph':{revision:3,color:'#ffadbd',light:'#fff2df',previewColumn:2,identity:'여섯 날개와 분홍 여명'},
 'pearl-tide':{revision:3,color:'#ff8e98',light:'#c6fff5',previewColumn:2,identity:'가리비 조개·진주·붉은 산호'},
 'peacock-plume':{revision:3,color:'#39c9e7',light:'#dca3ff',previewColumn:0,identity:'사파이어 눈무늬 공작 깃'},
 'starlit-deer':{revision:3,color:'#c5dcff',light:'#f0f8ff',previewColumn:0,identity:'은빛 가지뿔과 숲의 별빛'},
});
const darkSources=Object.freeze({warrior:'moon-swan',mage:'galaxy-waltz',archer:'sakura-breeze',rogue:'violet-moon',pirate:'pearl-tide',priest:'dawn-seraph'});
export function skillLookBaseId(id){const look=skillLookById(id);return /-(dark|fallen)$/.test(id)&&look?darkSources[look.classId]:id;}
export function skillLookPalette(id){return id.endsWith('-dark')?['#100b24','#40205d','#9765e8','#d8e2ff']:id.endsWith('-fallen')?['#180815','#64152e','#e64068','#ffe0bd']:null;}
export const skillLookPreviewFilter=id=>id.endsWith('-dark')?'grayscale(1) sepia(1) saturate(4) hue-rotate(205deg) brightness(.78) contrast(1.2)':id.endsWith('-fallen')?'grayscale(1) sepia(1) saturate(5) hue-rotate(305deg) brightness(.85) contrast(1.2)':'none';
export function skillLookDesign(id){const look=skillLookById(id),base=skillLookBaseId(id);if(base!==id)return {...skillLookDesign(base),color:look.color,light:look.light,identity:look.description};return {...{revision:2,color:look?.color,light:look?.light,previewColumn:0,identity:look?.description},...revised[id]};}
export const skillLookArtPath=id=>`skill-looks/${skillLookBaseId(id)}-native-v${skillLookDesign(id).revision}.webp`;
export const skillLookPreviewPath=id=>`skill-looks/${skillLookBaseId(id)}-preview-v${skillLookDesign(id).revision}.webp`;
