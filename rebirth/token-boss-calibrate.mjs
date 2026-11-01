// 토큰 던전 1~3단계 체력 맞추기.
// 1) DB에서 기준 캐릭터 상태를 JSON으로 뽑는다:
//    select jsonb_object_agg(name, state) from rebirth_private.players where name in ('키야','민당','도현');
// 2) node rebirth/token-boss-calibrate.mjs players.json
// 기준: 1단계 키야, 2단계 민당, 3단계 도현(장비 프리셋 2번). 60초 동안 제자리 풀딜(rotation) × 0.75를 체력으로 잡는다.
// (실전은 패턴 회피로 딜이 빠지므로 25% 여유) 4~10단계는 3단계에서 1.4배씩.
import {readFileSync} from 'node:fs';
import {rotation} from './class-dps-sim.mjs';
const MARGIN=.75,STEP=1.4,SECONDS=60;
const file=process.argv[2];if(!file){console.error('usage: node token-boss-calibrate.mjs players.json');process.exit(1);}
const states=JSON.parse(readFileSync(file,'utf8'));
const withPreset=(s,index)=>{const p=s.gearPresets?.[s.classId];const set=p?.list?.[index];if(!set)throw Error('preset '+(index+1)+' 없음');return {...s,equipped:{...set}};};
const refs=[['키야',s=>s],['민당',s=>s],['도현',s=>withPreset(s,1)]];
const hp=refs.map(([name,f])=>{const s=states[name];if(!s)throw Error(name+' 상태 없음');const dps=rotation(f(structuredClone(s)),SECONDS);console.log(name,'DPS',Math.round(dps).toLocaleString(),'→ 60초',Math.round(dps*SECONDS).toLocaleString());return Math.round(dps*SECONDS*MARGIN/1e6)*1e6;});
for(let i=3;i<10;i++)hp.push(Math.round(hp[i-1]*STEP/1e6)*1e6);
console.log('const HP=['+hp.map(h=>h.toExponential(2).replace('e+','e')).join(',')+'];');
