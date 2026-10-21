# BookSwap — Storage and Cache Decisions

## 1. Data inventory
| Data type | Example record | Volume estimate (1y) | Read/write ratio |
|-----------|----------------|----------------------|------------------|
| Book listing | 	id, owner, title, author, ISBN, condition, available | ~50,000 rows | Read-heavy |
| Borrow requests | 	id, book, borrower, status (pending / accepted / declined / cancelled) | ~15,000 rows | Both |
| Loans | 	id, book, borrower, lender, borrow date, due date, return date | ~10,000 rows | Both |
| Members | 	id, userId, display name, phone number | ~10,000 rows | Read-Heavy |
| Notifications | 	id, receipientId , message, requested date, read | ~100,000 rows | Write-Heavy |
| Photo Uploads | 	binary (up to 5 MB JPEG/PNG) | ~50,000 photos | Read-Heavy |

## 2. Storage selection
| Data type | Chosen store | Why this store | Why not the alternatives |
|-----------|--------------|----------------|--------------------------|
| Members | Azure SQL | Books, requests and loans all point at a member, so foreign keys keep the data consistent. | Document DB unnecessary, like CosmosDB |
| Book listings | Azure SQL | Searching 5,000 books in one building is fast. An index on ISBN makes searches instant. | Document DB unnecessary, relational joins useful |
| Book photos | Azure Blob Storage | Saves as Binary. Made for big files and cheap. Keeps photos out of the database. | Photos in the database would make backups huge |
| Notifications & Loans Transactions | Azure SQL Database | An index on (member_id, read, created_at) makes unread lookups fast. | Redis won't data permanently will be lost once restarted |

## 3. Cache plan
### What is hot enough to cache?

- Book details: Because often searched from lists and details like title, author and photo rarely change.
- Once in the BookSwap platform, even if a member doesn't search by filtering books, but casually looking at available books, those books details should be cached.

### Cache-aside pattern in pseudocode

```text
getBook(bookId)
Create a cache key using the bookId (e.g., "book:123").

Check Azure Cache for Redis to see if the book data is already stored under that key.

If found in cache: Parse the cached JSON string and return the book data immediately.

If not found in cache:

Query the database for the book with that bookId.

If no database record is found, return null.

Store the retrieved book data in Redis as a JSON string, setting it to automatically expire in 60 seconds.

Return the book data.
```
```text
updateBook(bookId, patch)
Update the book record in the database using the provided changes (patch).

Delete the cached book entry from Redis so the next read fetches the newly updated data from the database.

Return the updated book record.
```

### TTL choice and invalidation strategy
#### TTL (how long a cached copy lives):
- **Book details:** 60 seconds, because titles and authors almost never change.
- **Browse pages:** 30 seconds, because new listings and availability change more often.
- A short TTL means any stale copy fixes itself quickly.

#### Invalidation:
- When a book changes, write to SQL first, then delete its cached copy and bump the building’s version counter, so old browse pages are ignored.
- If that clean-up fails, the TTL removes the stale copy within 60 seconds.
- Loan and borrow-request status is never cached, so staleness can never cause a book to be lent twice.

## 4. Queue plan
### Which work goes on a queue and why
- Emails and weekly digest: In case the email server is down, the app should keep working. Which means, email is slow and can fail, so listing a book or borrowing must never wait for it.

### What happens if the consumer is down for 30 minutes
- Nothing is lost, because Azure Service Bus (Queue) keeps the messages until the worker returns.
- Members aren’t affected, since nothing in the app waits for email.
- The worker catches up within minutes after it restarts, and an alert fires if the oldest message is older than 15 minutes.
- If a message keeps failing:
It’s retried up to 5 times, then moved to the **dead-letter queue**, where someone can inspect it and replay it.