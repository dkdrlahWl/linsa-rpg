// Compact multiplayer wire + history encoding (2026-10-14).
//
// 1. predictionBase is the same world a few ticks earlier, so it is sent as a
//    structural diff against the shared room instead of a second full copy.
// 2. Per-floor statics (dungeon terrain, monster names/art/stats) are cached by
//    the client under a content hash; once the client echoes the hash back the
//    edge omits them until they change.
// 3. Rewind points are stored as diffs against the live room, so the jsonb row
//    every participant reads and writes is roughly half the size.
// Every encoding is opt-in (client flag) or self-describing (marker keys), so
// old clients, an old edge and rooms saved by an older edge keep working.

const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keyed=a=>Array.isArray(a)&&a.length>0&&a.every(e=>isObj(e)&&(typeof e.id==='number'||typeof e.id==='string'));
// Postgres jsonb does not keep key order, so equality ignores it. Keys holding
// undefined are treated as absent, exactly as JSON storage does.
const has=(o,k)=>Object.hasOwn(o,k)&&o[k]!==undefined;
const defined=o=>Object.keys(o).filter(k=>o[k]!==undefined);
function equal(a,b){
 if(a===b)return true;
 if(typeof a!=='object'||typeof b!=='object'||a===null||b===null)return typeof a==='number'&&typeof b==='number'&&!Number.isFinite(a)&&!Number.isFinite(b)&&JSON.stringify(a)===JSON.stringify(b);
 if(Array.isArray(a)){if(!Array.isArray(b)||a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!equal(a[i],b[i]))return false;return true;}
 if(Array.isArray(b))return false;
 let n=0;for(const k in a){if(!Object.hasOwn(a,k))continue;const v=a[k];if(v===undefined)continue;n++;const u=b[k];if(u===undefined||!Object.hasOwn(b,k)||!equal(v,u))return false;}
 for(const k in b)if(Object.hasOwn(b,k)&&b[k]!==undefined&&--n<0)return false;
 return n===0;
}
// Encode `next` relative to `prev`. Markers: {$=:1} unchanged, {$n} literal,
// {$o,$x} object patch, {$a} keyed array whose entries carry $id.
export function diff(prev,next){
 if(equal(prev,next))return {'$=':1};
 if(keyed(prev)&&keyed(next)){
  const byId=new Map(prev.map(e=>[e.id,e]));if(byId.size!==prev.length)return {$n:next};
  const ids=new Set();for(const e of next){if(ids.has(e.id))return {$n:next};ids.add(e.id);}
  return {$a:next.map(e=>{if(!byId.has(e.id))return {$n:e};const d=diff(byId.get(e.id),e);return d['$=']===1||isObj(d.$o)?{...d,$id:e.id}:{$n:e};})};
 }
 if(isObj(prev)&&isObj(next)){
  const o={};
  for(const k of defined(next)){const v=next[k];if(has(prev,k)&&equal(prev[k],v))continue;o[k]=v===null||typeof v!=='object'?v:has(prev,k)?diff(prev[k],v):{$n:v};}
  const gone=defined(prev).filter(k=>!has(next,k));
  const out={$o:o};if(gone.length)out.$x=gone;return out;
 }
 return {$n:next};
}
const deepClone=v=>v===null||typeof v!=='object'?v:structuredClone(v),share=v=>v;
// `clone=false` shares unchanged subtrees with `prev` (callers that never mutate the result).
export function patch(prev,d,clone=deepClone){if(clone===false)clone=share;
 if(d===null||typeof d!=='object')return d;
 if(!isObj(d))throw Error('COOP_WIRE_PATCH');
 if(d['$=']===1)return clone(prev);
 if('$n' in d)return clone(d.$n);
 if(Array.isArray(d.$a)){const byId=new Map((Array.isArray(prev)?prev:[]).map(e=>[e.id,e]));return d.$a.map(e=>{if('$n' in e)return clone(e.$n);if(!byId.has(e.$id))throw Error('COOP_WIRE_PATCH');return patch(byId.get(e.$id),e,clone);});}
 if(isObj(d.$o)){
  if(!isObj(prev))throw Error('COOP_WIRE_PATCH');
  const out={},gone=new Set(d.$x||[]);
  for(const k of Object.keys(prev))if(!gone.has(k)&&prev[k]!==undefined)out[k]=k in d.$o?patch(prev[k],d.$o[k],clone):clone(prev[k]);
  for(const k of Object.keys(d.$o))if(!(k in out))out[k]=patch(undefined,d.$o[k],clone);
  return out;
 }
 throw Error('COOP_WIRE_PATCH');
}
export const encodeDiff=diff;
// FNV-1a over a string; collisions only cost a resend because the client
// echoes the hash and the edge compares against content it just built.
export function hashText(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(36)+'.'+s.length.toString(36);}

// ---- Static cache (edge encode / client decode) ----
// The cache key covers the floor terrain; monster statics are kept per id on
// the client and verified with an order-free set hash, so kills (which only
// shrink the set) never force a resend. New spawns or changed stats miss once.
export const STATIC_MONSTER_KEYS=['name','citadel','explorationTier','art','level','maxHp','attack','speed','role','elite','species','boss','bossKind'];
const hash32=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;};
const monsterStatics=e=>{const o={};for(const k of STATIC_MONSTER_KEYS)if(k in e&&e[k]!==undefined)o[k]=e[k];return o;};
const monsterHash=(id,st)=>hash32(JSON.stringify([id,STATIC_MONSTER_KEYS.filter(k=>k in st).map(k=>st[k])]));
const setHash=entries=>{let x=0,n=0;for(const [id,st] of entries){x=(x^monsterHash(id,st))>>>0;n++;}return x.toString(36)+'.'+n;};
const terrainOf=view=>isObj(view.dungeon)?Object.fromEntries(Object.entries(view.dungeon).filter(([k])=>k!=='seen')):null;
// Edge: `view` is coopClientView output. `args.wire===2` opts in; `args.cache` is the terrain key the client holds.
export function encodeCoopView(view,args){
 if(!view||!isObj(args)||args.wire!==2)return view;
 const out={...view};
 if(isObj(out.predictionBase)){const {predictionBase,...shared}=out;out.predictionBase={$wire:2,d:diff(shared,predictionBase)};}
 const terrain=terrainOf(out);
 if(terrain){
  const key=hashText(JSON.stringify(terrain));out.staticSig=key;
  if(args.cache===key){
   out.dungeon={$cached:1,...('seen' in view.dungeon?{seen:view.dungeon.seen}:{})};
   if(keyed(out.monsters)){
    // Only strip monsters the client says it already holds; new spawns travel in full.
    const runs=Array.isArray(args.known)?args.known.slice(0,512).filter(r=>Array.isArray(r)&&r.length===2&&r.every(Number.isSafeInteger)):[];
    const known=id=>runs.some(([a,b])=>id>=a&&id<=b),stripped=[];
    out.monsters=out.monsters.map(e=>{if(!known(e.id))return e;const d={};for(const k of Object.keys(e))if(!STATIC_MONSTER_KEYS.includes(k))d[k]=e[k];d.$c=STATIC_MONSTER_KEYS.filter(k=>k in e&&e[k]!==undefined);stripped.push([e.id,monsterStatics(e)]);return d;});
    out.monsterSig=setHash(stripped);
   }
   out.$cached=1;
  }
 }
 out.wire=2;return out;
}
// Client: one cache per tab. Throws on an unusable payload; the caller drops that
// snapshot and the next request asks for full statics. Decoded rooms share
// unchanged objects with the cache and with predictionBase; the client only
// reads them or deep-copies them (structuredClone / worker postMessage).
let cache={key:'',terrain:null,monsters:new Map()};
// Known monster ids as [first,last] integer runs (citadel/exploration ids are mostly consecutive).
function idRuns(ids){const nums=[...ids].filter(Number.isSafeInteger).sort((a,b)=>a-b),runs=[];for(const n of nums){const r=runs.at(-1);if(r&&n===r[1]+1)r[1]=n;else runs.push([n,n]);}return runs;}
export function coopWireArgs(){return cache.key?{wire:2,cache:cache.key,known:idRuns(cache.monsters.keys()).slice(0,256)}:{wire:2,cache:''};}
export function resetCoopWireCache(){cache={key:'',terrain:null,monsters:new Map()};}
const miss=()=>{resetCoopWireCache();return Error('COOP_WIRE_CACHE_MISS');};
export function decodeCoopReply(coop){
 if(!isObj(coop)||coop.wire!==2)return coop;
 const room={...coop};delete room.wire;
 if(room.$cached){
  if(room.staticSig!==cache.key||!cache.terrain)throw miss();
  const {$cached,...live}=room.dungeon||{};room.dungeon={...cache.terrain,...live};
  if(Array.isArray(room.monsters)){
   const entries=[];
   room.monsters=room.monsters.map(e=>{if(!e?.$c){if(isObj(e)&&'id' in e)cache.monsters.set(e.id,monsterStatics(e));return e;}const {$c,...d}=e;const st=cache.monsters.get(d.id);if(!st||$c.some(k=>!(k in st)))throw miss();const full={};for(const k of $c)full[k]=st[k];entries.push([d.id,full]);return Object.assign(full,d);});
   if(room.monsterSig!==undefined&&setHash(entries)!==room.monsterSig)throw miss();
  }
  delete room.$cached;delete room.monsterSig;
 }else if(room.staticSig){
  const terrain=terrainOf(room);
  if(terrain){
   if(cache.key!==room.staticSig)cache={key:room.staticSig,terrain,monsters:new Map()};
   for(const e of keyed(room.monsters)?room.monsters:[])cache.monsters.set(e.id,monsterStatics(e));
  }
 }
 delete room.staticSig;
 if(isObj(room.predictionBase)&&room.predictionBase.$wire===2){const {predictionBase,...shared}=room;room.predictionBase=patch(shared,predictionBase.d,false);}
 return room;
}

// ---- Rewind history storage (edge only; SQL reads _net.frames only) ----
// `ref` is historyPoint(room) for the room being stored; `points` are expanded (no $s) history points.
// Fields the database rewrites on every read are not part of the reference.
const refOf=ref=>{const {id,revision,me,_rtt,...core}=ref;return core;};
// The edge is the only writer of everything except membership (leave/claim)
// and the input queue, so a fingerprint of those fields detects a foreign edit.
const fingerprint=r=>hashText(JSON.stringify([r.tick,r.status,r.floor??null,r.serial??null,r.hp??null,(r.members||[]).map(m=>[m.id,!!m.left,!!m.claimed,m.hp,m.x,m.y])]));
export function packPoints(points,ref){
 const base=refOf(ref);
 return {v:1,ref:fingerprint(base),points:points.map(p=>diff(base,p))};
}
// Returns null when the stored room no longer matches the reference (e.g. SQL edited it).
// Unpacked points share unchanged subtrees with `ref`; history points are never mutated in place.
export function unpackPoints(packed,ref){
 if(!isObj(packed)||packed.v!==1||!Array.isArray(packed.points))return null;
 const base=refOf(ref);if(fingerprint(base)!==packed.ref)return null;
 return packed.points.map(d=>patch(base,d,false));
}
