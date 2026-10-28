# BookSwap — Observability Plan

## Setup
- **Logs (Collection of information about usage of a system over time):** Azure Monitor Logs
    - **Schema (every log line):** `timestamp`, `requestId`, `memberId`, `event`, `endpoint`, `statusCode`, `durationMs`.
    - **Retention (How long logs are kept):** 90 days for all logs. This covers the 28-day SLO window with room to spare. Audit logs (auth failures, loan created or returned) are kept for 1 year. 
    - **Redaction (What private data is removed before saving):** Remove members' personal data (PII) and Authorization header and any JWT before logging.

- **Metrics (numeral data that track anything about environment overtime):** Azure Application Insights
    - **Request:** request count, duration (p95 and p99), and failure rate for each endpoint, such as `GET /books` and `POST /books`.
    - **Dependency:** duration and success of calls to Azure SQL, Azure Cache for Redis, Blob Storage, and Service Bus.

- **Traces (Insights of what's happening inside the application):** Application Insights distributed tracing
    - **Sample rate:** keep 100% of failed or slow (over 800 ms) requests. Keep 10% of successful requests to control cost during a 10× spike.

## Signals
| # | Signal type | Source | What it answers | Sample query / metric name |
|---|-------------|--------|-----------------|----------------------------|
| 1 | Metric | Application Insights | Search latency p95 | `requests \| where name == "GET /books" \| summarize percentile(duration, 95) by bin(timestamp, 1m)` |
| 2 | Metric | Application Insights | Listing creation success rate | `requests \| where name == "POST /books" \| summarize successRate = 100.0 * countif(success == true) / count() by bin(timestamp, 5m)` |
| 3 | Log | Application Insights traces | Authn failures with member ID | `traces \| where customDimensions.event == "auth.failed" \| project timestamp, customDimensions.requestId, customDimensions.memberId` |
| 4 | Trace | Application Insights | Slow request breakdown across DB and Redis | `requests \| where name == "GET /books" and duration > 800 \| join kind=inner (dependencies \| project operation_Id, depType = type, depMs = duration) on operation_Id \| project timestamp, operation_Id, duration, depType, depMs` |
| 5 | Metric | Azure Service Bus | Email digest queue depth | Metric `ActiveMessages` on the digest queue |
| 6 | Log | Azure Monitor Logs | Who created or returned a loan (audit) | `traces \| where customDimensions.event in ("loan.created", "loan.returned") \| project timestamp, customDimensions.requestId, customDimensions.memberId, customDimensions.event` |
| 7 | Trace | Application Insights | Full path of one request, from API to SQL and Redis | `union requests, dependencies, traces \| where operation_Id == "<requestId>" \| order by timestamp asc` |
| 8 | Metric | Application Insights | In-app notification delivery time | `customMetrics \| where name == "notification.delivery_ms" \| summarize percentile(value, 98) by bin(timestamp, 5m)` |

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