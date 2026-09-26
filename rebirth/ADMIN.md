# Administrator controls

The account named 도현1 (UUID ac3b03f7-5cf0-4df4-b853-b8c9fb6e7930) has the server-managed `auth.users.raw_app_meta_data.ringu_admin` flag. Names and user-editable metadata never grant access. The Edge Function refreshes trusted metadata through the Auth user endpoint on every request; the engine overwrites any saved `isAdmin` display flag.

- Excluded from ranking rows and totals before rank calculation.
- Daily and weekly boss entry counts do not restrict this account. Other modes already allow repeat entry; progression requirements and first-clear tower rewards remain as designed.
- Gold and current material currencies replenish to large finite reserves at each engine command. Engine spending does not deduct them. JSON-safe numbers are used rather than Infinity.
- Level controls accept integers from 1 to 200 and apply the existing stat/equipment/advancement adjustment rules.
- Time skip accepts 1–12 whole hours. It uses the existing hunting settlement in one-hour chunks, pays real rewards, and retains the real server timestamp. Request receipts protect retries. Ordinary offline settlement remains capped at six hours.
- Returning to the hunting screen (including browser visibility restoration) starts hunting unless a boss/party battle is active.

Verification: `node rebirth/admin.test.mjs`, `node rebirth/rankings.test.mjs`, and the mobile browser fixture `reports/admin-ui.mjs`.
