# BookSwap — SLI/SLO Map

## 1. NFR inventory
| # | NFR (from Day 2) | User-visible behaviour |
|---|------------------|------------------------|
| NFR1 | Catalogue search response time: under 300 ms p95 for a building with up to 5,000 books | Instant search results appear |
| NFR2 | Listing creation: must succeed even if the email service is down (do not block the user) | Allows users to add books even if email service is down |
| NFR3 | Photo uploads: up to 5 MB JPEG/PNG; never stored in the application database | Allos users to upload photo files upto 5MB |
| NFR4 | Notifications: in-app must arrive within 2 seconds; email digest is best-effort | Allows users to receive instant notifications or alerts when a book swap is requested. Weekly email may arrive late. |
| NFR5 | Privacy: addresses and phone numbers are never returned in API responses (members only) | Members or the public won't be able to see other members'addresses or phone number |

## 2. SLI / SLO table
| # | SLI definition | Measurement source | SLO target | Window | Error budget |
|---|----------------|---------------------|------------|--------|--------------|
| 1 | Catalogue search requests under 800 ms | Application Performance Monitoring (APM) | 99% | Rolling 28 days | 1% |
| 2 | Listing creation | Application Performance Monitoring (APM) | 99.9% | Rolling 28 days | 0.1% |
| 3 | Upload book photo upto 5MB successfully  | Azure BLob Storage logs | 99% | Rolling 28 days | 1% |
| 4 | Time taken for In-App Notifications | Notification Service logs | 98% notifications delivered within 2 seconds   | Rolling 28 days | 2% |
| 5 | Every requests with valid JWT, except /health | API response validation tests | 100% | Rolling 30 days | 0% |
| 6 | API responses shouldn't return addresses or phone numbers | API response validation tests | 100% | Rolling 30 days | 0% |

## 3. Error budget policy
### What the team stops doing when the budget is exhausted
- The team should priotize the fixes based on the error budget brief.
- The team should focus on fixing the main cause of those failures.
- When any SLO error budget reaches 0%, all new feature releases stop.

### Who owns the decision
- On call enginers
- Project Team Lead

## 4. Out of budget right now
- One sentence: which SLO would you bet you cannot meet today and why
- I'd bet that I cannot meet the catalogue search SLO 1 (99% under 800 ms at 10× traffic), because autoscaling and a read replica are only proposed in runbook.md and untested, so a cold or failed Redis cache would send every search to a single Azure SQL database.

