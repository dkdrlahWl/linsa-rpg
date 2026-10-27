import assert from 'node:assert/strict';
import {normalizeCompanions,COMPANION_PASSIVES} from './companion-model.mjs';
import {deliverSystemMail,claimSystemMail} from './system-mail.mjs';
const legacy={companions:{cards:[{i:1,c:'f1',t:'jackpot',v:15},{i:2,c:'f2',t:'jackpot',v:30}]}};
normalizeCompanions(legacy);assert.deepEqual(legacy.companions.cards.map(c=>c.v),[20,40]);normalizeCompanions(legacy);assert.deepEqual(legacy.companions.cards.map(c=>c.v),[20,40]);
assert.equal((COMPANION_PASSIVES.jackpot.min+COMPANION_PASSIVES.jackpot.max)/2,30);
const id='companion-update-20261027-tickets-3',ctx={now:Date.parse('2026-10-27T07:00:00Z'),accountCreatedAt:'2026-09-01T00:00:00Z',accountId:'test'};
const s={materials:{},companions:{tickets:2}};deliverSystemMail(s,ctx);assert.ok(s.systemMailbox.some(m=>m.id===id));claimSystemMail(s,id);assert.equal(s.companions.tickets,5);assert.equal(s.materials.companionTicket,undefined);assert.throws(()=>claimSystemMail(s,id),/ALREADY_CLAIMED/);deliverSystemMail(s,ctx);assert.ok(!s.systemMailbox.some(m=>m.id===id));
for(const c of [{...ctx,now:Date.parse('2026-10-27T06:00:00Z')},{...ctx,accountCreatedAt:'2026-10-28T00:00:00Z'}]){const s={};deliverSystemMail(s,c);assert.ok(!s.systemMailbox.some(m=>m.id===id));}
console.log('PASS passive migration, equal gold/jackpot mean, campaign cutoff, ticket destination, once-only claim');
