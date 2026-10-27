# 동료 카드 인간 캐릭터 일러스트

18종 모두 새로운 이름의 인간 캐릭터입니다. 기존 카드 ID·등급·분당 골드 범위는 유지합니다. 이미지 생성 도구로 초상화 3개 아틀라스, 등급 액자 아틀라스, 메뉴·소환권 아이콘 아틀라스를 제작했고, build-companion-human-art.py로 개별 WebP를 추출했습니다.

|ID|등급|이름|초상화|
|---|---|---|---|
|s1|S|엘리시아|s1-human-v1.webp|
|s2|S|카이로스|s2-human-v1.webp|
|a1|A|로제린|a1-human-v1.webp|
|a2|A|레오닉|a2-human-v1.webp|
|a3|A|이사벨|a3-human-v1.webp|
|b1|B|라파엘|b1-human-v1.webp|
|b2|B|시그문트|b2-human-v1.webp|
|b3|B|아델린|b3-human-v1.webp|
|c1|C|에드릭|c1-human-v1.webp|
|c2|C|셀레네|c2-human-v1.webp|
|c3|C|루시안|c3-human-v1.webp|
|d1|D|카밀라|d1-human-v1.webp|
|d2|D|테오도르|d2-human-v1.webp|
|d3|D|비올라|d3-human-v1.webp|
|f1|F|에리온|f1-human-v1.webp|
|f2|F|클라리스|f2-human-v1.webp|
|f3|F|줄리안|f3-human-v1.webp|
|f4|F|에블린|f4-human-v1.webp|

## UI

- 기준 시안: 상단 배치 3칸, 칸별 수령, 가운데 1/10회 소환, 아래 가방 4열 및 선택 카드 액션.
- 기존 남색·금색 테마와 실제 게임의 파란색 버튼 그림을 사용합니다.
- 액자 frame-{s,a,b,c,d,f}-v1.webp는 투명 배경입니다. 초상화 위에 겹치며, 이름·별·수치는 HTML 텍스트입니다.
- 하단 메뉴: 캐릭터 / 가방 / 사냥 / 동료 / 보스 / 이벤트 / 상점.
- companions/companion-menu-human-v1.webp와 summon-ticket-v1.webp는 새로 제작한 아이콘입니다.
- companion-preview.html은 로그인·서버 호출 없이 샘플 카드로 동작하는 화면 검수용 페이지입니다. 실제 유저 데이터·골드에는 영향을 주지 않습니다.

## 제작 프롬프트

Portraits: Premium Korean anime fantasy collectible RPG chest-up portraits, adult human men and women only, normal human ears, gorgeous detailed costumes, expressive faces, luminous eyes, coherent painterly shading, navy/gold fantasy world. Exactly 3 columns by 2 rows, equal cells, no text/frames. Cast: celestial guide, crimson swordsman, forest ranger, paladin, arcane scholar, desert gunslinger; frost swordsman, wandering bard, armored engineer, ocean navigator, apothecary, flame lancer; northern scout, cartographer, alchemist, sword trainee, merchant, healer.

Frames: Transparent 3x2 atlas of gold, amethyst, sapphire, emerald, silver and bronze ornate frames, slim medieval filigree and top diamond jewel, empty transparent center, no letters or characters.

Icons: Transparent two-cell atlas; golden parchment summoning ticket with star seal / three overlapping companion portrait cards with a human woman's face, blue and gold palette, no text.
