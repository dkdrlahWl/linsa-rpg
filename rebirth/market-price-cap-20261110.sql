-- 2026-11-10 도현: 거래소 등록 가격 상한 10억 → 100억 G (장비·동료 카드·소모품 총액). 구매 요청(buy_order)은 그대로.
alter table rebirth_private.listings drop constraint listings_price_check;
alter table rebirth_private.listings add constraint listings_price_check check (price>=1 and price<=10000000000);
-- rebirth_private.market(): v_price>1000000000 세 곳과 소모품 총액 상한을 10000000000으로 변경 (라이브에 적용 완료).
