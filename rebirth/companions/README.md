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

- 기준 시안: 상단 배치 3칸, 칸별 수령, 가운데 1/5회 소환 · 최적 장착, 아래 가방 4열 및 선택 카드 액션.
- 기존 남색·금색 테마와 실제 게임의 파란색 버튼 그림을 사용합니다.
- 액자 frame-{s,a,b,c,d,f}-v1.webp는 투명 배경입니다. 초상화 위에 겹치며, 이름·별·수치는 HTML 텍스트입니다.
- 하단 메뉴: 캐릭터 / 가방 / 사냥 / 동료 / 보스 / 이벤트 / 상점.
- companions/companion-menu-human-v1.webp와 summon-ticket-v1.webp는 새로 제작한 아이콘입니다.
- companion-preview.html은 로그인·서버 호출 없이 샘플 카드로 동작하는 화면 검수용 페이지입니다. 실제 유저 데이터·골드에는 영향을 주지 않습니다.

## 제작 프롬프트

Portraits: Premium Korean anime fantasy collectible RPG chest-up portraits, adult human men and women only, normal human ears, gorgeous detailed costumes, expressive faces, luminous eyes, coherent painterly shading, navy/gold fantasy world. Exactly 3 columns by 2 rows, equal cells, no text/frames. Cast: celestial guide, crimson swordsman, forest ranger, paladin, arcane scholar, desert gunslinger; frost swordsman, wandering bard, armored engineer, ocean navigator, apothecary, flame lancer; northern scout, cartographer, alchemist, sword trainee, merchant, healer.

Frames: Transparent 3x2 atlas of gold, amethyst, sapphire, emerald, silver and bronze ornate frames, slim medieval filigree and top diamond jewel, empty transparent center, no letters or characters.

Icons: Transparent two-cell atlas; golden parchment summoning ticket with star seal / three overlapping companion portrait cards with a human woman's face, blue and gold palette, no text.

## 최적 장착

기본 골드와 별 보너스에 패시브를 반영한 8시간 기대 생산량으로 3장을 선택합니다. 골드형은 고정 보너스, 성장형은 시간별 증가량을 적분하고 이미 배치 중이면 현재 성장 시간을 이어서 평가합니다. 대박형은 기본 생산량에 (1 + 2배 발동 확률)을 곱한 기대값을 사용합니다. 계속 배치하는 카드는 자리와 성장·수령 시각을 보존하고, 교체되는 카드만 기존 누적 보상을 자동 수령합니다. 같은 기대값이면 이미 배치 중인 카드를 우선합니다. 동료가 3장 미만이면 가진 카드만 배치합니다.

소환은 1회/5회만 지원하며 각각 소환권 1장/5장을 사용합니다.

## 2026-10-27 동료 개선
- 5회 소환(소환권 5장), 8시간 기대 골드를 기준으로 패시브·별·기존 성장 시간을 반영한 최적 장착. 유지되는 카드의 누적 시간은 보존.
- 서버 응답 전 즉시 대기 표시, 순차 카드 공개, A 보라빛/S 금빛, 모두 보기.
- 대박형 확률 20~40%. 기존 15~30% 옵션은 동일한 상대 수준으로 1회 보정. 골드형 평균 +30%, 대박형 평균 기대 +30%, 성장형은 장기 배치 보상 유지.
- 기존 계정에 업데이트 우편 소환권 3장. 캠페인 ID와 수령 기록으로 중복 방지.

## 패시브 내부 확률과 효율 조정
- 종류는 1/3 유지. 각 수치 가중치 21→1(합231): 최저9.0909%, 최고0.4329%(종류 내). 특정 종류+최고옵은 전체0.1443%. 기존 옵션 수치 유지.
- 성장 시간당 +10%, 최대30~50% 유지. 새 카드 첫8시간 평균 보너스: 골드/대박26.6667%, 성장25.7143%. 기존 성장 카드도 향상된 증가 속도 적용.
- 안내 버튼에21개 옵션별 종류 내/전체 확률과 효율 비교를 공개.

## 2026-10-30 일반 / 픽업 소환
- 소환 버튼 하나 → 상단 일반/픽업 탭. 열 때마다 일반 탭으로 시작.
- 일반권 기존 지갑, 픽업권 `companions.pickupTickets` 별도 지갑. 1/5회 서버 차감.
- 픽업 S 아스트리아: 기본 8,000~10,000 G/분, 패시브 종류 1/3. 일반 수치 추첨 결과를 2배: 골드/대박40~80, 성장60~100·시간당20. 최고 옵션은 기존처럼 희귀. 일반 풀에는 포함하지 않음.
- 픽업1%, 나머지99% 일반 풀. 천장 없음. 전용권 획득처/가격/지급은 별도 지정 전까지 추가하지 않음. 운영 우편 보상 `pickupTicket` 지원.
- 이미지 생성 도구로 신규 초상·배경·전용권/버튼/프레임 아틀라스 제작, WebP 적용. 경로: `pickup-astria-human-v1.webp`, `pickup-ticket-v1.webp`, `summon-sanctum-v1.webp`, `summon-button{,-active}-v1.webp`, `summon-frame-v1.webp`.
- 프롬프트: celestial adult human queen, silver hair/violet eyes/navy-gold gown and star crystal, portrait; moonlit celestial gothic sanctuary empty center; transparent 2x2 atlas pickup star ticket, navy button, violet button, hollow gold dialog frame. No lettering. Built-in image generation.
