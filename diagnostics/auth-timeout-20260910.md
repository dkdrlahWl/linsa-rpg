# Login incident: LI2-AUTH (2026-09-10)

Status: upstream service latency reproduced; restoration of real-user login is not verified. No production application deployment or database modification was made during this diagnostic session.

## Observed evidence

The deployed transport on main commit `0e24f23b3a1dc33a7ba90996a39c16682829b520` reports stage `auth` before requesting Supabase `/auth/v1/token?grant_type=password`. The account RPC, inventory loading, and gameplay initialization occur after a token response. A LI2-AUTH timeout therefore reports no completed authentication response within the 30-second login deadline; it is not a completed invalid-password result.

Independent probes ran from GitHub Actions, run `34449169427`, job `102780650764`, between 07:16:56 and 07:17:26 UTC on 2026-09-10. The workflow used only the site's already-public publishable key and no user credentials or authenticated sessions. The password endpoint received an empty JSON body to measure validation latency, not an attempt to sign into a player account.

| Probe | HTTP result | Total time | TLS connection ready |
|---|---|---:|---:|
| Deployed login transport JavaScript | 200; LI2 present | 0.133037 s | 0.054183 s |
| Supabase Auth health | 200 | 9.885250 s | 0.037040 s |
| Empty password-grant request | 400, expected rejection | 9.817001 s | 0.036328 s |
| Anonymous account ping | No response bytes before timeout | 20.002908 s | 0.038332 s |

Auth health request ID: `01a08a2d-4138-744d-8aee-1ef72df8c3f0`.
Empty password-grant request ID: `01a08a2d-4170-7770-b5b8-5045523a92ee`.
Results are stored in the workflow artifact `auth-diagnostic-results`.

## Database checks

The management API reported project status `ACTIVE_HEALTHY`. At 07:12:21 UTC the database reported max_connections 60, total backends 22, active backends 6, lock waiters 0, and auth-role connections 2. The earlier activity snapshot likewise had no blocking PIDs. These are point-in-time measurements, not proof that transient saturation never occurs.

Several independent management SQL reads failed with `Connection terminated due to connection timeout`; other metadata reads succeeded. We did not obtain CPU, RAM, disk-I/O graphs or Supabase Auth service logs. Resource exhaustion, a gateway/service process problem, and transient infrastructure degradation are not yet distinguished. The available connector exposes SQL/project status but no Auth log-read or Restart Project action. Pausing/restoring was not substituted for Restart.

## Next recovery action

Use the Supabase dashboard General settings for the existing project to run **Restart project**, after capturing current database health/resource graphs if available. This is a recovery attempt, not proof of the root cause. A restart temporarily interrupts connections and can roll back in-flight uncommitted work; it is not a data reset. Do not delete the project, reset the database, disable authentication, or clear local saved game data.

After the project returns to service, repeat the limited public probes and test a real login. If latency persists or returns, inspect resource graphs and Auth/API logs, using the request IDs above in a Supabase support investigation. Do not claim repair completion merely because the health endpoint or deployment reports success.
