const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const m=require('../pet-stack-model.js');
test('summon buttons recover after session completion without selecting the tab again',()=>{
 let subscriber,buttons=[];const session={active:true,subscribe:fn=>{subscriber=fn;}};
 const body={set innerHTML(html){buttons=[...html.matchAll(/<button data-pet-count="(\d+)"([^>]*)>/g)].map(x=>({dataset:{petCount:x[1]},disabled:x[2].includes('disabled')}));}};
 const data={p:{id:'p',grade:1,tierInGrade:1,name:'펫'}};
 const g={state:{ownedPets:[],petStone:100,petSummonExp:0},PET_DATA:data,PET_SUMMON_RATES:[],fn:{escapeHtml:s=>s,renderPetSummonResult:()=>{}}};
 const ctx={window:{RinguPetStackModel:m,RinguSession:session},RinguSession:session,document:{addEventListener:()=>{},getElementById:()=>body,querySelectorAll:()=>buttons}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../pet-stacks.js'),'utf8'),ctx);ctx.window.installRinguPetStacks(g);
 for(let i=0;i<3;i++){
 session.active=false;g.fn.renderPetSummonTab();assert.deepEqual(buttons.map(b=>b.disabled),[true,true]);const same=buttons;
 session.active=true;subscriber();assert.equal(buttons,same);assert.deepEqual(buttons.map(b=>b.disabled),[false,false]);
 }
 g.state.petStone=10;subscriber();assert.deepEqual(buttons.map(b=>b.disabled),[false,true]);
 g.state.petStone=9;subscriber();assert.deepEqual(buttons.map(b=>b.disabled),[true,true]);
 session.active=false;g.state.petStone=100;subscriber();assert.deepEqual(buttons.map(b=>b.disabled),[true,true]);
});
