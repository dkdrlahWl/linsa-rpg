import assert from 'node:assert/strict';
import {setup} from './login-inventory.test.mjs';
const t=setup({delaySync:true}),boot=await t.start();
t.window.RinguCore={state:structuredClone(boot.state)};
const session=t.window.RinguSession;
const sync=session.economyTransaction('sync',{});
while(!t.releaseSync)await new Promise(r=>setTimeout(r,1));
const originalInventory=JSON.stringify(t.window.RinguCore.state.inventory);
for(const enabled of [true,false,true]){
 t.window.RinguCore.state.useProtect=enabled;
 session.save(t.window.RinguCore.state);
 assert.equal(t.window.RinguCore.state.useProtect,enabled);
}
t.releaseSync();await sync;
assert.equal(t.window.RinguCore.state.useProtect,true,'stale sync must not erase newest ON choice');
await session.flush();
assert.equal(t.window.RinguCore.state.useProtect,true);
assert.equal(JSON.stringify(t.window.RinguCore.state.inventory),originalInventory);
assert.equal(t.calls.filter(c=>c.url.includes('ringu_save_preferences')).at(-1).body.p_preferences.useProtect,true);
t.window.RinguCore.state.useProtect=false;session.save(t.window.RinguCore.state);await session.flush();
assert.equal(t.window.RinguCore.state.useProtect,false);
assert.equal(t.calls.filter(c=>c.url.includes('ringu_save_preferences')).at(-1).body.p_preferences.useProtect,false);
console.log('PASS protection toggle: repeated changes, delayed sync, server save, inventory preserved');
