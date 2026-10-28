# BookSwap — Observability Plan

## Setup
- **Logs (Collection of information about usage of a system over time):** Azure Monitor Logs
    - **Schema (every log line):** `timestamp`, `requestId`, `memberId`, `event`, `endpoint`, `statusCode`, `durationMs`.
    - **Retention (How long logs are kept):** 
    - **Redaction (What private data is removed before saving):** Remove members' personal data (PII) and Authorization header and any JWT before logging.

- **Metrics (numeral data that track anything about environment overtime):** Azure Application Insights
    - **Request:**
    - **Dependency:**

- **Traces (Insights of what's happening inside the application):** Application Insights distributed tracing
    - **Sample rate:**

## Results Summary
| Metric | Target | Achieved |
|--------|--------|----------|
| SLOs covered by an alert | 100% | 100% (6 of 6 SLOs have at least one alert) |
| Alerts with a clear runbook link | 100% | 100% (10 of 10 alerts link to a runbook failure section) |
| Dashboards for ops | 1 health, 1 business | 2 planned (1 health, 1 business), not built yet |

- **What I understood:** The health dashboard lets operations confirm in under 5 minutes that the system is healthy. The business dashboard shows the product team how BookSwap is being used.

## Alert proposal
| Alert | Condition | Severity | Notification | Runbook |
|-------|-----------|----------|--------------|---------|
| Search SLO burn | `GET /books` failure rate over 1% or p99 over 800 ms for 5 minutes | Sev4 | Pager + Teams | reliability/runbook.md#failure-2 |
| Listings endpoint outage | `GET /books` or `POST /books` failure rate over 50% for 2 minutes (checked every 1 minute) | Sev5 | Pager + Teams | reliability/runbook.md#failure-1 |
| Azure SQL connection failures | SQL dependency failures over 10 in 2 minutes | Sev4 | Pager + Teams | reliability/runbook.md#failure-1 |
| Traffic spike or high CPU | App Service CPU over 70% for 5 minutes, or request count over 5× normal for 10 minutes | Sev2 | Pager + Teams | reliability/runbook.md#failure-3 |
| Listing creation SLO burn | `POST /books` failure rate over 1% for 10 minutes | Sev4 | Pager + Teams | reliability/runbook.md#failure-1 |
| Redis unavailable | Redis dependency failures over 10 in 2 minutes, or `Connected Clients` is 0 for 2 minutes | Sev3 | Pager + Teams | reliability/runbook.md#failure-2 |
| Photo upload failures | `PUT /books/{bookId}/photo` server error (5xx) rate over 5% for 15 minutes | Sev2 | Teams | reliability/runbook.md#failure-4 |
| Slow notifications | More than 2% of notifications take over 2 seconds, over 10 minutes | Sev3 | Teams | reliability/runbook.md#failure-5 |
| Request accepted without valid JWT | Any 2xx response to a non-`/health` request with no `memberId` | Sev5 | Pager + Teams | reliability/runbook.md#failure-6 |
| Privacy check failed | Response validation test finds an address or phone field in an API response | Sev5 | Pager + Teams | reliability/runbook.md#failure-7 |

## What we are deliberately NOT alerting on
- 1. **Single failed or slow requests.** One bad request is normal. We alert on the failure rate over a time window, not on one event.
- 2. **Client errors (400, 401, 404, 413, 415, 422).** These are user mistakes, like a wrong file type. They are logged (`auth.failed` is kept for audit) and watched on the dashboard. We only page on a sudden spike.
- 3. **Email digest delays or failures.** Email is best-effort, so a late digest does not hurt users. We show the Service Bus queue length on the dashboard and review it the next working day.
- 4. **Cache misses and a cold Redis cache.** This is normal after a restart. We only alert when Redis is unavailable.
- 5. **Autoscale scale-out events.** Adding servers during the Sunday spike is the design working. We alert only if CPU stays high or users see failures.
- 6. **Retries and the circuit breaker opening briefly.** These are protections working as designed. We alert on the failures users actually see.

# Stuff to ask from Jayath
- Schema
- Severity Levels S2?
- Signals?
- Should every SLO be included in Alert Proposal? If so what about the runbook column?
- Help in Results Summary Table