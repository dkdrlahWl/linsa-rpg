const CLASSES=['warrior','mage','archer','rogue','pirate'];
const COMMON=['ui-click','ui-tab','ui-back','ui-open','ui-error','enhance-charge','enhance-success','enhance-fail','enhance-break','cube-red','cube-black','cube-prime','cube-rankup','purchase-complete','loot-common','loot-rare','chest-open','level-up','battle-hit','battle-crit','battle-hurt','battle-dash','battle-victory','battle-defeat','boss-warning','lobby-bgm'];
export const AUDIO_IDS=new Set([...COMMON,...CLASSES.flatMap(c=>['attack','skill-1','skill-2','skill-3'].map(k=>c+'-'+k))]);
export function eventAudio(e,classId){
  if(e.type==='star')return [e.outcome==='success'?'enhance-success':e.outcome==='destroy'?'enhance-break':'enhance-fail'];
  if(e.type==='cube')return [({cube:'cube-red',highCube:'cube-black',primeCube:'cube-prime'})[e.kind]||'cube-red',...(e.up?['cube-rankup']:[])];
  if(e.type==='skill')return [classId+'-skill-'+(e.slot||1)];
  if(['boss','party','dungeon','coop','advancementTrial'].includes(e.type))return [e.won?'battle-victory':'battle-defeat'];
  if(['attendance','daily','mail','offline'].includes(e.type))return ['loot-common'];
  if(['restore','potential'].includes(e.type))return ['enhance-success'];
  if(e.type==='advancement')return ['level-up'];
  return [];
}
// High-water marks survive prediction corrections, redraws and repeated snapshots.
export class BattleAudioTracker{
  constructor(emit){this.emit=emit;this.runs=new Map();}
  observe(b){
    if(!b?.runId)return;let old=this.runs.get(b.runId);
    const fields={attackReady:b.classId+'-attack',ultimateReady:b.classId+'-skill-1',skillReady:b.classId+'-skill-2',thirdReady:b.classId+'-skill-3',dashReady:'battle-dash',enemyCastStart:'boss-warning'};
    if(!old){old={hp:b.hp,won:!!b.won,ended:!!b.ended};for(const k in fields)old[k]=b[k]||0;this.runs.set(b.runId,old);if(this.runs.size>12)this.runs.delete(this.runs.keys().next().value);return;}
    for(const [key,id] of Object.entries(fields)){const value=b[key]||0;if(value>old[key]){if(!b.ended&&(key==='enemyCastStart'||value>b.tick))this.emit(id);old[key]=value;}}
    if(b.hp<old.hp)this.emit('battle-hurt');old.hp=b.hp;
    if(b.won&&!old.won)this.emit('battle-victory');
    else if(b.ended&&!old.ended&&!b.won)this.emit('battle-defeat');
    old.won=old.won||!!b.won;old.ended=old.ended||!!b.ended;
  }
}
export class GameAudio{
  constructor(settings,state=()=>null){this.settings=settings;this.state=state;this.ctx=null;this.buffers=new Map();this.active=new Set();this.last=new Map();this.combat=false;this.musicEpoch=0;this.tracker=new BattleAudioTracker(id=>this.play(id));}
  start(){
    try{if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;this.ctx=new AC();this.fx=this.ctx.createGain();this.bg=this.ctx.createGain();this.fx.connect(this.ctx.destination);this.bg.connect(this.ctx.destination);this.warm();}if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});this.volume();}catch{}
  }
  volume(){if(!this.ctx)return;this.fx.gain.setTargetAtTime(Math.max(0,Number(this.settings().sound)||0),this.ctx.currentTime,.025);this.bg.gain.setTargetAtTime(Math.max(0,Number(this.settings().music)||0)*.75,this.ctx.currentTime,.08);}
  async load(id){
    if(!this.ctx||!AUDIO_IDS.has(id))return null;
    if(!this.buffers.has(id)){const ctx=this.ctx;const pending=fetch(new URL('./audio/'+id+'.mp3',import.meta.url)).then(r=>{if(!r.ok)throw Error('audio');return r.arrayBuffer();}).then(b=>ctx.decodeAudioData(b)).catch(()=>{this.buffers.delete(id);return null;});this.buffers.set(id,pending);}return this.buffers.get(id);
  }
  warm(){for(const id of ['ui-click','ui-back','ui-tab','ui-error','enhance-charge','enhance-success','enhance-fail','cube-red','cube-black','cube-prime','cube-rankup','chest-open','loot-common'])void this.load(id);this.warmClass();}
  warmClass(){if(!this.ctx)return;const cls=this.state()?.classId;if(cls&&cls!==this.warmedClass){this.warmedClass=cls;for(const k of ['attack','skill-1','skill-2','skill-3'])void this.load(cls+'-'+k);}}
  play(kind){
    const aliases={click:'ui-click',hit:this.state()?.classId+'-attack','tower-hit':'battle-hit','tower-crit':'battle-crit','tower-hurt':'battle-hurt','tower-dash':'battle-dash'};
    const id=aliases[kind]||kind;if(!AUDIO_IDS.has(id)||id==='lobby-bgm'||!this.settings().sound||document.hidden)return;
    this.start();if(!this.ctx)return;const now=performance.now(),gap=id.startsWith('ui-')?35:id==='boss-warning'?900:id.endsWith('-attack')?90:id.includes('-skill-')?300:180;
    if(now-(this.last.get(id)??-Infinity)<gap)return;this.last.set(id,now);
    void this.load(id).then(buffer=>{if(!buffer||document.hidden||!this.settings().sound||performance.now()-now>1000||this.ctx.state!=='running')return;
      if(this.active.size>=10){const quiet=[...this.active].find(v=>v.id.endsWith('-attack')||v.id==='battle-hit');if(quiet)quiet.source.stop();else return;}
      const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;gain.gain.value=id==='battle-hit'?.5:1;source.connect(gain).connect(this.fx);const voice={source,gain,id};this.active.add(voice);source.onended=()=>{this.active.delete(voice);source.disconnect();gain.disconnect();};source.start();
    });
  }
  event(e){if(e.type==='star')for(const v of this.active)if(v.id==='enhance-charge')v.source.stop();const list=eventAudio(e,this.state()?.classId);list.forEach((id,i)=>{if(['battle-victory','battle-defeat'].includes(id)&&performance.now()-(this.last.get(id)??-Infinity)<2000)return;if(i)setTimeout(()=>this.play(id),1100);else this.play(id);});}
  battle(b){this.tracker.observe(b);}
  setCombat(on){this.combat=on;this.warmClass();this.music();}
  music(){
    if(!this.ctx)return;this.volume();if(!this.settings().music||document.hidden||this.combat){this.musicEpoch++;this.musicSource?.stop();this.musicSource=null;return;}
    if(this.musicSource||this.musicLoading)return;const epoch=this.musicEpoch;this.musicLoading=true;
    void this.load('lobby-bgm').then(buffer=>{this.musicLoading=false;if(epoch!==this.musicEpoch){this.music();return;}if(!buffer||document.hidden||!this.settings().music||this.combat)return;const source=this.ctx.createBufferSource();source.buffer=buffer;source.loop=true;source.loopEnd=Math.min(buffer.duration,24*4*60/76);source.connect(this.bg);source.onended=()=>source.disconnect();source.start();this.musicSource=source;});
  }
  pause(){this.musicEpoch++;this.musicSource?.stop();this.musicSource=null;for(const v of this.active)v.source.stop();this.ctx?.suspend().catch(()=>{});}
}
