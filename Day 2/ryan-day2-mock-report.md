# BookSwap — Mock Smoke Test Report

## Setup
- Prism command used (`npx @stoplight/prism-cli mock ryan-day2-bookswap-openapi.yaml --port 4010`)
- Postman collection link: https://ryanmariofdo-6715607.postman.co/workspace/Ryan-Mario's-Workspace~0660d1e2-b1b9-462a-8ef4-42c7717757bb/collection/59082658-879fdfb7-1873-4326-b5ff-96aab265e5fd?action=share&creator=59082658

**Note**: Requires paid plan to open shared collection link. Screenshots available in /Day2/screenshots or collection exported also available inside /Day2

## Results Summary
| Metric | Target | Achieved |
|--------|--------|----------|
| Tests run | 5 | 5 |
| Tests passing against the mock | 5 | 5 |
| Endpoints with explicit error responses | 4+ | 9 of 9 |

## Findings
### What did the mock reveal that the OpenAPI on its own did not?
- Any token is accepted. Prism only checks that a Bearer token is present, so Bearer test passed. Real JWT validation (signature, expiry) cannot be tested here.
- Error responses are specific and readable after a fix.
Test 3 returns validation_failed with details naming title. Test 5 returns unauthorized with "Missing or invalid token".
Why it matters: This confirms fixes 1 and 2 above. An app can now show a useful message for each error.
- The same book looks different in two responses.
Book ID 42 came back as condition: good with a real photo URL in Test 1, but as condition: new with photoUrl: http://example.com in Test 2.

### Which endpoints feel awkward to call?

- **POST /books/{bookId}/borrow-requests** takes no body at all, so a borrower cannot attach a note to the owner.
- **PUT /books/{bookId}/photo** needs a multipart file upload, which is much harder to call than the JSON endpoints.

## Spec changes you would make
1. Let a borrow request carry an optional note so it fixes awkward endpoint no. 1
2. Give the Book schema one example, so it fixes finding no. 3