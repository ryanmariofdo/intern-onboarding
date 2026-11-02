# Sequence — Submit and Approve a Claim

![Sequence diagram](sequence-submit-approve.png)

## Happy path and error path

```mermaid
sequenceDiagram
  autonumber
  participant U as Claimant (mobile)
  participant FE as Web app
  participant API as Claims API
  participant DB as Azure SQL
  participant BLOB as Blob Storage
  participant SB as Service Bus
  participant TEAMS as Teams webhook
  participant MGR as Line manager (Teams)

  U->>FE: Tap "Submit claim"
  FE->>API: POST /claims (JWT)
  API->>DB: INSERT claim (status=Submitted)
  API->>BLOB: Upload receipts (signed URLs)

  alt Happy path: receipts uploaded
    API-->>FE: 201 Created (confirmation)
    API--)SB: Publish claim.submitted
    SB--)TEAMS: Adaptive card to manager
    TEAMS--)MGR: Notification
    MGR->>API: POST /claims/{id}/approve (JWT)
    API->>DB: UPDATE status=Approved + audit row
    API-->>MGR: 200 OK
  else Error path: receipt upload fails
    API->>DB: UPDATE status=Draft + reason="upload_failed"
    API-->>FE: 502 with Retry-After
  end
```

## How to read it

- Solid arrows (`->>`) are synchronous. The caller waits for the reply.
- Dashed return arrows (`-->>`) are responses.
- Open-head arrows (`--)`) are asynchronous. The sender does not wait.
- The `alt` box shows two outcomes after the receipt upload: the happy path above the line, the error path below it.
