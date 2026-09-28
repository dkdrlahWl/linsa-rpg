# Administrator controls

The account named 도현1 (UUID ac3b03f7-5cf0-4df4-b853-b8c9fb6e7930) has the server-managed `auth.users.raw_app_meta_data.ringu_admin` flag. Names and user-editable metadata never grant access. The Edge Function refreshes trusted metadata through the Auth user endpoint on every request; the engine overwrites any saved `isAdmin` display flag.

- Excluded from ranking rows and totals before rank calculation.
- Daily and weekly boss entry counts do not restrict this account. Other modes already allow repeat entry; progression requirements and first-clear tower rewards remain as designed.
- Gold and all five current material currencies replenish to exactly 999,999,999,999 on every persisted state write. Engine spending does not deduct them. JSON-safe numbers are used rather than Infinity.
- Level controls accept integers from 1 to 200 and apply the existing stat/equipment/advancement adjustment rules.
- Time skip accepts 1–12 whole hours. It uses the existing hunting settlement in one-hour chunks, pays real rewards, and retains the real server timestamp. Request receipts protect retries. Ordinary offline settlement remains capped at six hours.
- Returning to the hunting screen (including browser visibility restoration) starts hunting unless a boss/party battle is active.

Verification: `node rebirth/admin.test.mjs`, `node rebirth/rankings.test.mjs`, and the mobile browser fixture `reports/admin-ui.mjs`.

- Administrators can send gold and every current material from a ranking row. The database checks trusted metadata, validates integer quantities, locks both accounts and the market transaction lock, increments revisions, and stores a request receipt. Deliveries have no fee and go directly into the recipient balance; normal users cannot send.
