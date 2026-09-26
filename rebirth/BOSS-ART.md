# 신규 보스 외형 — 2026-09-26

제작: 내장 image_gen 도구. 기존 보스 이미지를 참조하지 않고 6종을 각각 생성.
2172×724 투명 3프레임: 대기 / 공격 준비 / 공격. WebP quality 84, alpha 100.
목록과 실제 전투에서 동일한 전용 이미지를 사용한다. 시련의 탑 외형 및 전투 수치는 변경하지 않는다.

## 저장 위치

- 수정 문지기 루멘: [tower/boss-lumen.webp](tower/boss-lumen.webp)
- 계승의 심판관 아르켄: [tower/boss-arken.webp](tower/boss-arken.webp)
- 각성의 군주 에클립스: [tower/boss-eclipse.webp](tower/boss-eclipse.webp)
- 숲의 균열: [tower/boss-rift-forest.webp](tower/boss-rift-forest.webp)
- 용암의 균열: [tower/boss-rift-magma.webp](tower/boss-rift-magma.webp)
- 공허의 균열: [tower/boss-rift-void.webp](tower/boss-rift-void.webp)

## 최종 생성 프롬프트

각 subject를 아래 공통 프롬프트의 {subject}에 대입하여 개별 호출했다.

Use case: stylized-concept. Production transparent fantasy RPG boss sprite sheet for a top-down action game. Brand new original boss: {subject} Painterly detailed Korean fantasy game style, strong readable silhouette, view from elevated three-quarter camera, full body entirely visible. ONE image, exactly THREE equal-width cells in ONE horizontal row, transparent background true alpha. Same boss, same body scale and feet/hover baseline in all three cells. Left cell idle ready pose, middle cell dramatic attack preparation, right cell attack release with raised/open limbs. Boss faces diagonally down-right in all cells. Each silhouette including weapon/tail/rings fits within central 70% width and 78% height of its own cell; at least 15% transparent padding at left and right. No part crosses cell boundaries. No text, no grid, no scenery, no ground shadow, no frame or portrait circle. Canvas wide 3:1 aspect.

### 수정 문지기 루멘

Lumen, crystal gatekeeper: a floating ivory ceramic sentinel, faceless diamond turquoise crystal head, four detached geometric gold forearms, short articulated floating legs, luminous prism core and triangular shoulder crystals. NOT a crab, knight or human king.

### 계승의 심판관 아르켄

Arken, adjudicator of inheritance: a tall bronze jackal-headed automaton magistrate, ivory segmented ceremonial armor, dark teal waistcloth, two enormous crossed crescent blades, sun-shaped chest seal. NOT a medieval knight, no crown.

### 각성의 군주 에클립스

Eclipse, awakening sovereign: a hovering black and white celestial owl oracle, broad folded feather mantle, white mask with three gold eyes, suspended black eclipse disc behind head, long articulated talons, violet astral tendrils. NOT a humanoid armored king.

### 숲의 균열

Forest rift boss: a gigantic emerald jade mantis with orchid-petal back fins, amber eyes, two curved leaf scythes, six articulated legs and glowing pollen sacs. NOT a tree golem.

### 용암의 균열

Magma rift boss: a huge obsidian furnace salamander with six powerful legs, orange molten throat, copper exhaust horns, a thick segmented tail curled closely beside body, lava fissures. NOT a wolf or dragon.

### 공허의 균열

Void rift boss: a floating abyssal nautilus leviathan, coiled midnight shell with golden constellation grooves, singular cyan eye, six short thick violet tentacles curving beneath it, floating broken orbital rings. NOT a humanoid king.

## 적용 확인

- 6종의 외형 ID가 서로 다르며 시련의 탑 외형과 겹치지 않음.
- 실제 전투 렌더러에서 3자세 × 좌우 방향을 표시.
- 모바일 전직 목록/연습 입장 및 협동 균열 목록 확인.
- 저장된 전직 전투도 수치를 유지하면서 현재 전용 외형으로 표시.

