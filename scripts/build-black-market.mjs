// Produce the migration from the actual server summon level-9 balance. No networking.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const b=JSON.parse(await readFile(new URL('supabase/functions/_shared/balance.json',root),'utf8'));
const rates=b.rates[8];assert.deepEqual(rates.slice(0,4),[80,15,4.9,0.1]);assert.ok(rates.slice(4).every(n=>n===0));
const gear=b.gear.filter(x=>x.rarity<4);
for(const slot of b.slots)for(let r=0;r<4;r++)assert.ok(gear.filter(x=>x.slot===slot&&x.rarity===r).length>=5);
const q=x=>"'"+String(x).replaceAll("'","''")+"'";
const seed=`insert into ringu_private.black_market_config values(true,${q(JSON.stringify(rates.slice(0,4)))}::jsonb,${q(JSON.stringify(b.slots))}::jsonb) on conflict(singleton) do update set rates=excluded.rates,slots=excluded.slots;\ninsert into ringu_private.black_market_catalogue(slot,rarity,name,base_atk) values\n`+gear.map(x=>`(${q(x.slot)},${x.rarity},${q(x.name)},${x.baseAtk})`).join(',\n')+'\non conflict(slot,rarity,name) do update set base_atk=excluded.base_atk;';
const src=await readFile(new URL('black-market.sql.in',root),'utf8');assert.equal(src.split('-- @CATALOGUE@').length,2);
await writeFile(new URL('supabase/17-black-market.sql',root),src.replace('-- @CATALOGUE@',seed));
console.log(`Generated BM1 migration from ${gear.length} existing items and summon level-9 rates.`);
