// Shared with the authenticated server. Fish use gold; bait bundles use diamonds. Weight is grams.
export const FISHING_VERSION=3; // 2026-11-05 낚시 v3: 토큰 경제·낚싯대 Lv.50·강화·인챈트·크기·돌연변이·합성
// 낚싯대 최대 레벨: 확장 시 여기만 수정 (rodGoldCost/rodDiamondCost 표도 같이 늘릴 것).
export const ROD_MAX=20; // 2026-11-06 도현: 낚싯대 20종 (빙하 협만 17 · 은하 수해 19) // 2026-11-05 도현: 강화 삭제 → 낚싯대 16종(토큰+다이아 구매), 낚시터 하나당 2종
// 하루 낚시(찌 던지기) 상한, 한국 시간 자정 초기화.
export const FISHING_DAILY_CASTS=600;
// 2026-11-05 도현: 어부는 하루 1,000회
export const FISHER_DAILY_CASTS=1000;
// 2026-11-05 도현: 물고기 가방 150칸, 어부는 300칸
export const fishBagSize=s=>s?.profession?.id==='fisher'?300:150;
export const fishingDailyCasts=s=>s?.profession?.id==='fisher'?FISHER_DAILY_CASTS:FISHING_DAILY_CASTS;
// Gold-income rebalance (2026-10-11): every successful cast catches. value = grade multiplier, spot scale = price per grade unit.
export const RARITIES=[{name:'일반',color:'#d8e7d1',gate:1,value:1},{name:'희귀',color:'#8de6ad',gate:1,value:3},{name:'레어',color:'#74caff',gate:10,value:9},{name:'에픽',color:'#cf9cff',gate:20,value:30},{name:'전설',color:'#ffd477',gate:35,value:120},{name:'신화',color:'#ff95c8',gate:45,value:240},{name:'태고',color:'#7ff6ff',gate:70,value:600}];
export const SPOTS=[
 {id:'brook',bonus:1,luck:1,name:'숲속 여울',level:1,depth:1,special:{},specialText:'',subtitle:'햇살이 머무는 작은 숲',accent:'#a6edac'},
 {id:'moon',bonus:1.15,luck:1.6,name:'달빛 호수',level:3,depth:8,special:{},specialText:'',subtitle:'달의 조각이 잠든 물결',accent:'#a4cbff'},
 {id:'canyon',bonus:1.3,luck:1.7,name:'단풍 협곡',level:5,depth:15,special:{},specialText:'',subtitle:'붉은 잎 사이 흐르는 비밀',accent:'#ffc891'},
 {id:'coral',bonus:1.45,luck:1.8,name:'산호 해안',level:7,depth:22,special:{},specialText:'',subtitle:'노을빛 바다의 보물',accent:'#8cf0e7'},
 {id:'abyss',bonus:1.6,luck:1.9,name:'천상의 심해',level:9,depth:29,special:{},specialText:'',subtitle:'별과 바다가 만나는 끝',accent:'#d8a6ff'},
 // 2026-10-25: 낚싯대 70 확장. 용궁 해구 Lv.50, 불꽃 열수해 Lv.60, 태고의 바다 Lv.70 (태고 등급은 태고의 바다에서만).
 {id:'palace',bonus:1.65,tank:1.25,luck:1.95,name:'용궁 해구',level:11,depth:36,special:{},specialText:'',subtitle:'용왕의 궁전이 잠든 바다',accent:'#ffb3a1'},
 {id:'volcano',bonus:1.7,tank:1.5,luck:2,name:'불꽃 열수해',level:13,depth:43,special:{},specialText:'',subtitle:'바다 밑 화산이 숨 쉬는 곳',accent:'#ff8a5a'},
 {id:'origin',bonus:1.75,tank:1.8,luck:2.05,name:'태고의 바다',level:15,depth:50,special:{},specialText:'',subtitle:'세상이 처음 태어난 물결',accent:'#7ff6ff'},
 // 2026-11-06 도현: 새 낚시터 2곳 — 빙하 협만(17단계) · 은하 수해(19단계).
 {id:'glacier',bonus:1.8,tank:2.1,luck:2.1,name:'빙하 협만',level:17,depth:62,special:{},specialText:'',subtitle:'오로라 아래 얼어붙은 바다',accent:'#bfe9ff'},
 {id:'galaxy',bonus:1.85,tank:2.4,luck:2.15,name:'은하 수해',level:19,depth:74,special:{},specialText:'',subtitle:'별이 흐르는 하늘의 바다',accent:'#ffc8ff'},
];
const rows=[
 ['brook','풀잎 피라미',0,80,300,'leaf green minnow with gold fins'],['brook','은빛 송사리',0,20,120,'tiny silver ricefish with pale green fins'],['brook','조약돌 망둑어',0,100,450,'round speckled stone goby'],['brook','햇살 붕어',0,250,1500,'warm golden crucian carp'],['brook','산들 메기',0,400,2500,'cute moss grey catfish with flowing whiskers'],['brook','꽃잎 잉어',0,300,2000,'pink white koi with petal shaped fins'],['brook','이끼 비늘어',1,400,2500,'emerald moss scaled fish'],['brook','청금 송어',1,700,3500,'turquoise trout with golden flecks'],['brook','반딧불 버들치',1,120,800,'willow minnow with luminous yellow speckles'],['brook','수련 베타',1,100,600,'jade pink betta with lotus petal fins'],
 ['moon','달그림자 빙어',0,50,350,'silver blue smelt'],['moon','푸른 지느러미어',0,200,1100,'blue fin lake perch'],['moon','물방울 정어리',0,80,500,'rounded pale blue sardine'],['moon','밤안개 장어',0,400,2200,'deep blue eel with silver stripe'],['moon','유리 비늘어',1,150,1000,'translucent glass scaled blue fish'],['moon','초승달 붕어',1,600,3000,'navy silver crescent marked carp'],['moon','진주 가시어',1,200,1200,'pearl white fish with violet spines'],['moon','달꽃 구라미',1,250,1800,'lavender gourami with moonflower fins'],['moon','월광 나비어',2,600,3500,'luminous sapphire butterfly fish'],['moon','별무늬 철갑어',2,2000,14000,'silver sturgeon with constellation specks'],
 ['canyon','단풍 피라미',0,100,500,'orange red minnow'],['canyon','노을 농어',0,500,3000,'amber sunset perch'],['canyon','황토 메기',1,800,5000,'rust brown gold catfish'],['canyon','호박빛 잉어',1,700,4000,'amber gemstone scaled koi'],['canyon','홍엽 송어',1,600,3500,'crimson trout with leaf shaped fins'],['canyon','협곡 칼날어',2,1000,6500,'copper fish with sharp blade shaped dorsal fin'],['canyon','비단 리본어',2,700,4500,'red gold ribbon fish with flowing silk fins'],['canyon','불씨 복어',2,300,1600,'round orange puffer with glowing ember freckles'],['canyon','백금 연어',2,1500,9000,'platinum salmon with red accents'],['canyon','홍련 용어',3,3000,18000,'small crimson dragon fish with flowing golden horns'],
 ['coral','산호 앵무어',0,800,5000,'vivid coral pink turquoise parrotfish'],['coral','파도 돛새치',2,4000,24000,'teal sailfish with ocean blue sail'],['coral','자수정 해마',0,100,650,'amethyst purple jeweled seahorse'],['coral','오팔 가오리',1,1500,10000,'opal rainbow spotted stingray'],['coral','태양 산호어',2,1500,9000,'golden solar fish with coral branching fins'],['coral','청옥 만타',3,5000,35000,'jade turquoise manta ray'],['coral','인어의 진주어',1,1200,7500,'iridescent pearl fish with long flowing white fins'],['coral','폭풍 창꼬치',3,3000,20000,'dark turquoise barracuda with electric gold fins'],['coral','무지개 해룡',3,2000,14000,'iridescent rainbow sea dragon'],['coral','황금 왕관고래',4,12000,90000,'majestic small gold whale with coral crown'],
 ['abyss','별빛 아귀',0,1500,10000,'indigo anglerfish with glowing star lure'],['abyss','오로라 유령어',0,1000,7000,'translucent violet aurora fish'],['abyss','공허 문어',1,3000,24000,'cute cosmic purple octopus with star markings'],['abyss','천공 수정어',1,2000,16000,'icy celestial crystal scaled fish'],['abyss','달의 수호룡',3,10000,65000,'silver blue moon guardian sea dragon'],['abyss','태고의 황제어',2,9000,60000,'ancient imperial indigo fish with gold armor scales'],['abyss','성운 날개가오리',2,8000,55000,'nebula violet manta with angel wing fins'],['abyss','심연의 왕관상어',4,14000,100000,'deep purple shark with luminous crystalline crown'],['abyss','천해의 별고래',5,35000,240000,'mythical celestial star whale, sapphire gold, galaxy wings'],['abyss','영원의 백룡',5,25000,180000,'mythical elegant white sea dragon, luminous pink gold flowing fins'],
 ['palace','산호 꼬마복어',0,300,2000,'tiny coral pink pufferfish with pearl spots'],['palace','물결 은갈치',0,800,5000,'long silver ribbon cutlassfish with wave patterns'],['palace','청자 거북복',1,1200,8000,'celadon jade boxfish with crackle glaze pattern'],['palace','용궁 시녀어',1,900,6000,'elegant red and gold fish with flowing hanbok like fins'],['palace','진주 조개어',2,2500,15000,'pearl white fish holding a glowing pearl between clam shaped fins'],['palace','홍산호 도미',2,4000,26000,'crimson coral sea bream with golden scales'],['palace','청룡 비늘어',3,8000,50000,'azure dragon scaled fish with jade whiskers'],['palace','용왕의 호위상어',3,15000,90000,'armored royal guard shark with golden helmet fins'],['palace','여의주 해룡',4,20000,130000,'majestic sea dragon holding a glowing wish pearl'],['palace','용왕 금린어',5,45000,300000,'mythical dragon king giant fish with golden scales and a coral crown'],
 ['volcano','용암 피라미',0,600,3500,'tiny lava minnow with glowing orange cracks'],['volcano','흑요석 망둑어',0,1000,6000,'black obsidian goby with ember eyes'],['volcano','유황 해파리어',1,1500,9000,'yellow sulfur jellyfish like fish with glowing tendrils'],['volcano','화산재 메기',1,2500,15000,'ash grey catfish with smoldering whiskers'],['volcano','불꽃 날치',2,3000,18000,'flying fish with flame wings'],['volcano','마그마 거북',2,8000,50000,'small sea turtle with a glowing magma shell'],['volcano','홍염 랍스터어',3,10000,60000,'crimson flame lobster fish with molten claws'],['volcano','화염비늘 상어',3,20000,120000,'shark with burning ember scales'],['volcano','불사조 가오리',4,30000,200000,'phoenix manta ray with fiery feather wings'],['volcano','화산신 이프리트어',5,55000,350000,'mythical fire god fish with a crown of lava and golden flames'],
 ['origin','원시 화석어',0,1500,9000,'ancient armored fossil fish with stone plates'],['origin','호박빛 투명어',1,2000,12000,'translucent fish glowing like amber'],['origin','고대 앵무조개',1,3000,18000,'ancient nautilus with golden spiral shell'],['origin','시간의 비늘어',2,6000,35000,'fish with clock like silver scales and glowing runes'],['origin','태초 물결가오리',2,10000,60000,'primordial ray with aurora wave wings'],['origin','창세의 고래상어',3,25000,150000,'genesis whale shark with starry spots'],['origin','별을 삼킨 리바이어던',4,40000,260000,'cosmic leviathan with a galaxy belly'],['origin','태양을 품은 해룡',5,60000,380000,'mythical sea dragon carrying a radiant sun orb'],['origin','태고의 세계어',6,120000,800000,'primordial world fish with tiny islands and forests on its back, cosmic aura'],['origin','시원의 백금룡',6,100000,650000,'primordial platinum dragon of creation with prismatic aura'],
 // 2026-11-06 도현: 빙하 협만 · 은하 수해
 ['glacier','서리 빙어',0,2000,12000,'frost white smelt with ice crystal fins'],['glacier','유빙 펭귄어',1,3000,18000,'round penguin-like fish with black and white scales'],['glacier','청빙 대구',1,4000,24000,'pale blue ice cod with frosted scales'],['glacier','오로라 연어',2,8000,45000,'salmon with shimmering aurora green and pink stripes'],['glacier','빙결 일각어',2,13000,80000,'narwhal-like fish with a crystal ice horn'],['glacier','설원 바다표범어',3,32000,190000,'seal-shaped silver fish with snowy fur'],['glacier','극야의 얼음고래',4,52000,330000,'ice whale glowing under the polar night'],['glacier','빙하를 깨는 해룡',5,78000,480000,'white ice sea dragon breaking glaciers'],['glacier','만년설 세계어',6,155000,1000000,'colossal ancient fish covered in eternal snow'],['glacier','오로라 백금 리바이어던',6,130000,850000,'platinum leviathan wrapped in aurora light'],
 ['galaxy','별사탕 피라미',0,2500,15000,'tiny minnow made of pastel star candy'],['galaxy','성운 금붕어',1,4000,24000,'goldfish with a nebula pink and purple tail'],['galaxy','달토끼 복어',1,5000,30000,'cute pufferfish with rabbit-ear fins and moon spots'],['galaxy','토성 고리가오리',2,10000,60000,'manta ray circled by saturn rings'],['galaxy','은하수 장어',2,16000,100000,'long eel made of the flowing milky way'],['galaxy','초신성 상어',3,40000,240000,'shark bursting with supernova light'],['galaxy','블랙홀 아귀',4,65000,420000,'anglerfish with a tiny black hole lure'],['galaxy','성좌의 수호룡',5,100000,600000,'constellation dragon with a star-linked body'],['galaxy','창조의 은하고래',6,200000,1300000,'whale with a spiral galaxy inside its body'],['galaxy','무한의 별고래',6,170000,1100000,'infinite starlight whale with a golden halo'],
 // 2026-11-06 도현: 시간대(한국시간 새벽 5~8시 · 밤 19~5시)·날씨(3시간마다 바뀜) 물고기 — 조건이 맞을 때만 나온다.
 ['brook','반딧불 송사리',2,60,400,'tiny minnow glowing like a firefly',{time:'night'}],['brook','빗방울 무지개송어',3,800,4500,'rainbow trout with raindrop shaped scales',{weather:'rain'}],
 ['moon','새벽별 은어',2,300,1800,'sweetfish with a morning star mark',{time:'dawn'}],['moon','월광 해파리어',3,600,3500,'moonlit jellyfish fish with silver bell',{time:'night'}],
 ['canyon','천둥 협곡메기',3,3000,18000,'catfish crackling with thunder',{weather:'storm'}],['canyon','여명 단풍잉어',2,1500,9000,'koi glowing with dawn maple colors',{time:'dawn'}],
 ['coral','폭풍 청새치',3,8000,48000,'marlin riding a storm wave',{weather:'storm'}],['coral','별똥 불가사리어',4,4000,26000,'starfish shaped fish trailing shooting stars',{weather:'meteor'}],
 ['abyss','유성 해룡어',4,20000,130000,'sea dragon fish lit by falling meteors',{weather:'meteor'}],['abyss','심야 그림자장어',3,9000,55000,'shadow eel visible only at midnight',{time:'night'}],
 ['palace','빗속 진주조개어',3,6000,38000,'clam fish holding a rain pearl',{weather:'rain'}],['palace','용궁 새벽잉어',4,22000,140000,'golden dawn koi of the dragon palace',{time:'dawn'}],
 ['volcano','뇌운 불꽃상어',4,35000,220000,'flame shark inside a thunder cloud',{weather:'storm'}],['volcano','밤의 흑염 가오리',5,60000,380000,'black flame manta of the night',{time:'night'}],
 ['origin','유성우 시원고래',5,70000,420000,'primordial whale under a meteor shower',{weather:'meteor'}],['origin','여명의 태고룡',6,130000,850000,'ancient dragon awakening at dawn',{time:'dawn'}],
 ['glacier','오로라 얼음고래',5,85000,520000,'ice whale dancing in aurora',{time:'night'}],['glacier','눈보라 서리상어',4,55000,350000,'frost shark in a blizzard',{weather:'storm'}],
 ['galaxy','혜성 꼬리별어',6,190000,1200000,'fish with a long glowing comet tail',{weather:'meteor'}],['galaxy','새벽 은하해마',5,90000,560000,'galactic seahorse glowing at dawn',{time:'dawn'}],
 // 2026-11-06 도현: 보스 물고기 트로피 — 보스를 잡은 참가자만 받는다 (일반 낚시로는 안 나옴).
 ['brook','심해의 대왕 크라켄',6,500000,3000000,'giant ancient kraken boss',{boss:0}],['brook','폭풍을 부르는 용왕고래',6,600000,3600000,'storm calling dragon king whale boss',{boss:1}],['brook','별을 삼킨 고대 해룡왕',6,700000,4200000,'ancient sea dragon king that swallowed stars boss',{boss:2}],
];
// 2026-11-05 도현: 낚시터별 특기(버프) 삭제 — 낚시터 차이는 물고기 종류·등급뿐.
// v3: 물고기는 낚시터가 열리면 등급 상관없이 전부 나온다 (등급 관문 없음). level = 필요한 낚싯대 단계(1~8), depth = 손맛 난이도 기준.
export const FISH=rows.map(([spot,name,rarity,min,max,art,cond],i)=>({id:'fish-'+String(i+1).padStart(2,'0'),spot,name,rarity,min,max,art,level:SPOTS.find(s=>s.id===spot).level,...(cond?{cond}:{})}));
// ── 2026-11-06 도현: 시간대·날씨 ── 한국시간. 날씨는 3시간마다 바뀌고 모든 낚시터가 같은 날씨.
const kstDate=now=>new Date(Number(now)+9*3600000);
export const FISHING_TIMES=Object.freeze([{id:'dawn',name:'새벽',icon:'🌅',text:'05~08시'},{id:'day',name:'낮',icon:'🌤️',text:'08~19시'},{id:'night',name:'밤',icon:'🌙',text:'19~05시'}]);
export const fishingTimeOf=now=>{const h=kstDate(now).getUTCHours();return h>=5&&h<8?'dawn':h>=8&&h<19?'day':'night';};
export const WEATHERS=Object.freeze([{id:'clear',name:'맑음',icon:'☀️',p:.45},{id:'rain',name:'비',icon:'🌧️',p:.3},{id:'storm',name:'폭풍',icon:'⛈️',p:.15},{id:'meteor',name:'유성우',icon:'🌠',p:.1}]);
export const WEATHER_BLOCK_MS=3*3600000;
const weatherHash=n=>{let x=(n*2654435761)>>>0;x^=x>>>16;x=Math.imul(x,2246822519)>>>0;x^=x>>>13;x=Math.imul(x,3266489917)>>>0;x^=x>>>16;return (x>>>0)/4294967296;};
export const fishingWeatherAt=block=>{let r=weatherHash(block+7919);for(const w of WEATHERS){r-=w.p;if(r<0)return w;}return WEATHERS[0];};
export const fishingWeather=now=>fishingWeatherAt(Math.floor((Number(now)+9*3600000)/WEATHER_BLOCK_MS));
export const fishingWeatherEndsAt=now=>(Math.floor((Number(now)+9*3600000)/WEATHER_BLOCK_MS)+1)*WEATHER_BLOCK_MS-9*3600000;
export const fishCondText=d=>!d?.cond?'':d.cond.boss!=null?'보스 처치 보상':d.cond.time?(t=>t.icon+' '+t.name+'('+t.text+')에만')(FISHING_TIMES.find(x=>x.id===d.cond.time)):(w=>w.icon+' '+w.name+' 올 때만')(WEATHERS.find(x=>x.id===d.cond.weather));
export const fishAvailable=(d,now)=>!d.cond||(d.cond.boss==null&&(!d.cond.time||d.cond.time===fishingTimeOf(now))&&(!d.cond.weather||d.cond.weather===fishingWeather(now).id));
// ── 2026-11-06 도현: 보스 물고기 ── 매일 13·19·22시(한국시간) 30분 동안 '거대한 그림자'. 손맛으로 잡을 때마다 공동 체력을 깎는다.
export const FISH_BOSS_HOURS=Object.freeze([13,19,22]),FISH_BOSS_MS=30*60000,FISH_BOSS_HP_PER_PLAYER=900,FISH_BOSS_MIN_HITS=10,FISH_BOSS_DIAMONDS=30,FISH_BOSS_TOKEN_CASTS=150;
export const FISH_BOSSES=Object.freeze(FISH.filter(x=>x.cond?.boss!=null).sort((a,b)=>a.cond.boss-b.cond.boss).map(x=>Object.freeze({kind:x.cond.boss,name:x.name,species:x.id})));
export function fishBossWindow(now){
 const k=kstDate(now),day=Date.UTC(k.getUTCFullYear(),k.getUTCMonth(),k.getUTCDate()),dayIndex=Math.floor(day/86400000);
 for(let i=0;i<FISH_BOSS_HOURS.length;i++){const startsAt=day+FISH_BOSS_HOURS[i]*3600000-9*3600000;if(now>=startsAt&&now<startsAt+FISH_BOSS_MS)return {id:new Date(day).toISOString().slice(0,10)+'-'+FISH_BOSS_HOURS[i],kind:(dayIndex*FISH_BOSS_HOURS.length+i)%FISH_BOSSES.length,startsAt,endsAt:startsAt+FISH_BOSS_MS};}
 return null;
}
export function nextFishBoss(now){
 const k=kstDate(now),day=Date.UTC(k.getUTCFullYear(),k.getUTCMonth(),k.getUTCDate());
 for(let d=0;d<2;d++)for(let i=0;i<FISH_BOSS_HOURS.length;i++){const startsAt=day+d*86400000+FISH_BOSS_HOURS[i]*3600000-9*3600000;if(startsAt+FISH_BOSS_MS>now){const dayIndex=Math.floor((day+d*86400000)/86400000);return {id:new Date(day+d*86400000).toISOString().slice(0,10)+'-'+FISH_BOSS_HOURS[i],kind:(dayIndex*FISH_BOSS_HOURS.length+i)%FISH_BOSSES.length,startsAt,endsAt:startsAt+FISH_BOSS_MS};}}
 return null;
}
export const fishBossDamage=(rarity,sizeIndex,auto)=>Math.max(1,Math.round((10+rarity*8+Math.max(0,sizeIndex)*4)*(auto?.5:1)));
// v3 미끼: 지렁이만 골드, 나머지는 낚시 토큰. luck=희귀 이상(최대 2단계 위까지) 배율 지수, 나머지는 각 효과 배율.
// 2026-11-05 도현: 미끼는 좋을수록 희귀한 물고기가 더 잘 낚인다 — 등급 1단계마다 rare배 (최대 4단계까지 곱함).
export const BAITS=[
 {id:'worm',name:'숲 지렁이',pack:600,gold:60000,level:1,rare:1,text:'기본 미끼 · 무한',infinite:true},
 {id:'shrimp',name:'반짝 새우',pack:10,tokens:1,level:1,rare:1.15,text:'희귀할수록 등급마다 ×1.15'},
 {id:'pearl',name:'진주 미끼',pack:10,tokens:1,level:3,rare:1.3,text:'희귀할수록 등급마다 ×1.3'},
 {id:'golden',name:'황금 미끼',pack:10,tokens:1,level:5,rare:1.45,text:'희귀할수록 등급마다 ×1.45',art:'star',hue:'golden'},
 {id:'glow',name:'형광 미끼',pack:10,tokens:1,level:7,rare:1.6,text:'희귀할수록 등급마다 ×1.6',art:'bait-glow-v2'},
 {id:'star',art:'bait-star-v2',name:'별가루 미끼',pack:10,tokens:1,level:9,rare:1.8,text:'희귀할수록 등급마다 ×1.8'},
];
export const BAIT_RARE_CAP=4;
// 2026-11-05 도현: 특수 미끼 값은 지금 낚싯대 단계에 비례 — 그 단계 지렁이 1회 수입(ROD_CAST_VALUE)의 %로, 늘어나는 수입의 약 절반.
export const ROD_CAST_VALUE=Object.freeze([5,5.4,13,17,31,41,71,111,166,260,364,560,823,1600,3331,6420,9200,16500,23600,42700]);
export const BAIT_COST_PCT=Object.freeze({shrimp:.035,pearl:.07,golden:.105,glow:.14,star:.175});
export const BAIT_SPECIAL_LIMIT=600; // 싸게 사서 쌓아두고 높은 단계에서 쓰는 걸 막는 보유 한도(종류별)
export const baitPackPrice=(bait,rod=1)=>bait?.gold?bait.gold:Math.max(10,Math.round(ROD_CAST_VALUE[Math.max(1,Math.min(ROD_CAST_VALUE.length,rod||1))-1]*(BAIT_COST_PCT[bait?.id]||0)*(bait?.pack||10)));
export const baitDiamondCost=()=>0;
// 예전(v2) 미끼 다이아 값 — 초기화 환불용 (개당 다이아).
export const LEGACY_BAIT_DIAMONDS={shrimp:2/15,pearl:4/10,star:6/5};
export const FISHING_QUESTS=[{id:'catch',name:'물고기 10마리 잡기',goal:10,diamonds:3},{id:'rare',name:'희귀 이상 물고기 3마리',goal:3,diamonds:2},{id:'sell',name:'물고기 5마리 판매',goal:5,diamonds:2}];
// Completed-but-unclaimed fishing dailies for today (Korean day), for mail-style badges.
export const fishingQuestsReady=(s,now=Date.now())=>{const d=s?.fishing?.daily;if(!d||d.day!==new Date(now+9*3600000).toISOString().slice(0,10))return 0;return FISHING_QUESTS.filter(q=>(d[q.id]||0)>=q.goal&&!(d.claimed||[]).includes(q.id)).length;};
// Cubes, potential scrolls and lock stones no longer come from fishing.
// 2026-10-25: 다이아 상자·던전 열쇠 확률 절반.
export const REWARD_RATES=[{id:'fish',name:'물고기',chance:.9875},{id:'diamondChest',name:'다이아 상자',chance:.01},{id:'dungeonKey',name:'던전 열쇠',chance:.0025}]; // 2026-11-05 도현: 열쇠 0.5% → 0.25% (반토막)
// Bait: each grade above the spot's lowest grade is (1+luck)x more likely, for at most two grades
// (every spot now starts at 일반, so an uncapped bonus would compound over six grades).
export const baitGradeWeight=(fish,bait)=>(bait?.rare||1)**Math.min(BAIT_RARE_CAP,fish.rarity);
// Deeper spots: each grade up is spot.luck x more likely (first spot 1x).
export const spotGradeWeight=fish=>(SPOTS.find(x=>x.id===fish.spot)?.luck||1)**fish.rarity;
// Bite wait is the only cast delay. Every bite is caught.
export const BITE_MIN_MS=3000,BITE_RANGE_MS=2000,// 2026-11-05 도현: 모두 어부처럼 입질 3~5초
 CAST_EXPIRE_MS=60000;
export const FISHER_BITE_MIN_MS=3000,FISHER_BITE_RANGE_MS=2000; // 2026-11-04 도현: 어부 입질 3~5초
// Lv.1→30 grows 16%/level; Lv.30+ only 7%/level. Lv.1→50 totals about 17M gold.
// 2026-10-25 Lv.50+: gold grows 15%/level, diamonds 20 + 2/level (Lv.50→70 ≈ 1.46억 G + 780 다이아).
export const legacyRodGoldCost=level=>Math.round(5000*1.16**(Math.min(level,30)-1)*1.07**Math.max(0,Math.min(level,50)-30)*1.15**Math.max(0,level-50)/100)*100;
export const legacyRodDiamondCost=level=>level>=50?20+2*(level-50):2+Math.floor(level/5);
export const ROD_PRICE=[[0,0],[2600,35],[3100,35],[15000,70],[19000,70],[35000,70],[70000,110],[120000,110],[180000,110],[380000,145],[590000,145],[1100000,180],[1600000,180],[2700000,215],[6300000,250],[15000000,290],[34000000,330],[60000000,370],[130000000,410],[260000000,450]]; // [토큰, 다이아] · 하루 2시간 꾸준히 사면 약 56일, 다이아 합계 2,015
// 2026-11-05 도현: 강화 삭제, 낚싯대 16종. 홀수 단계(1·3·…·15)에서 새 낚시터가 열리고, 짝수 단계는 같은 낚시터에서 힘·보너스만 오른다.
// 단계마다 판매 토큰 +3% · 희귀 이상 +2% (예전 강화 보너스를 낚싯대로 옮김). 가격은 토큰 + 다이아.
export const ROD_TOKEN_BONUS=.03,ROD_RARE_BONUS=.02;
export const ROD_TIERS=Object.freeze([
 {tier:1,name:'견습 대나무 낚싯대',power:8,tokens:ROD_PRICE[0][0],diamonds:ROD_PRICE[0][1],art:'rod-tier-01'},
 {tier:2,name:'단단한 대나무 낚싯대',power:12,tokens:ROD_PRICE[1][0],diamonds:ROD_PRICE[1][1],art:'rod-tier-02'},
 {tier:3,name:'달빛 갈대 낚싯대',power:15,tokens:ROD_PRICE[2][0],diamonds:ROD_PRICE[2][1],art:'rod-tier-03'},
 {tier:4,name:'은빛 갈대 낚싯대',power:19,tokens:ROD_PRICE[3][0],diamonds:ROD_PRICE[3][1],art:'rod-tier-04'},
 {tier:5,name:'단풍목 낚싯대',power:22,tokens:ROD_PRICE[4][0],diamonds:ROD_PRICE[4][1],art:'rod-tier-05'},
 {tier:6,name:'붉은 단풍목 낚싯대',power:26,tokens:ROD_PRICE[5][0],diamonds:ROD_PRICE[5][1],art:'rod-tier-06'},
 {tier:7,name:'산호 낚싯대',power:29,tokens:ROD_PRICE[6][0],diamonds:ROD_PRICE[6][1],art:'rod-tier-07'},
 {tier:8,name:'진주 산호 낚싯대',power:33,tokens:ROD_PRICE[7][0],diamonds:ROD_PRICE[7][1],art:'rod-tier-08'},
 {tier:9,name:'성운 낚싯대',power:36,tokens:ROD_PRICE[8][0],diamonds:ROD_PRICE[8][1],art:'rod-tier-09'},
 {tier:10,name:'은하 성운 낚싯대',power:40,tokens:ROD_PRICE[9][0],diamonds:ROD_PRICE[9][1],art:'rod-tier-10'},
 {tier:11,name:'용궁 낚싯대',power:43,tokens:ROD_PRICE[10][0],diamonds:ROD_PRICE[10][1],art:'rod-tier-11'},
 {tier:12,name:'용왕의 낚싯대',power:47,tokens:ROD_PRICE[11][0],diamonds:ROD_PRICE[11][1],art:'rod-tier-12'},
 {tier:13,name:'화염 낚싯대',power:50,tokens:ROD_PRICE[12][0],diamonds:ROD_PRICE[12][1],art:'rod-tier-13'},
 {tier:14,name:'마그마 낚싯대',power:56,tokens:ROD_PRICE[13][0],diamonds:ROD_PRICE[13][1],art:'rod-tier-14'},
 {tier:15,name:'태초의 낚싯대',power:62,tokens:ROD_PRICE[14][0],diamonds:ROD_PRICE[14][1],art:'rod-tier-15'},
 {tier:16,name:'창세의 낚싯대',power:75,tokens:ROD_PRICE[15][0],diamonds:ROD_PRICE[15][1],art:'rod-tier-16'},
 // 2026-11-06 도현: 17~20단계 (빙하 협만 17 · 은하 수해 19)
 {tier:17,name:'서리 결정 낚싯대',power:78,tokens:ROD_PRICE[16][0],diamonds:ROD_PRICE[16][1],art:'rod-tier-17'},
 {tier:18,name:'오로라 빙하 낚싯대',power:88,tokens:ROD_PRICE[17][0],diamonds:ROD_PRICE[17][1],art:'rod-tier-18'},
 {tier:19,name:'성운 항해 낚싯대',power:92,tokens:ROD_PRICE[18][0],diamonds:ROD_PRICE[18][1],art:'rod-tier-19'},
 {tier:20,name:'무한 은하 낚싯대',power:106,tokens:ROD_PRICE[19][0],diamonds:ROD_PRICE[19][1],art:'rod-tier-20'},
].map(Object.freeze));
export const rodTier=f=>ROD_TIERS[Math.max(1,Math.min(ROD_MAX,f?.rod||1))-1];
export const rodGoldCost=()=>0,rodDiamondCost=()=>0;
// One price per grade everywhere (×600 G), with a small bonus for later spots (1.0 → 1.6×), then weight.
export const FISH_PRICE_BASE=480; // 2026-10-12: sale prices -20%
// 예전(v2) 판매가(골드) — 초기화 환불용.
export const legacyFishPrice=fish=>{const d=FISH.find(x=>x.id===fish.species);if(!d)return 0;const bonus=SPOTS.find(x=>x.id===d.spot).bonus;return Math.max(10,Math.round(RARITIES[d.rarity].value*FISH_PRICE_BASE*bonus*(1.1+.3*Math.min(1,fish.weight/d.max))/10)*10);};
// ── v3 크기 등급 · 돌연변이 ──
// 크기: 무게 구간(종 최소~최대 기준 비율, 1 넘으면 최대 무게의 배수)과 가치 배율. 큰 것일수록 드물다.
// 2026-11-05 도현: 대어·괴물급·기록급 확률 반토막(6%→3%, 1.7%→0.85%, 0.3%→0.15%), 줄어든 몫은 작음·보통·큼에 비율대로.
export const FISH_SIZES=Object.freeze([
 {id:'small',name:'작음',p:.418,mult:.7,from:0,to:.3,color:'#a9b8b0'},
 {id:'normal',name:'보통',p:.365,mult:1,from:.3,to:.65,color:'#d8e7d1'},
 {id:'large',name:'큼',p:.177,mult:1.5,from:.65,to:1,color:'#9fe0ff'},
 {id:'big',name:'대어',p:.03,mult:2.5,max:[1,1.2],color:'#ffd477'},
 {id:'monster',name:'괴물급',p:.0085,mult:5,max:[1.4,1.8],color:'#ff9a6b'},
 {id:'record',name:'기록급',p:.0015,mult:12,max:[2.2,2.8],color:'#ff6bd0'},
].map(Object.freeze));
// 돌연변이: 크기와 따로 추첨, 배율은 곱한다.
export const MUTATIONS=Object.freeze([
 {id:'silver',name:'은빛',p:.05,mult:1.25,color:'#dfe8f2'},
 {id:'gold',name:'황금',p:.01,mult:2,color:'#ffd34d'},
 {id:'rainbow',name:'무지개',p:.001,mult:3.5,color:'#ff8cf0'},
].map(Object.freeze));
const SIZE_MEAN=FISH_SIZES.reduce((n,x)=>n+x.p*x.mult,0),MUT_MEAN=1+MUTATIONS.reduce((n,x)=>n+x.p*(x.mult-1),0);
// 평균 가치는 예전과 같게(예전 무게 배율 평균 ≈1.22) — 크기·돌연변이는 분산만 키운다.
export const FISH_VALUE_NORMALIZE=SIZE_MEAN*MUT_MEAN/1.22;
export const fishSizeOf=fish=>FISH_SIZES.find(x=>x.id===fish?.size)||(d=>!d?FISH_SIZES[1]:fish.weight>d.max*2?FISH_SIZES[5]:fish.weight>d.max*1.3?FISH_SIZES[4]:fish.weight>d.max?FISH_SIZES[3]:fish.weight>d.min+(d.max-d.min)*.65?FISH_SIZES[2]:fish.weight>d.min+(d.max-d.min)*.3?FISH_SIZES[1]:FISH_SIZES[0])(FISH.find(x=>x.id===fish?.species));
export const fishMutationOf=fish=>MUTATIONS.find(x=>x.id===fish?.mut)||null;
// 크기 구간 안에서 무게(g) 정하기.
// 2026-11-05 도현: 등급별로 무게 최대치가 다르다 — 기록급 상한(종 최대 무게 대비): 일반 ×2 … 태고 ×5. 대어·괴물급 구간도 같은 비율로 늘어난다.
export const RARITY_SIZE_CAP=Object.freeze([2,2.3,2.6,3,3.5,4,5]);
export const sizeRange=(size,rarity=0)=>{if(!size?.max)return null;const k=(RARITY_SIZE_CAP[rarity]-1)/1.8;return [1+(size.max[0]-1)*k,1+(size.max[1]-1)*k];};
export const fishMaxWeight=d=>Math.round(d.max*RARITY_SIZE_CAP[d.rarity]);
export const fishSizeWeight=(d,size,r)=>{const m=sizeRange(size,d.rarity);return Math.round(m?d.max*(m[0]+(m[1]-m[0])*r):d.min+(d.max-d.min)*(size.from+(size.to-size.from)*r));};
// 크기 추첨: big = 대어 이상 확률 배율.
export function rollFishSize(random,big=1){const w=FISH_SIZES.map((x,i)=>x.p*(i>=3?big:1)),t=w.reduce((a,b)=>a+b,0);let r=random()*t;for(let i=0;i<w.length;i++){r-=w[i];if(r<0)return FISH_SIZES[i];}return FISH_SIZES.at(-1);}
export function rollMutation(random,boost=1){let r=random();for(const m of [...MUTATIONS].reverse()){r-=m.p*boost;if(r<0)return m;}return null;}
// 물고기 가치(골드 환산, 판매 토큰·수족관 수입의 기준).
export const fishValue=fish=>{const d=FISH.find(x=>x.id===fish.species);if(!d)return 0;const bonus=SPOTS.find(x=>x.id===d.spot).bonus;return RARITIES[d.rarity].value*FISH_PRICE_BASE*bonus*fishSizeOf(fish).mult*(fishMutationOf(fish)?.mult||1)/FISH_VALUE_NORMALIZE;};
// 판매하면 낚시 토큰: 가치 100골드어치 = 토큰 1개 (낚싯대 강화·인챈트 보너스는 판매할 때 따로 곱한다).
export const TOKEN_PER_GOLD=.01;
// 2026-11-05 도현: 판매 토큰은 낚시터마다 크게 다르게(한 단계 위로 갈 때마다 약 2.2배) — 앞 낚시터에서 모아서 건너뛸 수 없게.
// 낚시터 토큰 배율(SPOT_TOKEN)은 각 낚시터를 그 단계 낚싯대로 낚을 때 한 번에 평균 5·12·28·60·130·270·550·1100 토큰이 되게 맞춘 값.
export const SPOT_TOKEN={brook:3.4,moon:5.8,canyon:12,coral:25,abyss:51,palace:103,volcano:207,origin:460,glacier:1010,galaxy:2220};
export const fishPrice=fish=>{const d=FISH.find(x=>x.id===fish.species);if(!d)return 0;return Math.max(1,Math.round(RARITIES[d.rarity].value*fishSizeOf(fish).mult*(fishMutationOf(fish)?.mult||1)/FISH_VALUE_NORMALIZE*(SPOT_TOKEN[d.spot]||1)));};
// Aquarium gold per hour = sale price × grade rate. Rates keep each grade's best aquarium income close to the
// previous table now that deep-spot top fish sell for more (신화 stays the best per fish).
// 2026-10-12: 9 mythic ≈ half of the best hunting income (~340k/h).
// Each grade's worst fish (any spot, lightest) out-earns the previous grade's best (any spot, heaviest), for sale and aquarium.
export const AQUARIUM_RATE=[.9375,.65,.4625,.29375,.155,.16875,.1]; // x1.25 with the -20% sale base: aquarium income unchanged // 신화 sale value 600→240 (2026-10-12); rate keeps its aquarium income
// 2026-10-25: 새 낚시터 물고기는 수족관 수입 추가 배율(용궁 ×1.25, 불꽃 열수해 ×1.5, 태고의 바다 ×1.8).
// v3: 판매 골드가 없어진 대신 수족관 골드 ×1.5, 각성 ★마다 +20%.
export const AQUARIUM_V3_BOOST=3,// 2026-11-05 도현: 수족관 골드 전 구간 ×2
 AWAKEN_MAX=5,AWAKEN_BONUS=.2;
// 수족관은 크기·돌연변이 배율의 제곱근만 받는다(괴물급 ×5 → 수입 ×2.2) — 대박 한 마리가 골드를 무한정 찍지 않게.
export const fishYieldMult=fish=>Math.sqrt(fishSizeOf(fish).mult*(fishMutationOf(fish)?.mult||1));
export const fishYield=(fish,tankBonus=0)=>{const d=FISH.find(x=>x.id===fish.species);return d?Math.max(1,Math.round(fishValue(fish)/(fishSizeOf(fish).mult*(fishMutationOf(fish)?.mult||1))*fishYieldMult(fish)*AQUARIUM_RATE[d.rarity]*(SPOTS.find(s=>s.id===d.spot).tank||1)*AQUARIUM_V3_BOOST*(1+AWAKEN_BONUS*Math.min(AWAKEN_MAX,fish.star||0))*(1+tankBonus))):0;};
// ── v3 인챈트 ── (2026-11-05 도현: 강화 삭제 — 인챈트 칸은 낚싯대 6·12단계에서 열림)
// 예전 강화 다이아 비용(시험 계정 환불용).
export const LEGACY_ENHANCE_DIAMONDS=[15,20,30,40,60,80,100,140,180,230];
export const ENCHANT_SLOT_TIERS=[1,6,12];
export const enchantSlotCount=tier=>ENCHANT_SLOT_TIERS.filter(x=>tier>=x).length;
export const ENCHANT_TIERS=Object.freeze([{name:'일반',p:.6,color:'#d8e7d1'},{name:'희귀',p:.28,color:'#74caff'},{name:'에픽',p:.1,color:'#cf9cff'},{name:'전설',p:.02,color:'#ffd477'}].map(Object.freeze));
export const ENCHANTS=Object.freeze([
 {id:'bite',name:'입질 시간 단축',values:[.05,.10,.15,.25],sign:'-'},
 {id:'rare',name:'희귀 이상 확률',values:[.10,.20,.35,.60]},
 {id:'chest',name:'다이아 상자 확률',values:[.10,.20,.35,.60]},
 {id:'key',name:'던전 열쇠 확률',values:[.10,.20,.35,.60]},
 {id:'double',name:'두 마리 동시 낚기',values:[.03,.06,.10,.18],flat:true},
 {id:'big',name:'대어 확률',values:[.10,.20,.35,.60]},
 {id:'token',name:'판매 토큰',values:[.05,.10,.18,.30]},
 {id:'tank',name:'수족관 골드',values:[.10,.20,.35,.60]},
].map(Object.freeze));
// 2026-11-05 도현: 인챈트 비용은 낚싯대 단계에 비례 — 그 단계 하루 수입(600회)의 약 30%. 잠금 1칸마다 ×2.
// 2026-11-05 도현: 인챈트는 토큰이 아니라 다이아로, 비싸게. 낚싯대 단계별 1회 다이아(잠금 1칸마다 2배).
export const ENCHANT_COST_BY_TIER=Object.freeze([10,10,12,14,16,20,24,28,32,36,40,45,50,55,60,70,80,90,100,115]);
export const ENCHANT_COST=ENCHANT_COST_BY_TIER[0],ENCHANT_LOCK_MULT=2;
export const enchantCost=(locked,tier=1)=>ENCHANT_COST_BY_TIER[Math.max(1,Math.min(ENCHANT_COST_BY_TIER.length,tier||1))-1]*ENCHANT_LOCK_MULT**locked;
export const enchantText=e=>{const d=ENCHANTS.find(x=>x.id===e?.id);if(!d)return '';const v=d.values[e.tier];return d.name+' '+(d.flat?Math.round(v*100)+'%':(d.sign||'+')+Math.round(v*100)+'%');};
// 낚싯대 인챈트 합계 (같은 옵션 여러 칸이면 더한다).
export const fishingEnchant=(f,id)=>(f?.enchants||[]).reduce((n,e)=>n+(e&&e.id===id?ENCHANTS.find(x=>x.id===id).values[e.tier]:0),0);
// v3 자동 낚시권(골드): 있을 때만 오토 낚시, 손맛 없이 낚싯대 힘으로 판정.
// 2026-11-05 도현: 자동 낚시권은 시간이 아니라 횟수 — 하루치(600회) 단위로 판매, 어부는 반값.
export const FISHING_AUTO_PLANS=Object.freeze([{id:'h24',name:'자동 낚시 600회',casts:600,gold:30000000},{id:'d3',name:'자동 낚시 1,800회',casts:1800,gold:80000000},{id:'d7',name:'자동 낚시 4,200회',casts:4200,gold:160000000}].map(Object.freeze));
export const fishingAutoPrice=(s,plan)=>s?.profession?.id==='fisher'?Math.round(plan.gold/2):plan.gold;
export const AUTO_CASTS_PER_HOUR=25; // 예전 시간제 남은 시간 → 횟수 변환 (600회/24시간)
// ── v3 합성 ──
// 2026-11-05 도현: 합성은 도박 — 같은 종·같은 크기 3마리 → 같은 종 1마리. 성공하면 크기가 커지고(가끔 두 단계),
// 실패하면 같은 크기 1마리만 남는다. 합성할 때마다 돌연변이가 새로 붙을 수도 있다(일반 낚시의 5배 확률).
export const FUSE_COUNT=3,FUSE_CHANCE=[.6,.4,.2,.08,.03],FUSE_JACKPOT=.1,FUSE_MUT_BOOST=5;
// 황금 개체 5마리(종 무관) → 20% 무지개 개체, 실패하면 황금 1마리.
export const GOLD_FUSE_COUNT=5,GOLD_FUSE_CHANCE=.2;
export const legacyAquariumExpandCost=slots=>Math.round(300000*1.6**(slots-3)/1000)*1000;
// v3 수족관 칸(4~10칸) 확장은 낚시 토큰.
export const AQUARIUM_TOKEN_COST=[20000,60000,150000,400000,1000000,2000000,4000000];
export const aquariumExpandCost=slots=>AQUARIUM_TOKEN_COST[slots-3]??0;
export const fishWeight=grams=>grams>=1000?(grams/1000).toFixed(2)+' kg':grams+' g';
export const resourceName=id=>({addCube:'에디셔널 큐브',diamond:'다이아',diamondChest:'다이아 상자',potentialLock:'잠재 잠금석',dungeonKey:'던전 열쇠',cube:'레드 큐브',highCube:'블랙 큐브',primeCube:'프라임 큐브',scroll:'잠재 해금 주문서'}[id]||id);

// 2026-10-25 다이아 교환소: 하루 30개(한국 시간 자정 초기화)까지 교환.
export const DIAMOND_EXCHANGE=[{id:'addCube',name:'에디셔널 큐브',diamonds:5},{id:'highCube',name:'블랙 큐브',diamonds:3},{id:'potentialLock',name:'잠재 잠금석',diamonds:20}];
export const DIAMOND_EXCHANGE_DAILY=30;
// 2026-10-25 주간 대어 대회: 한 주(월요일 0시 KST)마다 낚시터 하나 · 대상 물고기 한 종. 가장 무거운 한 마리로 순위.
export const CONTEST_REWARDS=[{rank:1,diamonds:100,addCube:50},{rank:2,diamonds:50,addCube:30},{rank:3,diamonds:50,addCube:30}];
export const CONTEST_CLAIM_WEEKS=4,CONTEST_START='2026-10-26';
// 2026-11-05 도현: 대어 대회 마감 — 11/02 주 순위로 확정·보상 지급(우편), 이후 기록하지 않는다.
export const CONTEST_CLOSED=true,CONTEST_LAST='2026-11-02';
export const contestWeek=(now=Date.now())=>{const d=new Date(Number(now)+9*3600000);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);};
export const contestWeekEnd=week=>Date.parse(week+'T00:00:00+09:00')+7*86400000;
// 대상: 낚싯대 50 이하로 갈 수 있는 낚시터의 레어·에픽 물고기 중 주마다 순서대로 한 종.
export const CONTEST_POOL=FISH.filter(x=>(x.rarity===2||x.rarity===3)&&SPOTS.find(s=>s.id===x.spot).level<=50).map(x=>x.id);
export const contestTarget=week=>{const index=Math.round(Date.parse(week+'T00:00:00Z')/604800000);const species=CONTEST_POOL[((index*7)%CONTEST_POOL.length+CONTEST_POOL.length)%CONTEST_POOL.length];const fish=FISH.find(x=>x.id===species);return {week,species,spot:fish.spot};};
