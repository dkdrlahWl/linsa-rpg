import {power} from './engine.mjs';
// Public inspection exposes only appearance, the summary card and arena standing.
export function rankingProfile(state,row){
 const p=power(state);
 return {id:row.id,name:state.name,classId:state.classId,costumeId:p.costumeId,arenaRank:row.arenaRank??null,
 metrics:Object.fromEntries(['combatPower','attack','hp','defense','crit','critDamage','stars','goldGain','xpGain'].map(k=>[k,p[k]]).concat([['bonuses',Object.fromEntries(['attack','boss','hp','defense'].map(k=>[k,p.bonuses[k]]))]]))};
}
