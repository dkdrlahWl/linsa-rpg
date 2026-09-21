# 재화 아이콘 제작

Built-in ImageGen으로 각 재화 이미지를 개별 제작했다. 생성 이미지의 투명도를 유지하며 256px WebP로 축소하고, 연결된 GitHub 앱에서 업로드할 수 있도록 SVG에 내장했다. SVG는 생성된 비트맵의 컨테이너이며 직접 그린 대체 도형이 아니다.

| 파일 | 재화 |
|---|---|
| gold.svg | 골드 |
| fragment.svg | 장비 파편 |
| scroll.svg | 잠재 부여 주문서 |
| expand.svg | 잠재 확장석 |
| cube.svg | 일반 큐브 |
| highCube.svg | 상급 큐브 |
| boss.svg | 지역별 보스 재료 공통 아이콘 |

## 최종 프롬프트

각각 아래 공통 프롬프트의 SUBJECT를 해당 항목으로 치환해 별도 생성했다.

Use case: stylized-concept. Create ONE standalone inventory currency icon for a polished dark fantasy Korean mobile RPG. Subject: SUBJECT. Square 1024x1024 composition, object centered occupying about 76% of the canvas, generous transparent margins, genuinely transparent background with alpha, no scenery, no tile/frame, no letters/numbers/watermark. Premium hand-painted 3D game item rendering, sculpted readable silhouette, sharp bevels, warm upper-left rim lighting, rich saturated jewel color, restrained glow inside object contours. Designed to remain recognizable at 24px. This is a production asset to integrate into the user's existing game; return the generated asset.

- gold: a small stack of rich antique gold coins, one upright coin with a simple engraved four-point star
- fragment: three chunky broken silver steel armor shards with jagged edges and a faint warm orange molten seam
- scroll: one ivory parchment scroll unfurled slightly, dark burgundy wax seal, glowing purple abstract magical sigil, no legible writing
- expand: one elongated vivid violet amethyst crystal with three distinct prismatic tips, tiny silver base collar
- cube: one blue cyan magical cube, silver metal edges, translucent sapphire faces, a small bright core
- highCube: one luxurious crimson ruby magical cube with ornate antique gold edges, brighter and more elaborate than a normal blue cube
- boss: one dark obsidian monster-heart gem clasped by curved ivory fangs, fiery amber core, compact heroic trophy silhouette

사용자 요청대로 테스트 및 브라우저 검증은 실행하지 않았다.
