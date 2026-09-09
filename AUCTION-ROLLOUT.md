# 경매장 개발 상태와 안전한 적용 절차

## 상태: 로컬 구현·검증 중 — 운영에는 아직 적용하지 않음

고정가 / 정수 전용 / 수수료 0% 거래 엔진, 4탭 UI와 클라이언트 연결 코드를 작성했다.
이 문서는 완료 선언이 아니다. 운영 SQL 적용·프런트 배포·기존 계정 이전을 하지 않았다.
운영 Supabase에서는 2026-09-09 집계 SELECT만 실행했다: 계정 8개, 장비 2,394개,
중복 장비 ID 0개, 비숫자 ID 0개, 잘못된 인벤토리 형식 0개. 새 경제 게이트웨이는 아직 미설치다.
이 검사는 전체 장비 이름·속성의 호환 검증이나 데이터 백업을 대신하지 않는다.

현재 `ringu_account_before_auction`에 해당하는 원래 저장 함수는 클라이언트 JSON을 저장한다.
`08-costume-integration.sql`도 이를 명시한다. 경매장 트랜잭션만 안전해도 이 경로에서
정수와 장비를 생성할 수 있으면 유저 간 경제는 안전하지 않다.

`10-auction-foundation.sql`은 기본 닫힘이다. `enabled`와 `economy_ready`가 모두 참이고
계정이 운영자 전용 이전을 완료해야 거래 RPC가 작동한다. 이전된 계정은 기존 전체 저장으로
정수·인벤토리를 변경할 수 없다. `11-economy-command-gateway.sql`과 Edge Function,
`economy-client.js`가 일반 성장도 서버 명령으로 처리한다. **서버 함수 배포와 새 클라이언트 준비 없이
플래그부터 켜면 안 된다.** 플래그만 켜는 것을 연동 완료로 취급하지 않는다.

## 기존 코드에서 확인한 규칙

- 부위: 무기 / 투구 / 갑옷 / 바지 / 신발 / 반지 / 귀걸이.
- 등급: 일반 / 희귀 / 레어 / 에픽 / 전설 / 신화 / 타락.
- 개별 장비: 숫자 `id`, `slot`, `rarity`, `name`, `baseAtk`, `enhance`, `transcend`, `optionRolls` 등.
- 인벤토리 용량 제한 없음. 새 제한을 만들지 않았다.
- 장착 장비는 `equipped` 슬롯→숫자 ID 맵. 잠금은 `locked`.
- 장비 ID는 계정별 숫자 카운터이므로 계정 사이 충돌 가능.
- 경매장은 정수만 사용. 요청 중 골드라는 표현은 경매장 결제에 적용하지 않았다.
- 코스튬, 펫, 오라, 계정은 거래 대상이 아니다.

## 주요 파일

- `supabase/10-auction-foundation.sql`: 비공개 테이블, RPC, 권한, 원자적 정산, 호환 이전, 저장 차단.
- `auction.js`, `auction.css`: 경매장 4탭, 상세/확인, 필터/정렬/페이지, 한국어 오류.
- `cloud-adapter.js`: 기존 Supabase 로그인으로 `/api/auction` 전달.
- `safety.js`: 기존 저장 큐와 직렬화, 거래 중 조작 정지, 영수증 조회/동일 요청 재시도, 서버 상태 반영.
- `index.html`: 기존 메뉴에 UI를 추가할 스크립트 연결. 운영에 아직 배포하지 않았다.
- `test/auction-db.test.mjs`: 격리 DB의 실제 RPC 검사.
- `test/presentation-qa.mjs`: 기존 회귀 검사와 경매장 브라우저 검사.
- `supabase/11-economy-command-gateway.sql`: 기존 전체 저장 차단, 서버 명령의 CAS·영수증·소유권 원장, 설정 전용 저장.
- `supabase/functions/ringu-economy/index.ts`: Auth와 최신 세션 검증, 서버 RNG·시간, 재시도, service-role 전용 커밋.
- `supabase/functions/_shared/economy.mjs`, `balance.json`, `pets.mjs`: 기존 실행 코드에서 추출한 수치와 성장 규칙.
- `economy-client.js`: 서버 명령과 기존 화면·강화/소환 연출 연결. 브라우저는 보상을 결정하지 않는다.
- `test/economy*.mjs`, `test/auction-concurrency.test.mjs`: 계산·권한·브라우저 연결·별도 PostgreSQL 연결 검증.

## DB 구조와 처리

`ringu_private` 아래:

| 구조 | 용도 |
|---|---|
| auction_release | 운영 개방 및 서버 경제 이전 게이트 |
| auction_accounts | 검증된 계정 이전 여부 |
| auction_items | 전역 고유 장비 ID, UUID, 소유자, 원본 JSON |
| auction_listings | 판매 중/완료/취소, 원본 장비 스냅샷, 가격, 공개 판매자명 |
| auction_trades | 영구 구매/판매 내역, 매물당 한 행 |
| auction_receipts | 계정+요청 UUID당 한 영수증, 요청 내용과 결과 |
| economy_baselines | 이전 직전 서버 세이브·리비전 보존 |
| economy_receipts | 소환·강화·보상 등 명령 UUID당 결과 영수증 |

모든 테이블은 RLS를 켜고 브라우저 역할의 직접 권한을 회수한다. 비밀키를 프런트에 추가하지 않는다.
계정은 닉네임이 아닌 기존 Supabase Auth UUID/최신 세션으로 식별한다.

등록은 계정 인벤토리와 서버 장비 기록의 정확한 일치를 확인한 뒤 인벤토리 제거·대기 소유권·매물 생성을
같은 DB 트랜잭션으로 처리한다. 옵션은 원본 JSON 그대로 보관한다. 해제/잠금/귀속 조건을 검사한다.

구매는 서버 매물 가격만 읽고 구매자 차감·판매자 전액 지급·원본 장비 이전·매물 종료·내역·영수증을
한 트랜잭션으로 처리한다. 취소도 같은 방식으로 원본 한 개만 반환한다.
등록·구매·취소는 전역 트랜잭션 advisory lock을 **계정 잠금보다 먼저** 잡는다.
친구 약 10명 규모에서 쓰기를 직렬화하고 계정 교차 거래의 잠금 순서 역전을 피하는 의도다.
매물 및 아이템 행 잠금, 활성 매물별 장비 유일 인덱스, 거래 내역의 매물 PK,
계정+요청 ID 유일 키도 별도로 적용한다. 잠금 경합의 실제 여러 연결 검증은 별도 필요하다.

동일 요청 ID+동일 내용은 저장된 결과를 반환하고, ID 재사용 시 내용이 다르면 거절한다.
통신 실패 후 영수증을 조회하고, 없을 때만 같은 ID로 재시도한다. 미확정 요청은 계정별 브라우저
저널로 보존하며 다음 로그인에서도 이전 요청을 먼저 확인한다. 새 ID를 무조건 발급하지 않는다.

## 호환 이전

운영자 전용 `ringu_private.auction_import(uuid)`는 기존 인벤토리 각 장비에 전역 숫자 ID와 UUID를
한 번만 부여하고, `equipped` 참조도 함께 치환한다. 기존 ID는 `legacyId`로 남긴다.
새 ID는 이후 등록/구매/취소에서 바뀌지 않는다. 같은 이름의 장비도 독립 기록이다.
실제 속성은 보존한다. 중복된 기존 ID 등 모호한 데이터는 임의로 버리지 않고 이전을 거절한다.
현재는 검증된 테스트 계정에만 사용했다. 브라우저에는 호출 권한이 없다.

## 실행 및 적용 순서

1. 현재 운영을 유지한다. 아래 미완료 항목이 끝나기 전 운영 전환을 하지 않는다.
2. 분리된 개발 Supabase/Postgres에서 기존 01/02와 06~09 다음에 SQL Editor로 10, 11을 순서대로 실행한다.
   전체 SQL이 BEGIN/COMMIT으로 묶여 있다. 오류 시 일부 구조만 적용되는 것으로 취급하지 않는다.
3. Supabase Edge Functions에 `ringu-economy`와 `_shared` 의존 파일을 함께 배포한다.
   CLI 예: `supabase functions deploy ringu-economy --project-ref <검증용 프로젝트> --no-verify-jwt`.
   JWT 검사를 생략하는 것이 아니라 함수 내부 `/auth/v1/user`와 DB 최신 세션 검사로 검증한다.
   런타임 SUPABASE_URL, ANON/PUBLISHABLE 키, SERVICE_ROLE/SECRET 키는 호스팅 서버 환경변수만 사용한다.
   비밀키는 GitHub Pages·cloud-config.js·브라우저·로그에 넣지 않는다.
   기본 허용 Origin은 `https://dkdrlahwl.github.io`; 검증 환경은 RINGU_ALLOWED_ORIGINS로 지정한다.
4. 운영 DB의 현재 세이브를 별도 백업·검증한다. 클라이언트가 보낸 스냅샷을 신규 신뢰 원장으로 삼지 않는다.
5. 서버·브라우저·실제 다중 연결 시험을 끝내고, 유지보수 시간에 계정 이전 및 클라이언트 전환을 설계한다.
   현재 접속자가 기존 클라이언트로 계속 보상/소환을 처리하는 동안 전환하지 않는다.
   친구들에게 잠시 접속을 종료하도록 안내하고 기존 저장 완료를 확인한 후 서버/클라이언트를 함께 전환한다.
   이 작업에서는 운영자와 점검 시간을 조율하거나 접속자를 강제 종료하지 않았다.
6. 그 후에만 개방한다. 이 파일에는 실수로 복사해 운영을 여는 SQL을 제공하지 않는다.

## 남은 필수 작업

- 실제 Supabase Edge 런타임에서 Auth/네트워크 오류·시간 초과·사용량 검증. 로컬 테스트는 호스팅 런타임 검증을 대신하지 않는다.
- 온라인·백그라운드·재접속 시간 경계와 코스튬/파티/경제 명령 경합의 전체 규칙 회귀 검사.
- 운영에 존재하는 모든 구형 세이브 형식의 읽기 전용 사전 검사. 중복 ID·알 수 없는 장비를 임의 삭제하지 않는다.
- 사용자 수와 호출 주기에 따른 호스팅 사용량 확인. 무료 운영을 보장하지 않는다.
- 운영 SQL 적용, 새 클라이언트 배포, 운영 검증. 아직 하지 않았다.

## 검증 보고

`test/auction-db.test.mjs`는 로컬 임시 PGlite(Postgres)만 사용한다. 운영 계정/재화/장비는 변경하지 않는다.
실제 동시 연결을 지원하는 테스트로 과장하지 않는다. 실행 결과는 콘솔의 passed/notRun에 출력된다.
검사: A 등록/B 정수 구매, 전액 지급, 옵션 유지, 취소, 부족한 정수, 재전송, 오래된 매물,
다른 계정 행위, 최신 버전으로 위조 스냅샷 제출, 강제 정산 오류의 전체 롤백, DB 재시작 후 유지.

브라우저 테스트는 모의 데이터만 그리는 화면 테스트가 아니라 격리 DB의 RPC에 연결한다.
시험 계정의 초기 재화·장비는 격리 DB에서만 주입한다. 운영 계정에는 지급하거나 변경하지 않는다.
`test/economy-browser.test.mjs`는 10/11 SQL과 서버 계산 엔진을 사용하는 두 브라우저를 검증한다.
위조 전체 저장의 재화/아이템 변경 무시, 일일 보상 응답 유실 후 같은 요청 재시도, 오프라인 판매,
원본 아이템 이전, 소환·펫과 재접속 유지가 통과했다. 실제 Deno HTTP 배포 검증은 별도로 남아 있다.
`test/economy.test.mjs` 14개 검사 통과: 690개 공격력/옵션 표본 대조, 보상·소환·강화·펫·우편·관리자·던전·짧은 백그라운드 복귀 등.
`test/economy-edge.test.mjs` 실제 HTTP 핸들러를 Node의 플랫폼 모의 바인딩으로 실행한 3개 검사 통과.
Origin/Auth 거부, 잘못된 입력, 커밋 후 전송 실패를 재시도 가능한 오류로 분류하는 동작을 확인했다.
`supabase/12-economy-preflight-readonly.sql`은 운영 계정 형식·중복 장비 ID를 개인정보나 저장 내용 없이
집계하는 읽기 전용 검사다. 거래를 열거나 유저 데이터를 변경하지 않는다.
`test/presentation-qa.mjs` 기존 코스튬/펫/아트/강화/모바일 및 경매장 회귀 검사는 통과했다.

실제 다중 연결 시험은 `QA_POSTGRES_BIN`에 PostgreSQL bin 경로를 지정하고
`node test/auction-concurrency.test.mjs`를 실행한다. 새 임시 클러스터와 loopback 전용 포트만 사용하며
DATABASE_URL이나 기존 운영 DB를 사용하지 않는다. 시험 후 서버를 종료하고 로그를 보존한다.
2026-09-09 로컬 PostgreSQL 17.11에서 실제 실행 통과: buy/buy 10회, buy/cancel 10회,
동일 요청 8개 동시 실행, 서로의 물품 교차 구매, 원본 속성 유지 및 전체 정수 보존.
공식 PostgreSQL Windows 배포 안내의 EDB 바이너리를 테스트에만 사용했다:
https://www.postgresql.org/download/windows/ · https://www.enterprisedb.com/download-postgresql-binaries

### 서버 전환 시 주의

10의 `enabled=false`는 경매장만 닫는다. 11의 `economy_ready`를 끄더라도 이미 이전된 계정의
클라이언트 전체 저장을 다시 허용하지 않는다. 이것은 거래 후 예전 인벤토리 부활을 막는 의도다.
롤백은 단순히 이전 HTML로 돌아가는 작업이 아니다. 거래 개시 이후에는 현재 DB 원장을 보존한 채
호환 코드를 복구해야 하며, economy_baselines를 운영 상태 위에 덮어쓰면 안 된다.
