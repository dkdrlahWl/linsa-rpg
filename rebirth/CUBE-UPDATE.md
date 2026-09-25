# 현재 적용: 레드·블랙·프라임 3종

2026-09-25 후속 요청으로 8종에서 3종으로 정리했다. 수상한 1개 → 레드 1개, 장인 1개 → 레드 2개, 명장·실버 각 1개 → 블랙 1개, 골드 1개 → 블랙 2개로 전환한다. 거래소의 단종 큐브 미판매 물량은 판매 취소 후 같은 비율로 반환한다. 이전에 확정된 판매 대금과 잠재 결과는 유지한다. 아래 8종 설명은 개편 이전 기록이다.

# 큐브 개편 — 2026-09-25

## 범위

사용자 최종 요청: 전체 게임 개편은 중단하고 큐브를 메이플 방식으로 변경한다. 옵션 효과는 현재 게임에 있는 것만 사용한다.

- 품질 재감정 명령과 화면 제거. 기존 품질이 적용된 공격력/주스탯은 기본 수치로 변환하여 보존.
- 장비 전체 잠재 등급: 레어 / 에픽 / 유니크 / 레전더리. 각 옵션 줄의 등급은 재설정 때 다시 추첨.
- 레드, 블랙, 수상한, 장인, 명장, 프라임, 실버, 골드 큐브.
- 블랙/실버/골드: 이전·이후 등급과 옵션을 함께 선택. 나머지: 즉시 적용.
- 프라임: 레전더리에서 첫 줄 고정. 두 번째 이후만 재설정.
- 기존 cube / highCube 수량은 각각 레드 / 블랙 수량으로 유지.
- 기존 옵션은 최초 재설정 전까지 값 그대로 유지. 이전 방식의 미선택 결과도 보존.
- 선택 대기 중 다시 사용/거래/장비 변경 방지. 결과 선택은 재료를 재소모하지 않음.
- 큐브마다 최대 등급, 등급 상승 확률, 줄별 등급 확률 적용. 레드/블랙 실패 보장 카운터는 종류·등급별 저장.
- 신규 큐브 교환 및 거래소 등록/부분 구매/취소 지원.

## 공식 자료와 적용 차이

조회일: 2026-09-25.

공식 등급 상승/줄별 등급 확률:

- https://maplestory.nexon.com/Guide/OtherProbability/cube/red
- https://maplestory.nexon.com/Guide/OtherProbability/cube/black
- https://maplestory.nexon.com/Guide/OtherProbability/cube/strange
- https://maplestory.nexon.com/Guide/OtherProbability/cube/master
- https://maplestory.nexon.com/Guide/OtherProbability/cube/artisan
- 실버/골드 결과 선택: https://maplestory.nexon.com/news/update/799

세부 옵션 표는 공식 페이지가 사용하는 GetSearchProbList 응답을 보관했다.
scripts/fetch-maple-cubes.mjs → maple-cube-tables.json
scripts/compile-maple-cubes.mjs → maple-cube-pools.mjs

9개 게임 부위를 공식 무기/모자/상의/하의/장갑/신발/반지/귀고리/펜던트에 대응한다.

**공식 게임과 100% 같은 옵션 분포는 아니다.** 사용자의 “현재 우리 게임에 있는 것들만” 지시에 따라 지원하지 않는 MP, 마력, 방어율 무시, 스킬 등은 추첨 대상에서 제외한다. 현재/하위 등급 확률은 유지하고, 각 등급 안에서 남은 옵션의 공식 비율을 정규화한다. 공격력/방어력의 고정 수치는 이미 존재하는 해당 능력치에 가산한다. 공식 기본 잠재 표에 없는 기존 경험치 옵션은 새 큐브에서 나오지 않으며 기존 값만 보존한다.

원본 확률은 공개된 반올림 수치 기준이다. 부위·레벨 조합이 공식 사이트에서 “장비 없음”으로 응답하면 같은 부위의 가장 가까운 지원 레벨 표(동거리면 낮은 레벨)를 사용한다. 해당 참조 레벨은 게임 안 확률표에도 표시한다.

기존 결과와 옵션 종류·수치가 모두 같으면 다시 추첨한다. 난수 공급이 고장 나 동일 결과만 반복될 경우 거래 전체를 취소하고 재료를 소비하지 않는다. 게임에 포함한 옵션 중에는 공식 1개/2개 제한 대상인 스킬/무적/피격 무시 옵션이 없어 이 제한은 발생하지 않는다.

잠재 부여·확장 및 교환소 가격은 게임 재화 기준이다. 큐브 사용은 해당 큐브 1개를 소비한다. 에디셔널 잠재, MP 등 새로운 전투 시스템은 추가하지 않는다. 실패 보장 카운터는 이 게임의 한 플레이어 저장 단위에 보관한다.

## 백업과 배포 상태

기존 전체 백업:
../ringu-backups/before-maple-20260925/game
../ringu-backups/before-maple-20260925/history.bundle

큐브 개편은 2026-09-25 전체 밸런스 개편과 함께 운영 반영한다. 아래 검증 기록은 이전 큐브 단독 작업 당시의 기록이며, 이번 전체 개편은 사용자 요청에 따라 테스트하지 않았다. 상세 변경은 JOURNEY-UPDATE.md 참조.

운영 반영 시 웹 파일과 ringu-rebirth Edge Function의 engine/data/maple-cubes/maple-cube-pools 모듈을 함께 갱신해야 한다. 또한 기존 스키마 위에 rankings.sql, individual-gear-party.sql, individual-gear-market.sql 변경을 반영해야 한다. 새 설치는 기존 SQL 적용 순서를 유지한다. 기존 사용자 데이터는 서버 명령 처리 시 점진적으로 정규화한다.

## 검증

- maple-cubes.test.mjs: 종류/등급/부위/레벨 표, 확률 경계, 실패 보장, 선택, 프라임 고정, 보호 장비와 재료 부족, 이관.
- quality.test.mjs: 2,424개 기존 장비 조합 성능 보존과 품질 명령 제거.
- maple-cubes.browser.test.mjs: Chrome, 390px/1280px. 로컬 서버 + 모의 API. 레드/블랙/프라임 실제 화면 조작, 확률표, 넘침/스크립트 오류 검사.
- engine / character-stats / auto-equip / star-growth 회귀 검사.
- rankings / raid-v2 / consumable-market: 로컬 PostgreSQL(PGlite)에서 서버 능력치 일치, 파티 보상, 11종 재료 거래 및 권한 검사.

운영 계정을 이용한 실서비스 검증은 수행하지 않았다.

