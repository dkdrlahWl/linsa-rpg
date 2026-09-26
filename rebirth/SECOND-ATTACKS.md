# 2차 공격 스킬 변경

| 직업 | 스킬 | 피해 | 재사용 |
|---|---|---|---|
| 마법사 | 빙결 폭쇄 | 60% × 3 = 180% | 32초 |
| 궁수 | 질풍 관통 | 36% × 5 = 180% | 30초 |
| 해적 | 파쇄 포격 | 90% × 2 = 180% | 30초 |

해적 오비탈 캐논은 6타 합계 2,000%, 대해의 포화는 200% × 10타 = 2,000%.
기존 전사 2차 150% × 1타, 도적 2차 90% × 2타와 비슷한 총 피해로 배정.
새 2차에는 기존 피해 증가·방어·치명 버프가 적용되지 않는다.

## 이미지

내장 image_gen으로 제작. 투명 PNG 원본은 보존하고 게임에는 WebP로 변환해 포함했다.

- 마법사: `tower/second-mage-attack-v1.webp`
- 궁수: `tower/second-archer-attack-v1.webp`
- 해적: `tower/second-pirate-attack-v1.webp`

## 최종 생성 프롬프트

### 마법사

Create a production game VFX sprite sheet on a genuinely transparent background. One horizontal strip of exactly FOUR equally sized square frames, 4 columns x 1 row, generous transparent gutters, no text or characters or scenery. Korean painted fantasy RPG top-down magic attack: a violet-blue frost crystal detonation striking the GROUND. Frames left to right: small charged ice cluster, three sharp ice lances erupting from one ground impact, wide bright crystalline shattering explosion with low elliptical ground shockwave, fading ice shards and low dust. Keep each effect centered inside its cell with identical scale and ground anchor near 65% cell height. Beautiful textured magical ice, cyan highlights violet shadows, crisp readable silhouette at small size, no shield dome or barrier, no UI borders. Sheet aspect ratio 4:1. This is the mage second advancement attack ice explosion animation.

### 궁수

Production game VFX sprite sheet, genuinely transparent background, exactly FOUR isolated animation frames in a single horizontal row of four equal-width cells. Every cell has generous empty gutters, effects never touch adjacent cells. No text, no border, no characters, no scenery. Korean painted fantasy RPG archer attack: emerald and pale golden piercing wind arrows strike a ground target in rapid succession. Frame1 three luminous feathered arrows descending diagonally down-right, frame2 arrows impacting with sharp emerald starbursts near the ground, frame3 five bright narrow arrows clustered with a low elliptical wind shockwave, frame4 fading feather motes and a low ground dust ring. Elegant physical arrowheads, wind ribbons, textured painted fantasy material, readable at small size, NO shield or dome. Same ground anchor 65% down each cell. Each effect smaller than 65% cell width. Wide horizontal strip, 4:1 aspect ratio.

### 해적

Generate a game VFX sprite sheet with a REAL transparent alpha background, not a painted black backdrop. Exactly FOUR animation frames horizontally in four equal cells, big clear transparent gutters between frames. No labels, no text, no character, no landscape, no UI. Korean hand-painted fantasy RPG pirate second-job cannon attack: two heavy iron cannonballs strike the ground, with orange-gold fire and blue-white sea spray. Frames left to right: two incoming cannonballs with short smoke trails; first low ground impact fireball; second broad ground explosion with shattered rock and a turquoise spray crescent; dissipating smoke/spray embers. Each effect must fit inside middle 65% width of its cell, aligned ground at 70% cell height, no overlap across frame boundaries, no full rectangular glow background, no dome shield. Strong readable silhouettes, vivid textured metal and fire. Wide 4:1 horizontal sheet.

## 확인

단독 전투에서 3·5·2타와 총 180% 피해, 기존 버프 저장값 무시, 모바일 이미지 로딩과 화면 넘침을 확인했다. 전직 제한과 쿨타임 테스트도 통과했다.
