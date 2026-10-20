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


## 4. Queue plan
- Which work goes on a queue and why
- What happens if the consumer is down for 30 minutes