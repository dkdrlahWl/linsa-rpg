-- Saturdays 12:00 UTC = Saturdays 21:00 Asia/Seoul. UI calls also recover missed draws.
select cron.schedule('ringu-weekly-lotto','0 12 * * 6',$$select rebirth_private.lotto_settle();$$);
