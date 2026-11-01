// Presentation-only art: token encounters retain the server's battle rules.
export const TOKEN_ART=Object.freeze({
 boss:'token/mammon-v1.webp',token:'token/token-v1.webp',
 exchange:'token/exchange-v1.webp',race:'token/race-v1.webp',horse:'token/horse-v1.webp',
});
export const tokenIcon=()=>`<img class="token-currency-art" src="${TOKEN_ART.token}" alt="" width="22" height="22" decoding="async">`;
export const tokenEncounterArt=(battle,encounter)=>battle.tokenStage!==undefined
 ?{...encounter,art:'token-mammon-v1',artFrames:1,artSize:265}:encounter;
