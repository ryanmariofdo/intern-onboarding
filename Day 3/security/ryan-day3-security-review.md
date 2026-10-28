| Category | Question | Finding | Severity (H/M/L) | Mitigation |
|----------|----------|---------|------------------|------------|
| Authn | Is every non-public endpoint protected by JWT? | The spec requires a bearer token everywhere. But Prism accepts any token, so JWT checks can't be tested on the mock. Real checks (signature, expiry ≤ 1 h) live in the API. |      M        |      Reject tokens with algorithm "none". Set token lifetime to 1 hour or less in Entra External ID. Keep only `/health` public      |
| Authz | Does every /{id}-shaped endpoint check object ownership? |    `GET /books/{bookId}/loans` has no ownership check and no 403 response in the spec. Example: member 5 sends `GET /books/42/loans` with their own token. Book 42 belongs to member 3. The API returns member 3's borrower history. This breaks the rule "a member must never see another member's loan history". IDs are also plain numbers (1, 2, 3), so they are easy to guess.     |       H           |     Add an ownership check in the SQL query: `WHERE b.id = @bookId AND b.owner_id = @callerId`. If no row comes back, return 404. Apply the same rule to `/loans/{loanId}`, `/borrow-requests/{requestId}`, and `/books/{bookId}/photo`. Add a 403 response to the spec       |
| Injection | Are all DB queries parameterised? |    `GET /books` takes free text from the user. If the code joins that text into a SQL `LIKE` string, an attacker can run their own SQL.     |         H         |      Always use parameters. Never join user text into SQL.      |
| Secrets | Where are connection strings stored? |    Azure SQL connection strings, Redis password, Blog Storage keys at risk if stored in .env and committed    |        H          |      Store the SQL, Redis, and Service Bus secrets in Azure Key Vault. App Service reads them with a managed identity (Key Vault references). Rotate them every 3 months. Add `.env` to `.gitignore` to avoid pushing to GitHub.      |
| Transport | Is TLS enforced at Front Door? |    Front Door must only allow HTTPS. Risk: attackers call the App Service URL directly and skip the WAF and rate limits.     |        M          |       On App Service, turn on "HTTPS only" and add an access restriction that allows only the Front Door service tag.     |
| Rate limit | Are auth and write endpoints rate-limited? |    Not yet. API endpoints with no limit: `POST /books/{bookId}/borrow-requests` (spam), `POST /books` (fake listings), `PUT /books/{bookId}/photo` (5 MB uploads), and repeated login failures.     |        M          |       Add an Azure Front Door WAF rate-limit rule: 20 requests per minute per IP on `POST` endpoints, and 5 failed auth attempts per minute per IP. Return 429 with a `Too Many Requests & Retry-After` message. Add 429 to the OpenAPI spec.     |
| PII | What PII appears in responses, logs, or queues? |  Responses are clean: the schemas have no address or phone fields. But logs and queues can leak.  |       M           |     Add an App Insights telemetry processor that removes the `Authorization` header, request bodies, and the `search` value. Log only the member ID and request ID. Put member IDs in Service Bus messages and look up emails inside the worker.       |


## ZAP baseline finding

**Scan:** OWASP ZAP baseline against the Prism mock at http://127.0.0.1:4010 (report: ryan-day3-zap-baseline-report.html).

**Result:** 0 fail, 2 warnings, 66 passes.

**Finding discussed:** Cross-Domain Misconfiguration (rule 10098), risk Medium.

**What it means:** The mock answers with `Access-Control-Allow-Origin: *`. That tells browsers any website may read the responses.

**Real issue or false positive?** Partly a false positive: this header is Prism's default and the mock is not the real API. But it is a real risk if the production API copies it, because a malicious site could call the API from a member's browser.

**Action:** In the real API, set CORS to allow only the BookSwap app's origin, not `*`. Remove CORS headers entirely for the mobile app, since React Native doesn't need them.

**Limitation:** ZAP only reached `/`, `/robots.txt` and `/sitemap.xml` (all 404), so it never tested `/books` or other endpoints. A fuller scan would need the API scan mode with the OpenAPI file.
