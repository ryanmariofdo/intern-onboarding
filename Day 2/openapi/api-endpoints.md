# Summary of API Endpoints for BookSwap

All endpoints require Authorization: Bearer <JWT>, so every one can return 401

## Books

| Method | Path | Purpose | Success | Errors |
|--------|------|---------|---------|--------|
| GET    | /books | Search and list books | 200 | 400, 401 |
| POST   | /books | List a new book | 201 | 400/422, 401 |
| GET    | /books/{bookId} | Get a book | 200 | 401, 404 |
| GET    | /books/{bookId}/loans | Borrower history for a book | 200 | 401, 404 |
| PATCH | /books/{bookId} | Edit details or toggle available/unavailable | 200 | 400/422, 401, 403, 404 |
| DELETE    | /books/{bookId} | Remove a book | 204 | 401, 403, 404, 409 |
| PUT    | /books/{bookId}/photo | Upload photo. Stored in Blob, with the URL saved on the book | 200 | 401, 403, 404, 413, 415 |

## Borrow Requests
| Method | Path | Purpose | Success | Errors |
|--------|------|---------|---------|--------|
| POST    | /books/{bookId}/borrow-requests | Request to borrow this book | 201 | 401, 404, 409, 422 |
| GET    | /borrow-requests | Search and list books | 200 | 401 |
| GET    | /borrow-requests | Show requests. Query: role=incoming, outgoing, status, page, pageSize | 200 | 401 |
| GET    | /borrow-requests/{requestId} | Get one request | 200 | 401, 403, 404 |
| PATCH    | /borrow-requests/{requestId} | Owner sets status to accepted or declined. Borrower can set cancelled. Accepting creates a Loan | 200 | 400, 401, 403, 404, 409 |

## Loans
| Method | Path | Purpose | Success | Errors |
|--------|------|---------|---------|--------|
| GET    | /loans | See my loans | 200 | 401 |
| GET   | /loans/{loanId} | Get one loan | 200 | 401, 403, 404 |
| PATCH    | /loans/{loanId} | Mark returned | 200 | 401, 403, 404, 409 |

## Notifications
| Method | Path | Purpose | Success | Errors |
|--------|------|---------|---------|--------|
| GET    | /notifications | See my notifications | 200 | 401 |
| PATCH    | /notifications/{notificationId} | See my notifications | 200 | 401 |

## Members
| Method | Path | Purpose | Success | Errors |
|--------|------|---------|---------|--------|
| GET    | /members/me | Show my profile (display name, digest opt-in) | 200 | 401 |
| PATCH  | /members/me | Update display name and digest opt-in | 200 | 400/422, 401 |
| GET    | /members/{memberId} | Public profile (display name only) | 200 | 401, 404 |