// Dedicated generated illustrations and transparent in-game artwork for 6th/7th trials.
export const ADVANCEMENT_ART=Object.freeze({
 chronovas:Object.freeze({portrait:'tower/advancement-chronovas-portrait-v1.webp',sprite:'tower/advancement-chronovas-sprite-v1.webp'}),
 apocalis:Object.freeze({portrait:'tower/advancement-apocalis-portrait-v1.webp',sprite:'tower/advancement-apocalis-sprite-v1.webp'}),
});
export const advancementArt=art=>ADVANCEMENT_ART[art]||null;
export function advancementPortrait(t){
 const a=advancementArt(t.art);
 return a?`<img class="tower-portrait single-boss-art advancement-illustration" src="${a.portrait}" alt="${t.name} 일러스트" loading="lazy" decoding="async">`:`<div class="tower-portrait${t.artFrames===1?' single-boss-art':''}" style="background-image:url('tower/boss-${t.art}.webp')"></div>`;
}
