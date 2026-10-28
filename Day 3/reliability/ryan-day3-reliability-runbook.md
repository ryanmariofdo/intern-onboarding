# BookSwap — Reliability Runbook v0.1

## Failure 1: Azure SQL primary unavailable for 5 minutes

### What the user sees
- User will experience delay in Listing creation with a popup message "Server is currently facing high amount of traffic. Try again later" (503 error).

### Detection
- /health starts failing because SQL is unreachable.
- Using Azure Monitor will alert failures happening in SQL connections.
- Fires if more than 5% fail for 3 minutes.

### Mitigation in design (timeouts, retries, circuit breaker, fallback)
- Database timeout: 3 seconds.
- Retry reads 3 times. Wait 200 ms, 400 ms, then 800 ms.
- Circuit breaker: after for example 5 failures in a row, it then opens. Calls fail fast for 60 seconds.
- Then half-open: let 1 test call through. If it works, close. If not, open for another 60 seconds.
- Fallback: show cached search results from Azure Cache for Redis.
- Idempotency key: the app sends a unique Idempotency-Key. If it retries, the server sees the same key. It returns the first result and creates no duplicate listing.

### Manual response (who is paged, what they do)
- The on-call engineer is paged.
- Escalate to the tech lead after 15 minutes.
- Check Azure Resource Health for the SQL server.
- If it hasn't recovered after 5 minutes, start it manually.

### Post-incident actions
- Write a short breif on what happened and the root cause.
- Team should review and discuss of what went wrong.

## Failure 2: Azure Cache for Redis is down
### What the user sees
- Search catalogue will timeout or will require sometime to load than usual.
- Book details as mentioned in Day 2 Cache Plan, will also face the same issue at search catalogue.
- Overall user experience will be laggy.

### Detection
- Azure Monitor, where Azure SQL will get lots of requests. (Remember Cache-Aside concept when cache isn't available, it captures from Database, so here it would be unsual amounts of requests)

### Mitigation in design
- Fall pack to Azure SQL database (Cache-Aside).
- Circuit breaker: after 5 failures in a row, it opens. Redis is skipped for 60 seconds.

### Manual response
- The on-call engineer is paged.
- Escalate to the tech lead after 15 minutes.
- Check Azure Resource Health for the Redis instance.
- If Redis doesn't recover after 15 minutes, restart or scale it in the Azure portal.

### Post-incident actions
- Discuss with team.
- See if it needs to be scaled.
- Check if the performance speed only degrades, if something breaks, then that needs to be added to Cache-Aside Fallback.

## Failure 3: Sunday tabloid spike — 10× sustained traffic
### What the user sees
- Users might feel bit lag and loading time.
- Users might experience timeouts in searches and listings.
- Sometimes 5xx error will occur due to high traffic in servers.

### Detection
- Azure Monitor alerts CPU usage exceeding.
- Due to CPU high usage, Automatic Scalling triggers.

### Mitigation in design (autoscale, queue depth, throttling)
- Enable Automatic Scaling.
- Rate Limiting on API Endpoints.

### Manual response
- On call enginers are alerted.
- Observer Auto Scaling logs.
- Set minimum instances (eg: 10)
- If CPU usage is still high, manually increase minimum instances (eg: 15)

### Post-incident actions
- Analyze traffic patterns during peak and non-peak hours.
- Run a load test at 10× during normal traffic and observe.
- Add a read replica for search queries, so reads don't hit the primary.

## Failure 4: Photo uploads are failing
### What the user sees
- Uploading a book photo fails with an error and the user can retry.
- The book listing itself is still created, just without a photo.
- Photos that were already uploaded still load.

### Detection
- Alert on App Insights `requests` where name is `PUT /books/{bookId}/photo` and the 5xx rate is over 5% for 15 minutes.
- Azure Blob Storage metric `Availability` dropping below 99%.
- Client errors such as 413 (file too big) and 415 (wrong file type) are not counted. Those are user mistakes.

### Mitigation in design
- Upload timeout: 30 seconds.
- Retry the Blob write 3 times. Wait 200 ms, 400 ms, then 800 ms.
- Listing creation does not wait for the photo, so a Blob outage never blocks new listings.
- Photos are never stored in the database, only the file name.

### Manual response
- The on-call engineer is alerted in Teams.
- Check Azure Resource Health for the storage account.
- Check the Azure status page for a regional problem.
- Check that the storage key or connection setting in Key Vault has not expired.
- Escalate to the tech lead after 30 minutes.

### Post-incident actions
- Write a short brief on what happened and the root cause.
- Add a "try again later" message in the mobile app so users know the book can get a photo later.

## Failure 5: In-app notifications are slow
### What the user sees
- The owner gets the "someone wants to borrow your book" notification late (over 2 seconds).
- Nothing is lost. The notification still appears when the app refreshes.

### Detection
- Custom metric `notification.delivery_ms` in Application Insights.
- Alert when more than 2% of notifications take over 2 seconds, over 10 minutes. This protects the 98% within 2 seconds SLO.

### Mitigation in design
- The notification is saved in Azure SQL first, then shown through `GET /notifications`.
- Notification timeout: 2 seconds.
- Retry delivery 3 times. Wait 200 ms, 400 ms, then 800 ms.
- If delivery keeps failing, the notification stays saved and appears on the next refresh.

### Manual response
- The on-call engineer is alerted in Teams.
- Check Azure SQL and App Service CPU. Slow notifications usually mean the database or servers are overloaded.
- If so, follow Failure 1 (SQL) or Failure 3 (traffic spike).
- Escalate to the tech lead after 30 minutes.

### Post-incident actions
- Write a short brief on what happened and the root cause.
- Check if notifications need their own scaling or a faster path.

## Failure 6: A request is accepted without a valid JWT
### What the user sees
- Nothing, and that is the danger. Someone without a valid token can read or change data.

### Detection
- App Insights query: any 2xx response to a request that is not `/health` and has no `memberId`.
- Checked every 1 minute. Any single hit pages the on-call engineer.
- This protects the SLO that every request, except `/health`, needs a valid JWT.

### Mitigation in design
- The API checks every JWT first: signature, issuer, audience, and expiry.
- Tokens expire within 1 hour. Tokens with algorithm "none" are rejected.
- Only `/health` is public.
- Azure Front Door WAF limits failed authentication to 5 attempts per minute per IP.

### Manual response
- The on-call engineer is paged and the tech lead is told straight away.
- Roll back the latest deployment. A broken or disabled JWT check is the most likely cause.
- If the cause is not clear, block the affected endpoint at Front Door.
- Use the audit logs (`requestId`, `memberId`) to find what was accessed.

### Post-incident actions
- Write a brief on what happened and the root cause.
- Add an automated test that calls every endpoint with no token and expects 401.
- Review all endpoints for the same mistake.

## Failure 7: Address or phone number appears in an API response
### What the user sees
- Members could see other members' addresses or phone numbers. This breaks the privacy rule.

### Detection
- A response validation test checks API responses for address and phone fields.
- Alert when the test finds one.
- This protects the SLO that API responses never return addresses or phone numbers.

### Mitigation in design
- The API response schemas in the OpenAPI spec have no address or phone fields.
- Responses are built from a list of allowed fields. Never use `SELECT *` in responses.
- A contract test in the build checks every response against the spec.

### Manual response
- The on-call engineer is paged and the tech lead is told straight away.
- Roll back the latest deployment or turn off the affected endpoint.
- Use the logs (`requestId`, `memberId`) to find which members were affected.
- Follow the company's data breach process for informing people.

### Post-incident actions
- Write a brief on what happened and the root cause.
- Add the failing case to the automated tests.
- Review every endpoint that returns member data.